import '@angular/compiler';
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { of, throwError } from 'rxjs';
import { AdminDashboardComponent } from '../src/app/features/admin-dashboard.component.js';
import { HomeComponent } from '../src/app/features/home.component.js';

const sanitizer = {
  bypassSecurityTrustResourceUrl(url: string) {
    return `safe:${url}`;
  }
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      scrollTo() {
        return undefined;
      }
    }
  });
});

function createAdmin(options: { loggedIn?: boolean; api?: Record<string, unknown>; router?: Record<string, unknown> } = {}) {
  const router = options.router ?? {
    navigateByUrl: () => Promise.resolve(true)
  };
  const api =
    options.api ??
    ({
      getPublications: () => of({ items: [] }),
      getCollection: () => of({ items: [] }),
      create: () => of({ item: {} }),
      update: () => of({ item: {} }),
      delete: () => of(undefined),
      publicationFileUrl: (id: string, mode: string) => `/file/${id}/${mode}`
    } satisfies Record<string, unknown>);

  return new AdminDashboardComponent(
    { get isLoggedIn() { return options.loggedIn ?? true; }, logout: () => undefined } as never,
    api as never,
    router as never,
    sanitizer as never
  );
}

test('AdminDashboardComponent redirects anonymous users', () => {
  const navigations: string[] = [];
  const component = createAdmin({
    loggedIn: false,
    router: {
      navigateByUrl(url: string) {
        navigations.push(url);
        return Promise.resolve(true);
      }
    }
  });

  component.ngOnInit();

  assert.deepEqual(navigations, ['/admin/login']);
});

test('AdminDashboardComponent loads publications and collection tabs', () => {
  const component = createAdmin({
    api: {
      getPublications: () => of({ items: [{ id: 'p1', title: 'Paper' }] }),
      getCollection: () => of({ items: [{ id: 'r1', name: 'Persona' }] })
    }
  });

  component.ngOnInit();
  assert.equal(component.items[0]['title'], 'Paper');

  component.selectTab(component.tabs[1]);
  assert.equal(component.items[0]['name'], 'Persona');
  assert.equal(component.draft['name'], '');
});

test('AdminDashboardComponent handles load, submit and delete errors', () => {
  const component = createAdmin({
    api: {
      getPublications: () => throwError(() => new Error('down')),
      getCollection: () => throwError(() => new Error('down')),
      create: () => throwError(() => new Error('bad')),
      update: () => throwError(() => new Error('bad')),
      delete: () => throwError(() => new Error('bad'))
    }
  });

  component.load();
  assert.match(component.error, /cargar/);

  component.submit();
  assert.match(component.error, /guardar/);

  Object.defineProperty(globalThis, 'confirm', { configurable: true, value: () => true });
  component.remove({ id: 'x', title: 'Registro' });
  assert.match(component.error, /eliminar/);
});

test('AdminDashboardComponent creates, edits and updates records', () => {
  const calls: Array<{ action: string; payload?: unknown; key?: string }> = [];
  const component = createAdmin({
    api: {
      getPublications: () => of({ items: [] }),
      getCollection: () => of({ items: [] }),
      create(key: string, payload: unknown) {
        calls.push({ action: 'create', key, payload });
        return of({ item: { id: 'new' } });
      },
      update(key: string, id: string, payload: unknown) {
        calls.push({ action: `update:${id}`, key, payload });
        return of({ item: { id } });
      },
      delete: () => of(undefined),
      publicationFileUrl: (id: string, mode: string) => `/file/${id}/${mode}`
    }
  });

  component.resetDraft();
  component.draft['title'] = 'Paper';
  component.draft['tags'] = 'clima, datos';
  component.submit();

  assert.equal(calls[0].action, 'create');
  assert.ok(calls[0].payload instanceof FormData);
  assert.equal(component.success, 'Registro creado.');

  component.edit({
    id: 'p1',
    title: 'Paper',
    tags: ['clima', 'datos'],
    starts_at: 'bad-date',
    published_at: '2026-05-10T00:00:00.000Z',
    file_path: 'ignored'
  });
  assert.equal(component.editingId, 'p1');
  assert.equal(component.draft['tags'], 'clima, datos');
  assert.equal(component.draft['published_at'], '2026-05-10');

  component.draft['title'] = 'Paper actualizado';
  component.submit();
  assert.equal(calls[1].action, 'update:p1');
  assert.equal(component.success, 'Registro actualizado.');
});

