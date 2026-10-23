#!/usr/bin/env node
/**
 * Render a landing page at fixed widths, for the rubric: the first, middle and settled hero frames, the page scrolled
 * down and then back up step by step (a bar that only shows when scrolling up never shows scrolling down only).
 *
 * Usage: node render.mjs <page> --out <dir> --widths <list, e.g. 390,1440> [--height 900] [--scheme light|dark]
 *        [--frame-ms 700] [--settle 4000] [--no-js] [--reduced-motion] [--wrap] [--browser <path>]
 * Writes w<width>-hero-{0,1,2}.png, w<width>-down-NN.png, w<width>-up-NN.png and summary.json.
 * Exits 1 when a width scrolls horizontally or logs a console or page error.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fail, launch, openPage, pageUrl, parseArgs, parseWidths } from './lib.mjs';

const OPTIONS = ['out', 'widths', 'height', 'scheme', 'frame-ms', 'settle', 'browser'];

const USAGE = `Usage: node render.mjs <page> --out <dir> --widths <list> [options]

  <page>              URL or file path
  --out <dir>         where the captures and summary.json go
  --widths <list>     fixed widths, comma-separated (for example 390,1440)
  --height <px>       viewport height (default 900)
  --scheme <scheme>   light or dark (default light)
  --frame-ms <ms>     time of the middle hero frame (default 700)
  --settle <ms>       time of the settled hero frame (default 4000)
  --no-js             open without JavaScript
  --reduced-motion    emulate prefers-reduced-motion
  --wrap              wrap a fragment without doctype in a minimal document
  --browser <path>    browser executable; default: the Chromium Playwright installed`;

const pad = n => String(n).padStart(2, '0');

async function renderWidth(browser, url, width, opts, out) {
  const { context, page, errors } = await openPage(browser, url, { ...opts, width });
  const name = suffix => join(out, `w${width}-${suffix}.png`);
  const started = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: name('hero-0') });
  await page.waitForTimeout(Math.max(0, opts.frameMs - (Date.now() - started)));
  await page.screenshot({ path: name('hero-1') });
  await page.waitForTimeout(Math.max(0, opts.settle - (Date.now() - started)));
  await page.screenshot({ path: name('hero-2') });

  const step = Math.floor(opts.height * 0.8);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const bottom = Math.max(0, total - opts.height);
  const stops = [];
  for (let y = 0; y < bottom; y += step) stops.push(y);
  stops.push(bottom);
  for (const [i, y] of stops.entries()) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(250);
    await page.screenshot({ path: name(`down-${pad(i)}`) });
  }
  for (const [i, y] of [...stops].reverse().entries()) {
    await page.evaluate(top => window.scrollTo(0, top), y);
    await page.waitForTimeout(250);
    await page.screenshot({ path: name(`up-${pad(i)}`) });
  }
  const metrics = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  await context.close();
  return { width, ...metrics, horizontalScroll: metrics.scrollWidth > metrics.clientWidth, errors };
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv, ['no-js', 'reduced-motion', 'wrap', 'help'], OPTIONS);
  } catch (error) {
    fail(error.message);
  }
  if (args.help) return console.log(USAGE);
  if (args._.length !== 1 || !args.out || !args.widths) fail(`expected <page>, --out and --widths\n\n${USAGE}`);
  let widths;
  try {
    widths = parseWidths(args.widths);
  } catch (error) {
    fail(error.message);
  }
  const scheme = args.scheme ?? 'light';
  if (!['light', 'dark'].includes(scheme)) fail(`--scheme expects light or dark, got "${scheme}"`);
  const opts = {
    height: Number(args.height ?? 900),
    scheme,
    frameMs: Number(args['frame-ms'] ?? 700),
    settle: Number(args.settle ?? 4000),
    js: !args['no-js'],
    reducedMotion: Boolean(args['reduced-motion']),
  };
  if (!Number.isInteger(opts.height) || opts.height <= 0) fail(`--height expects a positive integer, got "${args.height}"`);
  for (const key of ['frameMs', 'settle']) {
    if (!Number.isFinite(opts[key]) || opts[key] < 0) fail(`invalid numeric option: ${key}`);
  }

  mkdirSync(args.out, { recursive: true });
  const url = pageUrl(args._[0], args.wrap);
  const summary = [];
  let browser, failure;
  try {
    browser = await launch(args.browser);
    for (const width of widths) summary.push(await renderWidth(browser, url, width, opts, args.out));
  } catch (error) {
    failure = error.message.split('\n')[0];
  } finally {
    await browser?.close();
  }
  if (failure) fail(failure);
  writeFileSync(join(args.out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  console.log('width\theight\tscrollWidth\tclientWidth\thorizontalScroll\terrors');
  for (const row of summary) {
    console.log([row.width, row.height, row.scrollWidth, row.clientWidth, row.horizontalScroll, row.errors.length].join('\t'));
    for (const error of row.errors) console.log(`  ${error}`);
  }
  if (summary.some(row => row.horizontalScroll || row.errors.length)) process.exitCode = 1;
}

await main(process.argv.slice(2));
