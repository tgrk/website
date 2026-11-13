#!/usr/bin/env node
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const vm = require('node:vm');

const output = mkdtempSync(join(tmpdir(), 'wiso-consent-'));
try {
  execFileSync('hugo', ['--destination', output], { cwd: join(__dirname, '..'), stdio: 'pipe' });
  const html = readFileSync(join(output, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  const analytics = scripts.find(script => script.includes('var disableKey'));
  const consent = scripts.find(script => script.includes('function declineConsent'));
  assert.ok(analytics && consent, 'Homepage must render the analytics and consent scripts');
  assert.match(analytics, /var measurementId = "G-[A-Z0-9]+";/);
  assert.match(analytics, /var consentRequired =\s+true\s*;/);
  const measurementId = analytics.match(/var measurementId = "(G-[^"]+)"/)[1];
  const disableKey = 'ga-disable-' + measurementId;
  const stored = new Map();

  function openPage() {
    const events = {};
    const tags = [];
    const settings = { addEventListener() {}, setAttribute() {}, focus() {} };
    const banner = {
      hidden: true,
      addEventListener(name, handler) { events[name] = handler; },
    };
    const document = {
      getElementById: id => id === 'cookie-consent' ? banner : settings,
      addEventListener(name, handler) { events[name] = handler; },
      createElement: () => ({}),
      head: { appendChild: tag => tags.push(tag) },
    };
    const window = {
      localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
      addEventListener(name, handler) { events[name] = handler; },
      dispatchEvent(event) { events[event.type](); },
    };
    for (const script of [analytics, consent]) vm.runInNewContext(script, { document, window, Event });
    events.DOMContentLoaded();
    const choose = action => events.click({ target: { closest: () => ({ getAttribute: () => action }) } });
    return { window, tags, banner, choose };
  }

  const page = openPage();
  assert.equal(page.banner.hidden, false);
  assert.equal(page.tags.length, 0);
  page.choose('accept');
  assert.equal(page.tags.length, 1);
  assert.equal(new URL(page.tags[0].src).searchParams.get('id'), measurementId);
  assert.equal(page.window[disableKey], false);
  page.choose('decline');
  assert.equal(page.window[disableKey], true);
  const nextPage = openPage();
  assert.equal(nextPage.tags.length, 0);
  assert.equal(nextPage.banner.hidden, true);
  page.choose('accept');
  assert.equal(page.window[disableKey], false);
  assert.equal(page.tags.length, 1);
  console.log('Analytics consent checks passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}
