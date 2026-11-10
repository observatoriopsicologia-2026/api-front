import '@angular/compiler';
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { of } from 'rxjs';
import { ApiService } from '../src/app/core/api.service.js';
import { AuthService } from '../src/app/core/auth.service.js';

test('dataset chart metadata uses the neutral API endpoint', () => {
  let called = '';
  const api = new ApiService({ get: (url: string) => { called = url; return of([]); } } as never);
  api.getDatasetChartDocuments().subscribe((rows) => assert.deepEqual(rows, []));
  assert.match(called, /\/dataset\/documents$/);
});

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: new MemoryStorage()
  });
});

test('ApiService builds public and authenticated HTTP calls', () => {
  const calls: Array<{ method: string; url: string; options?: { params?: unknown; headers?: HeadersLike } }> = [];
  const http = {
    post(url: string, body: unknown, options?: { headers?: HeadersLike }) {
      calls.push({ method: 'post', url, options });
      return of({ url, body });
    },
    get(url: string, options?: { params?: unknown; headers?: HeadersLike }) {
      calls.push({ method: 'get', url, options });
      return of({ items: [] });
    },
    put(url: string, body: unknown, options?: { headers?: HeadersLike }) {
      calls.push({ method: 'put', url, options });
      return of({ item: body });
    },
    delete(url: string, options?: { headers?: HeadersLike }) {
      calls.push({ method: 'delete', url, options });
      return of(undefined);
    }
  };

  const service = new ApiService(http as never);

  service.login('admin@example.com', 'secret').subscribe();
  service.getAnalytics().subscribe();
  service.getPublications('clima', 25).subscribe();
  service.getCollection('events', 'webinar', 10).subscribe();

  localStorage.setItem('pot_token', 'token-123');
  service.create('news', { title: 'Noticia' }).subscribe();
  service.update('resources', 'r1', { title: 'Recurso' }).subscribe();
  service.delete('events', 'e1').subscribe();

  const form = new FormData();
  form.append('title', 'PDF');
  service.create('publications', form).subscribe();

  assert.equal(calls[0].url, 'http://localhost:4000/api/auth/login');
  assert.equal(calls[1].url, 'http://localhost:4000/api/analytics');
  assert.equal((calls[2].options?.params as { get(name: string): string | null }).get('q'), 'clima');
  assert.equal((calls[3].options?.params as { get(name: string): string | null }).get('limit'), '10');
  assert.equal(calls[4].options?.headers?.get('Authorization'), 'Bearer token-123');
  assert.equal(calls[4].options?.headers?.get('Content-Type'), 'application/json');
  assert.equal(calls[7].options?.headers?.get('Content-Type'), null);
  assert.equal(service.publicationFileUrl('p1'), 'http://localhost:4000/api/publications/p1/file?mode=preview');
  assert.equal(service.publicationFileUrl('p1', 'download'), 'http://localhost:4000/api/publications/p1/file?mode=download');
});

test('dataset administration sends its token while public collection reads stay anonymous', () => {
  const requests: Array<{ headers?: HeadersLike }> = [];
  const api = new ApiService({ get: (_url: string, options: { headers?: HeadersLike }) => {
    requests.push(options); return of({ items: [] });
  } } as never);
  localStorage.setItem('pot_token', 'admin-session');
  api.getCollection('dataset').subscribe();
  api.getCollection('events').subscribe();
  assert.equal(requests[0].headers?.get('Authorization'), 'Bearer admin-session');
  assert.equal(requests[1].headers, undefined);
});

test('AuthService stores login response and clears session on logout', () => {
  const user = { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const };
  const api = {
    login(email: string, password: string) {
      assert.equal(email, 'admin@example.com');
      assert.equal(password, 'secret');
      return of({ token: 'token-123', user });
    }
  };
  const navigations: string[] = [];
  const router = {
    navigateByUrl(url: string) {
      navigations.push(url);
      return Promise.resolve(true);
    }
  };
  const service = new AuthService(api as never, router as never);

  assert.equal(service.isLoggedIn, false);
  service.login('admin@example.com', 'secret').subscribe();

  assert.equal(service.token, 'token-123');
  assert.deepEqual(service.user, user);
  assert.equal(service.isLoggedIn, true);

  service.logout();

  assert.equal(service.token, null);
  assert.equal(service.user, null);
  assert.deepEqual(navigations, ['/admin/login']);
});

interface HeadersLike {
  get(name: string): string | null;
}
