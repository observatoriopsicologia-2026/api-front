import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { of, throwError } from 'rxjs';
import { AppComponent } from '../src/app/app.component.js';
import { AnalyticsComponent } from '../src/app/features/analytics.component.js';
import { CollectionPageComponent } from '../src/app/features/collection-page.component.js';
import { LoginComponent } from '../src/app/features/login.component.js';
import { PublicationsComponent } from '../src/app/features/publications.component.js';

const sanitizer = {
  bypassSecurityTrustResourceUrl(url: string) {
    return `safe:${url}`;
  }
};

test('AppComponent searches only with non-empty terms', () => {
  const navigations: unknown[][] = [];
  const component = new AppComponent({ isLoggedIn: false } as never, {
    navigate(commands: unknown[], extras?: unknown) {
      navigations.push([commands, extras]);
      return Promise.resolve(true);
    }
  } as never);

  component.searchTerm = '   ';
  component.search();
  assert.equal(navigations.length, 0);

  component.searchOpen = true;
  component.menuOpen = true;
  component.searchTerm = ' bienestar ';
  component.search();

  assert.equal(component.searchOpen, false);
  assert.equal(component.menuOpen, false);
  assert.deepEqual(navigations[0], [['/publicaciones'], { queryParams: { q: 'bienestar' } }]);
});

test('LoginComponent navigates on success and shows errors on failure', () => {
  const navigations: string[] = [];
  const success = new LoginComponent(
    {
      login(email: string, password: string) {
        assert.equal(email, 'admin@example.com');
        assert.equal(password, 'secret');
        return of({});
      }
    } as never,
    {
      navigateByUrl(url: string) {
        navigations.push(url);
        return Promise.resolve(true);
      }
    } as never
  );

  success.email = 'admin@example.com';
  success.password = 'secret';
  success.submit();

  assert.equal(success.loading, false);
  assert.deepEqual(navigations, ['/admin']);

  const failure = new LoginComponent(
    { login: () => throwError(() => new Error('bad')) } as never,
    { navigateByUrl: () => Promise.resolve(true) } as never
  );

  failure.submit();

  assert.equal(failure.loading, false);
  assert.match(failure.error, /iniciar/);
});

test('PublicationsComponent loads, previews and handles errors', () => {
  const publication = {
    id: 'p1',
    title: 'Paper',
    abstract: '',
    authors: 'Autor',
    country: 'Colombia',
    tags: []
  };
  const route = {
    queryParamMap: of({
      get(name: string) {
        return name === 'q' ? 'clima' : null;
      }
    })
  };
  const component = new PublicationsComponent(
    {
      getPublications(q: string, limit: number) {
        assert.equal(q, 'clima');
        assert.equal(limit, 100);
        return of({ items: [publication] });
      },
      publicationFileUrl(id: string, mode: string) {
        return `/file/${id}/${mode}`;
      }
    } as never,
    route as never,
    sanitizer as never
  );

  component.ngOnInit();
  assert.equal(component.publications[0].title, 'Paper');

  component.preview(publication);
  assert.equal(component.previewTitle, 'Paper');
  assert.equal(component.previewUrl, 'safe:/file/p1/preview');
  assert.equal(component.downloadUrl(publication), '/file/p1/download');

  const failed = new PublicationsComponent(
    { getPublications: () => throwError(() => new Error('down')) } as never,
    route as never,
    sanitizer as never
  );
  failed.load();
  assert.match(failed.error, /publicaciones/);
});

test('CollectionPageComponent formats section data and handles loading errors', () => {
  const route = {
    data: of({
      key: 'events',
      title: 'Eventos',
      subtitle: 'Agenda'
    })
  };
  const event = {
    id: 'e1',
    title: 'Webinar',
    description: 'Virtual',
    starts_at: '2026-05-10T00:00:00.000Z',
    location: 'Online',
    modality: 'Virtual',
    category: 'Webinar',
    url: 'https://example.com'
  };
  const component = new CollectionPageComponent(route as never, {
    getCollection(key: string, q: string, limit: number) {
      assert.equal(key, 'events');
      assert.equal(q, '');
      assert.equal(limit, 100);
      return of({ items: [event] });
    }
  } as never);

  component.ngOnInit();

  assert.equal(component.key, 'events');
  assert.equal(component.items.length, 1);
  assert.equal(component.titleFor(event), 'Webinar');
  assert.equal(component.descriptionFor(event), 'Virtual');
  assert.match(component.metaFor(event), /Online/);
  assert.equal(component.linkFor(event), 'https://example.com');

  component.key = 'researchers';
  assert.match(component.metaFor({ institution: 'UC', country: 'Colombia', specialty: 'POT' }), /UC/);
  component.key = 'news';
  assert.match(component.metaFor({ published_at: '2026-05-10' }), /2026/);
  component.key = 'resources';
  assert.match(component.metaFor({ type: 'Guia', tags: ['pdf', 'datos'] }), /Guia.*pdf, datos/);

  const failed = new CollectionPageComponent({ data: of({ key: 'news', title: 'Noticias', subtitle: '' }) } as never, {
    getCollection: () => throwError(() => new Error('down'))
  } as never);
  failed.ngOnInit();
  assert.match(failed.error, /informaci/);
});

test('AnalyticsComponent loads metrics and native chart series', () => {
  const analytics = {
    generated_at: '2026-05-11T00:00:00.000Z',
    summary: {
      publications: 2,
      publications_with_pdf: 1,
      researchers: 3,
      events: 4,
      news: 5,
      resources: 6,
      countries: 7
    },
    publications_by_year: [{ label: '2026', value: 2 }],
    publications_by_country: [{ label: 'Colombia', value: 2 }],
    publications_by_tag: [],
    researchers_by_country: [],
    researchers_by_specialty: [],
    events_by_modality: [],
    events_by_month: [],
    news_by_month: [],
    resources_by_type: [],
    latest_publications: []
  };
  const component = new AnalyticsComponent({ getAnalytics: () => of(analytics) } as never);

  component.ngOnInit();

  assert.equal(component.analytics?.summary.publications, 2);
  assert.equal(component.charts.length, 2);
  assert.deepEqual(component.charts[0].data.datasets[0].data, [2]);
  assert.deepEqual(component.charts[1].data.labels, ['Colombia']);
  assert.equal(component.charts[0].horizontal, false);

  const failed = new AnalyticsComponent({ getAnalytics: () => throwError(() => new Error('down')) } as never);
  failed.load();
  assert.match(failed.error, /indicadores/);
});