test('AdminDashboardComponent supports file changes, previews, subtitles and delete cancellation', () => {
  const component = createAdmin();

  const file = new File(['pdf'], 'paper.pdf', { type: 'application/pdf' });
  component.onFileChange({ target: { files: [file] } } as unknown as Event);
  assert.equal(component.selectedFile?.name, 'paper.pdf');

  component.preview({ id: 'p1', title: 'Paper' });
  assert.equal(component.previewTitle, 'Paper');
  assert.equal(component.previewUrl, 'safe:/file/p1/preview');
  assert.equal(component.downloadUrl({ id: 'p1' }), '/file/p1/download');
  assert.equal(component.hasPdf({ file_path: 'p1/paper.pdf' }), true);
  assert.equal(component.titleFor({ name: 'Persona' }), 'Persona');

  component.selected.key = 'publications';
  assert.match(component.subtitleFor({ authors: 'Autor', year: 2026, country: 'Colombia' }), /Autor/);
  component.selected.key = 'researchers';
  assert.match(component.subtitleFor({ institution: 'UC', country: 'Colombia', specialty: 'POT' }), /UC/);
  component.selected.key = 'events';
  assert.match(component.subtitleFor({ starts_at: '2026-05-10', location: 'Online', modality: 'Virtual' }), /Online/);
  component.selected.key = 'news';
  assert.match(component.subtitleFor({ published_at: '2026-05-10' }), /2026/);
  component.selected.key = 'resources';
  assert.match(component.subtitleFor({ type: 'Guia', tags: ['pdf'] }), /Guia/);

  let deleted = false;
  const cancelDelete = createAdmin({
    api: {
      getPublications: () => of({ items: [] }),
      getCollection: () => of({ items: [] }),
      delete: () => {
        deleted = true;
        return of(undefined);
      }
    }
  });
  Object.defineProperty(globalThis, 'confirm', { configurable: true, value: () => false });
  cancelDelete.remove({ id: 'x', title: 'Registro' });
  assert.equal(deleted, false);

  component.logout();
});

test('HomeComponent uses real metrics and does not invent content on empty results or errors', () => {
  const success = new HomeComponent({
    getAnalytics: () => of({ summary: { publications: 2, researchers: 4, countries: 3, institutions: 2 },
      publications_by_country: [{ label: 'Colombia', value: 2 }] }),
    getPublications: () => of({ items: [{ id: 'p1', title: 'Paper' }] }),
    getCollection(key: string) {
      if (key === 'researchers') {
        return of({ items: [{ id: 'r1', name: 'Persona' }] });
      }
      if (key === 'events') {
        return of({ items: [{ id: 'e1', title: 'Evento' }] });
      }
      return of({ items: [{ id: 'n1', title: 'Noticia' }] });
    }
  } as never);

  success.ngOnInit();
  assert.equal(success.publications.length, 1);
  assert.equal(success.researchers.length, 1);
  assert.equal(success.events[0].title, 'Evento');
  assert.equal(success.news[0].title, 'Noticia');
  assert.equal(success.summary?.institutions, 2);
  assert.deepEqual(success.countryChart.labels, ['Colombia']);
  assert.deepEqual(success.countryChart.datasets[0].data, [2]);

  const fallback = new HomeComponent({
    getAnalytics: () => throwError(() => new Error('down')),
    getPublications: () => throwError(() => new Error('down')),
    getCollection: () => of({ items: [] })
  } as never);

  fallback.ngOnInit();
  assert.equal(fallback.publications.length, 0);
  assert.deepEqual(fallback.events, []);
  assert.deepEqual(fallback.news, []);
  assert.equal(fallback.summary, undefined);
  assert.deepEqual(fallback.countryChart.datasets, []);
  assert.match(fallback.analyticsError, /indicadores/);
});
