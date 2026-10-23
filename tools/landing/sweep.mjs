#!/usr/bin/env node
/**
 * Sweep a landing page across widths for art overlapping text and for horizontal scroll.
 *
 * Usage: node sweep.mjs <page> [--widths <list>] [--art <selector>] [--text <selector>] [--ignore <selector>]
 *        [--tolerance 6] [--json <file>] [--wrap] [--browser <path>]
 * The default widths are the default of `landing.sweepWidths`. Only visible boxes count; a pair where one element
 * contains the other, or either matches --ignore, is an intended overlap and is skipped.
 * Exits 1 when any width has an overlap or scrolls horizontally.
 */
import { writeFileSync } from 'node:fs';
import { SWEEP_WIDTHS, fail, launch, openPage, pageUrl, parseArgs, parseWidths, scrollThrough } from './lib.mjs';

const OPTIONS = ['widths', 'art', 'text', 'ignore', 'tolerance', 'json', 'browser'];

const USAGE = `Usage: node sweep.mjs <page> [options]

  <page>              URL or file path
  --widths <list>     widths, comma-separated (default ${SWEEP_WIDTHS.join(',')})
  --art <selector>    art elements (default img; only wider than 40 px)
  --text <selector>   text and mock elements (default h1,h2,h3,p,li,dt,dd,button,a)
  --ignore <selector> elements whose overlap is intended
  --tolerance <px>    overlap counts above this size on both axes (default 6)
  --json <file>       also write the report as JSON
  --wrap              wrap a fragment without doctype in a minimal document
  --browser <path>    browser executable; default: the Chromium Playwright installed`;

/** Runs in the page: visible boxes, overlapping pairs and elements past the right edge. */
function measure({ art, text, ignore, tolerance, width }) {
  // Opacity multiplies down the tree: an element inside an unfired reveal wrapper at opacity 0 is not visible.
  const opacity = el => {
    let product = 1;
    for (let node = el; node instanceof Element; node = node.parentElement) product *= Number(getComputedStyle(node).opacity);
    return product;
  };
  const visible = el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
      && opacity(el) > 0.05;
  };
  const label = el => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const box = el => {
    const r = el.getBoundingClientRect();
    return { el, left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY };
  };
  const ignored = el => Boolean(ignore) && el.matches(ignore);
  const arts = [...document.querySelectorAll(art)]
    .filter(el => visible(el) && !ignored(el) && el.getBoundingClientRect().width > 40).map(box);
  const texts = [...document.querySelectorAll(text)].filter(el => visible(el) && !ignored(el)).map(box);
  const overlaps = [];
  for (const a of arts) {
    for (const t of texts) {
      if (a.el.contains(t.el) || t.el.contains(a.el)) continue;
      const w = Math.min(a.right, t.right) - Math.max(a.left, t.left);
      const h = Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top);
      if (w > tolerance && h > tolerance) overlaps.push({ art: label(a.el), text: label(t.el), width: Math.round(w), height: Math.round(h) });
    }
  }
  const beyond = [...document.body.querySelectorAll('*')]
    .filter(el => visible(el) && getComputedStyle(el).position !== 'fixed' && el.getBoundingClientRect().right > width + 1)
    .map(label);
  const scrollWidth = document.documentElement.scrollWidth;
  return { overlaps, scrollWidth, horizontalScroll: scrollWidth > width, beyond: [...new Set(beyond)] };
}

async function main(argv) {
  let args, widths;
  try {
    args = parseArgs(argv, ['wrap', 'help'], OPTIONS);
    widths = args.widths ? parseWidths(args.widths) : SWEEP_WIDTHS;
  } catch (error) {
    fail(error.message);
  }
  if (args.help) return console.log(USAGE);
  if (args._.length !== 1) fail(`expected one <page>\n\n${USAGE}`);
  const tolerance = Number(args.tolerance ?? 6);
  if (!Number.isFinite(tolerance) || tolerance < 0) fail(`--tolerance expects a number of px, got "${args.tolerance}"`);
  const options = {
    art: args.art ?? 'img',
    text: args.text ?? 'h1,h2,h3,p,li,dt,dd,button,a',
    ignore: args.ignore ?? '',
    tolerance,
  };

  const url = pageUrl(args._[0], args.wrap);
  const report = [];
  let browser, failure;
  try {
    browser = await launch(args.browser);
    for (const width of widths) {
      const { context, page } = await openPage(browser, url, { width });
      await page.goto(url, { waitUntil: 'load' });
      await scrollThrough(page);
      report.push({ width, ...(await page.evaluate(measure, { ...options, width })) });
      await context.close();
    }
  } catch (error) {
    failure = error.message.split('\n')[0];
  } finally {
    await browser?.close();
  }
  if (failure) fail(failure);
  console.log('width\toverlaps\tscrollWidth\thorizontalScroll\tbeyond');
  for (const row of report) {
    console.log([row.width, row.overlaps.length, row.scrollWidth, row.horizontalScroll, row.beyond.length].join('\t'));
    for (const o of row.overlaps) console.log(`  overlap: ${o.art} × ${o.text} (${o.width}×${o.height} px)`);
    for (const el of row.beyond) console.log(`  beyond the right edge: ${el}`);
  }
  if (args.json) writeFileSync(args.json, `${JSON.stringify(report, null, 2)}\n`);
  if (report.some(row => row.overlaps.length || row.horizontalScroll)) process.exitCode = 1;
}

await main(process.argv.slice(2));
