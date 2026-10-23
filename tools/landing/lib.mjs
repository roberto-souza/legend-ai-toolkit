/**
 * Shared pieces of the optional landing tools: launch the browser, open a page with a viewport and colour scheme,
 * scroll the whole page to fire scroll-triggered reveals, collect console and page errors, parse `--widths`.
 *
 * A page is a URL or a file path; a file becomes a `file://` URL. With `wrap`, a file that does not start with a
 * doctype or `<html` (a single-file prototype fragment) is wrapped in a minimal document with a viewport meta.
 */
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SWEEP_WIDTHS = [320, 360, 390, 414, 600, 768, 1024, 1280, 1440, 1920];

/** Parse `--flag`, `--name value` and `--name=value`; positional arguments go to `_`; an unknown option throws. */
export function parseArgs(argv, flags, options) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      args._.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split(/=(.*)/s);
    if (flags.includes(name) && inline === undefined) args[name] = true;
    else if (!options.includes(name)) throw new Error(`unknown option --${name}`);
    else if (inline !== undefined) args[name] = inline;
    else if (i + 1 < argv.length) args[name] = argv[++i];
    else throw new Error(`missing value for --${name}`);
  }
  return args;
}

/** `390,1440` → [390, 1440]; positive integers only, no repeats. */
export function parseWidths(text) {
  const widths = String(text).split(',').map(w => Number(w.trim()));
  if (!widths.length || widths.some(w => !Number.isInteger(w) || w <= 0) || new Set(widths).size !== widths.length) {
    throw new Error(`--widths expects a comma-separated list of distinct positive integers, got "${text}"`);
  }
  return widths;
}

/** The URL to open: a file path becomes `file://`, wrapped first when asked and it is a fragment. */
export function pageUrl(page, wrap) {
  let isFile = false;
  try {
    isFile = statSync(page).isFile();
  } catch {
    // Not a path on disk: treat it as a URL.
  }
  if (!isFile) return page;
  const path = resolve(page);
  if (!wrap) return pathToFileURL(path).href;
  const source = readFileSync(path, 'utf8');
  if (/^\s*(<!doctype|<html)/i.test(source)) return pathToFileURL(path).href;
  const wrapped = join(mkdtempSync(join(tmpdir(), 'landing-wrap-')), 'index.html');
  writeFileSync(wrapped, `<!doctype html>\n<html><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<base href="${pathToFileURL(dirname(path)).href}/"></head>\n<body>\n${source}\n</body></html>\n`);
  return pathToFileURL(wrapped).href;
}

/** Playwright loads only here, so `--help` and usage errors work before `npm install`. */
export async function launch(executablePath) {
  const { chromium } = await import('playwright-core');
  return chromium.launch(executablePath ? { executablePath } : {});
}

/** Open the page in a fresh context; console and page errors land in `errors`. */
export async function openPage(browser, url, { width, height = 900, scheme = 'light', js = true, reducedMotion = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: scheme,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
    javaScriptEnabled: js,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  return { context, page, errors };
}

/** Scroll down to the bottom in steps and back to the top, so every scroll-triggered reveal fires. */
export async function scrollThrough(page, stepRatio = 0.8, pauseMs = 120) {
  const { innerHeight, total } = await page.evaluate(() => ({ innerHeight, total: document.documentElement.scrollHeight }));
  const step = Math.max(1, Math.floor(innerHeight * stepRatio));
  for (let y = 0; y < total; y += step) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(pauseMs);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(pauseMs);
}

/** Usage and runtime errors print one line and exit 1, like the toolkit scripts. */
export function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
