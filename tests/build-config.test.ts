import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

function check(apiUrl: string, cloudflare = '') {
  return spawnSync(process.execPath, [resolve('scripts/configure-production.mjs'), '--check'], {
    encoding: 'utf8', env: { ...process.env, API_URL: apiUrl, CF_PAGES: cloudflare }
  });
}
test('production build accepts public API endpoints without writing environment files in check mode', () => {
  assert.equal(check('https://api.example.org/api').status, 0);
  assert.equal(check('https://api.example.org/api/').status, 0);
  assert.equal(check('').status, 0);
});
test('Cloudflare builds require a real configured API endpoint', () => {
  assert.notEqual(check('', '1').status, 0);
  for (const url of ['http://localhost:4000/api', 'https://localhost/api', 'https://127.0.0.1/api',
    'https://[::1]/api', 'https://api.example.org', 'https://user:password@example.org/api',
    'https://api.example.org/api?key=example', 'https://api.example.org/api#fragment', 'not-a-url']) {
    assert.notEqual(check(url, '1').status, 0);
  }
});
