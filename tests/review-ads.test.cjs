const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

// Run the actual page script with a small fake DOM and a simulated fetch.
const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function setup(fetch) {
  let click;
  const message = { textContent: '' };
  const logs = [];
  const errors = [];
  const button = {
    disabled: false,
    addEventListener(event, handler) {
      assert.equal(event, 'click');
      click = handler;
    }
  };
  runInNewContext(script, {
    document: {
      getElementById(id) {
        if (id === 'reviewAds') return button;
        if (id === 'message') return message;
        throw new Error(`Unexpected element: ${id}`);
      }
    },
    fetch,
    console: {
      log: (value) => logs.push(value),
      error: (...args) => errors.push(args)
    }
  });
  return { click, button, message, logs, errors };
}

const successMessage = 'Ads reviewed successfully. Check the browser console.';
const failureMessage = 'Unable to review ads. Please try again later.';

test('reviews IDs 1, 2, 3 and 6 without modifying the original data', async () => {
  const creatives = [1, 2, 3, 6].map(id => ({ id, title: `Creative ${id}`, body: 'Extra field' }));
  const original = structuredClone(creatives);
  const requests = [];
  const page = setup(async (url) => {
    requests.push(url);
    return { ok: true, json: async () => creatives };
  });
  await page.click();
  assert.equal(page.button.disabled, false);
  assert.deepEqual(requests, ['https://jsonplaceholder.typicode.com/posts']);
  assert.equal(page.logs.length, 1);
  const result = page.logs[0];
  // Normalize objects created in the isolated JavaScript context for comparison.
  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    { id: 1, title: 'Creative 1', status: 'pending' },
    { id: 2, title: 'Creative 2', status: 'approved' },
    { id: 3, title: 'CREATIVE 3', status: 'rejected' },
    { id: 6, title: 'CREATIVE 6', status: 'rejected' }
  ]);
  assert.notEqual(result, creatives);
  result.forEach((item, index) => assert.notEqual(item, creatives[index]));
  assert.deepEqual(creatives, original);
  assert.equal(page.message.textContent, successMessage);
  assert.equal(page.errors.length, 0);
});

for (const status of [404, 500]) {
  test(`handles HTTP ${status} without processing the response body`, async () => {
    let parsed = false;
    const page = setup(async () => ({
      ok: false, status,
      json: async () => { parsed = true; return []; }
    }));
    await page.click();
  assert.equal(page.button.disabled, false);
    assert.equal(parsed, false);
    assert.equal(page.message.textContent, failureMessage);
    assert.equal(page.logs.length, 0);
    assert.equal(page.errors.length, 1);
    assert.equal(page.errors[0][0], 'Unable to review ads:');
    assert.equal(page.errors[0][1].message, `Request failed with status ${status}`);
  });
}

for (const phase of ['network', 'JSON parsing']) {
  test(`handles a ${phase} failure`, async () => {
    const error = new Error(`${phase} failed`);
    const page = setup(async () => {
      if (phase === 'network') throw error;
      return { ok: true, json: async () => { throw error; } };
    });
    await page.click();
  assert.equal(page.button.disabled, false);
    assert.equal(page.message.textContent, failureMessage);
    assert.equal(page.logs.length, 0);
    assert.equal(page.errors.length, 1);
    assert.equal(page.errors[0][1], error);
  });
}

test('shows progress and recovers on a successful retry after a failure', async () => {
  let resolveRequest;
  let attempt = 0;
  const page = setup(() => {
    if (++attempt === 1) return Promise.reject(new TypeError('Failed to fetch'));
    return new Promise(resolve => { resolveRequest = resolve; });
  });
  await page.click();
  assert.equal(page.button.disabled, false);
  assert.equal(page.message.textContent, failureMessage);
  const pending = page.click();
  assert.equal(page.message.textContent, 'Reviewing ads...');
  assert.equal(page.button.disabled, true);
  resolveRequest({ ok: true, json: async () => [] });
  await pending;
  assert.equal(page.button.disabled, false);
  assert.equal(page.message.textContent, successMessage);
  assert.equal(page.logs.length, 1);
  assert.equal(page.logs[0].length, 0);
});
