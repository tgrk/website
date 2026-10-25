#!/usr/bin/env node
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const vm = require('node:vm');

const output = mkdtempSync(join(tmpdir(), 'wiso-mobile-'));
try {
  execFileSync('hugo', ['--destination', output], { cwd: join(__dirname, '..'), stdio: 'pipe' });
  const html = readFileSync(join(output, 'resume/index.html'), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .find((match) => match[1].includes('var toggle = document.querySelector'));
  assert.ok(script, 'The shared navigation script must render on interior pages');
  assert.match(html, /aria-label="Main navigation"/);
  assert.match(html, /<svg[^>]+aria-hidden="true"/);

  function element() {
    const classes = new Set();
    return {
      events: {}, attributes: {},
      addEventListener(name, callback) { this.events[name] = callback; },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      classList: {
        add(name) { classes.add(name); },
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); }
      }
    };
  }
  const document = element();
  const header = element();
  const toggle = element();
  const links = element();
  const mobile = element();
  const anchor = { closest: () => anchor };
  toggle.attributes['aria-expanded'] = 'false';
  toggle.closest = () => header;
  toggle.focus = () => { document.activeElement = toggle; };
  header.contains = (target) => [header, toggle, links, anchor].includes(target);
  mobile.matches = true;
  document.querySelector = () => toggle;
  document.getElementById = () => links;
  vm.runInNewContext(script[1], { document, window: { matchMedia: () => mobile } });
  document.events.DOMContentLoaded();
  assert.ok(header.classList.contains('is-enhanced'));
  function checkOpen(open) {
    assert.equal(links.classList.contains('is-open'), open);
    assert.equal(toggle.getAttribute('aria-expanded'), String(open));
    assert.equal(toggle.getAttribute('aria-label'), open ? 'Close menu' : 'Open menu');
  }
  toggle.events.click();
  checkOpen(true);
  toggle.events.click();
  checkOpen(false);
  toggle.events.click();
  document.events.keydown({ key: 'Escape' });
  checkOpen(false);
  assert.equal(document.activeElement, toggle);
  toggle.events.click();
  document.events.click({ target: anchor });
  checkOpen(true);
  links.events.click({ target: anchor });
  checkOpen(false);
  toggle.events.click();
  document.events.click({ target: {} });
  checkOpen(false);
  toggle.events.click();
  header.events.focusout({ relatedTarget: anchor });
  checkOpen(true);
  header.events.focusout({ relatedTarget: null });
  checkOpen(false);
  toggle.events.click();
  mobile.matches = false;
  mobile.events.change();
  checkOpen(false);
  document.activeElement = anchor;
  links.events.click({ target: anchor });
  assert.equal(document.activeElement, anchor, 'Desktop links keep their normal focus behavior');
  console.log('Mobile navigation checks passed.');
} finally {
  rmSync(output, { recursive: true, force: true });
}
