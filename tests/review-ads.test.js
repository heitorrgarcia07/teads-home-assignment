import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCreatives } from '../src/reviewAds.js';
import { fetchCreatives } from '../src/api.js';
import { renderCreatives } from '../src/renderCreatives.js';

test('classifies IDs, uppercases rejected titles and preserves source objects', () => {
  const input = [1, 2, 3, 6].map(id => Object.freeze({ id, title: `Ad ${id}`, body: 'Extra' }));
  Object.freeze(input);
  const output = reviewCreatives(input);
  assert.deepEqual(output, [
    { id: 1, title: 'Ad 1', status: 'pending' },
    { id: 2, title: 'Ad 2', status: 'approved' },
    { id: 3, title: 'AD 3', status: 'rejected' },
    { id: 6, title: 'AD 6', status: 'rejected' }
  ]);
  output.forEach((item, i) => assert.notEqual(item, input[i]));
  assert.deepEqual(reviewCreatives([]), []);
});

test('API requests the correct endpoint and returns parsed data', async t => {
  const data = [{ id: 1, title: 'Ad' }];
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, 'https://jsonplaceholder.typicode.com/posts');
    return { ok: true, json: async () => data };
  });
  assert.equal(await fetchCreatives(), data);
});

for (const status of [404, 500]) {
  test(`API rejects HTTP ${status} before parsing the body`, async t => {
    t.mock.method(globalThis, 'fetch', async () => ({
      ok: false, status,
      json: () => assert.fail('Error body must not be parsed')
    }));
    await assert.rejects(fetchCreatives(), { message: `Request failed with status ${status}` });
  });
}

for (const phase of ['network', 'JSON']) {
  test(`API propagates ${phase} errors`, async t => {
    const error = new Error(phase);
    t.mock.method(globalThis, 'fetch', async () => {
      if (phase === 'network') throw error;
      return { ok: true, json: async () => { throw error; } };
    });
    await assert.rejects(fetchCreatives(), error);
  });
}

// A minimal DOM double exercises rendering; browser checks cover native behavior.
function makeResults() {
  return {
    children: [],
    ownerDocument: { createElement: tag => ({ tag, textContent: '' }) },
    replaceChildren() { this.children = []; },
    appendChild(child) { this.children.push(child); }
  };
}

test('rendering uses literal text and replaces previous results', () => {
  const results = makeResults();
  const creatives = [{ id: 1, title: '<img src=x onerror=alert(1)>', status: 'pending' }];
  renderCreatives(creatives, results);
  assert.deepEqual(results.children, [{ tag: 'li', textContent: '1 — <img src=x onerror=alert(1)> — pending' }]);
  renderCreatives(creatives, results);
  assert.equal(results.children.length, 1);
  renderCreatives([], results);
  assert.equal(results.children.length, 0);
});

test('page coordinates loading, results, failure cleanup and retry', async t => {
  let click;
  let resolveRequest;
  const button = { disabled: false, addEventListener: (event, handler) => {
    assert.equal(event, 'click'); click = handler;
  } };
  const message = { textContent: '' };
  const results = makeResults();
  const elements = { reviewAds: button, message, results };
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { resolveRequest = resolve; }));
  const originalDocument = globalThis.document;
  globalThis.document = { getElementById: id => elements[id] };
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  });
  const log = t.mock.method(console, 'log', () => {});
  const error = t.mock.method(console, 'error', () => {});
  await import('../src/main.js');
  const first = click();
  assert.equal(button.disabled, true);
  assert.equal(message.textContent, 'Reviewing ads...');
  resolveRequest({ ok: true, json: async () => [{ id: 6, title: 'Ad' }] });
  await first;
  assert.equal(button.disabled, false);
  assert.equal(results.children[0].textContent, '6 — AD — rejected');
  assert.deepEqual(log.mock.calls[0].arguments[0], [{ id: 6, title: 'AD', status: 'rejected' }]);
  const second = click();
  assert.equal(results.children.length, 0);
  assert.equal(button.disabled, true);
  resolveRequest({ ok: false, status: 500 });
  await second;
  assert.equal(button.disabled, false);
  assert.equal(message.textContent, 'Unable to review ads. Please try again later.');
  assert.equal(results.children.length, 0);
  assert.equal(error.mock.callCount(), 1);
  const third = click();
  resolveRequest({ ok: true, json: async () => [] });
  await third;
  assert.equal(button.disabled, false);
  assert.match(message.textContent, /successfully/);
});
