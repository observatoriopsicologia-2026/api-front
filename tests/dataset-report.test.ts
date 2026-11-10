import '@angular/compiler';
import assert from 'node:assert/strict';
import test from 'node:test';
import { of, throwError } from 'rxjs';
import { DatasetComponent } from '../src/app/features/dataset.component.js';
import { DatasetChartDocument } from '../src/app/core/models.js';
import { datasetChart, datasetMatrix, dimensionValue, normalizeSearch } from '../src/app/core/dataset-report.js';
import { barOptions, NativeChartComponent } from '../src/app/shared/native-chart.component.js';

const rows: DatasetChartDocument[] = [
  { id: '1', title: 'Salud mental', author: 'Autora', year: 2020, topic: 'mental health', source_org: 'UN', document_type: 'Reporte', source_url: '' },
  { id: '2', title: 'Bienestar laboral', author: 'Autor', year: 2021, topic: 'wellbeing', source_org: 'ILO', document_type: 'Libro', source_url: '' },
  { id: '3', title: 'Trabajo y salud', author: 'Autora', year: 2021, topic: 'mental health', source_org: 'ILO', document_type: 'Reporte', source_url: '' },
  { id: '4', title: 'Salud ocupacional', author: 'Equipo', year: 2022, topic: 'occupational health', source_org: 'UN', document_type: 'Reporte', source_url: '' },
  { id: '5', title: 'Sin fecha', author: '', year: null, topic: 'wellbeing', source_org: 'ILO', document_type: 'Otro', source_url: '' }
];
const create = (items = rows) => {
  const component = new DatasetComponent({ getDatasetChartDocuments: () => of(items) } as never);
  component.ngOnInit();
  return component;
};

test('dataset builds the complete matrix, series and matching totals without fixed counts', () => {
  const component = create();
  assert.equal(component.loaded, true);
  assert.equal(component.loading, false);
  assert.equal(component.documents.length, 5);
  assert.equal(component.filteredYears, 3);
  assert.equal(component.sourceTotal('ILO'), 3);
  assert.equal(component.matrix.rows.reduce((total, row) => total + row.total, 0), 5);
  assert.deepEqual(component.matrix.columns, ['ILO', 'UN']);
  const mental = component.matrix.rows.find((row) => row.label === 'mental health')!;
  assert.equal(mental.values['ILO'], 1);
  assert.equal(mental.values['UN'], 1);
  assert.equal(component.topicChart.datasets.flatMap((set) => set.data).reduce((a, b) => a + b, 0), 5);
  assert.equal(component.yearFrom, 2020);
  assert.equal(component.yearTo, 2022);
});

test('sources support multiple selection, no selection and reset', () => {
  const component = create();
  component.toggleSource('UN', false);
  assert.equal(component.documents.length, 3);
  const iloColor = component.topicChart.datasets[0].backgroundColor;
  component.toggleSource('UN', true);
  component.toggleSource('UN', true);
  assert.equal(component.selectedSources.length, 2);
  assert.equal(component.documents.length, 5);
  assert.equal(component.topicChart.datasets[0].backgroundColor, iloColor);
  component.toggleSource('ILO', false);
  component.toggleSource('UN', false);
  assert.equal(component.documents.length, 0);
  component.reset();
  assert.equal(component.documents.length, 5);
});

test('year bounds, missing years, topic, type and accent-insensitive search filter every chart', () => {
  const component = create();
  component.yearFrom = 2021;
  component.yearTo = 2021;
  component.includeUndated = false;
  component.search();
  assert.deepEqual(component.documents.map((row) => row.id), ['2', '3']);
  component.selectTopic('mental health');
  assert.deepEqual(component.documents.map((row) => row.id), ['3']);
  component.selectTopic('mental health');
  component.selectType('Libro');
  assert.deepEqual(component.documents.map((row) => row.id), ['2']);
  component.selectType('Libro');
  assert.equal(component.documents.length, 2);
  component.yearFrom = 2022;
  component.yearTo = 2020;
  component.search();
  assert.equal(component.documents.length, 0);
  component.reset();
  component.q = ' SALÚD ';
  component.search();
  assert.equal(component.documents.length, 3);
  component.q = 'not-found'; component.search();
  assert.equal(component.documents.length, 0);
  assert.equal(component.pageCount, 1);
  component.reset(); component.yearFrom = undefined; component.yearTo = undefined; component.search();
  assert.equal(component.documents.length, 5);
});

test('pagination and refresh use all API rows, and empty or unavailable datasets are handled', () => {
  const component = create(Array.from({ length: 45 }, (_, index) => ({ ...rows[index % rows.length], id: String(index) })));
  assert.equal(component.pageCount, 3);
  assert.equal(component.pageDocuments.length, 20);
  component.page = 3;
  assert.equal(component.pageDocuments.length, 5);
  component.search();
  assert.equal(component.page, 1);
  component.load();
  assert.equal(component.documents.length, 45);
  const empty = create([]);
  assert.equal(empty.minYear, undefined);
  assert.equal(empty.maxYear, undefined);
  assert.equal(empty.documents.length, 0);
  const down = new DatasetComponent({ getDatasetChartDocuments: () => throwError(() => new Error('offline')) } as never);
  down.load();
  assert.match(down.error, /servidor/);
  assert.equal(down.loading, false);
});

test('matrix covers empty values, zero cells, tie ordering and special object property names', () => {
  assert.equal(normalizeSearch('TEMÁTICA'), 'tematica');
  assert.equal(dimensionValue({ ...rows[0], topic: '' }, 'topic'), 'Sin dato');
  const result = datasetMatrix([...rows, { ...rows[0], source_org: '__proto__' }], 'topic', 'source_org');
  assert.equal(result.rows.find((row) => row.label === 'mental health')!.values['__proto__'], 1);
  const chart = datasetChart(rows, 'document_type', ['ILO', 'UN']);
  assert.ok(chart.datasets.some((series) => series.data.includes(0)));
  assert.deepEqual(datasetMatrix([], 'topic', 'source_org'), { columns: [], rows: [] });
});

test('bar settings and lifecycle update and dispose charts, and clicks emit a category', () => {
  assert.equal(barOptions(true, true).indexAxis, 'y');
  assert.equal(barOptions(false, false).indexAxis, 'x');
  const component = new NativeChartComponent();
  component.ngOnChanges();
  component.ngOnDestroy();
  const fake = { data: {}, options: {} as Record<string, unknown>, update() {}, destroy() {} };
  let updates = 0;
  let destroyed = false;
  fake.update = () => { updates++; };
  fake.destroy = () => { destroyed = true; };
  Object.assign(component, { chart: fake });
  component.data = { labels: ['ILO'], datasets: [] };
  let category = '';
  component.categorySelected.subscribe((value) => (category = value));
  component.ngOnChanges();
  assert.equal(updates, 1);
  const click = fake.options['onClick'] as (event: unknown, elements: Array<{ index: number }>) => void;
  click(null, []);
  click(null, [{ index: 0 }]);
  assert.equal(category, 'ILO');
  component.ngOnDestroy();
  assert.equal(destroyed, true);
});
