import { DatasetChartDocument } from './models';
import { BarData, chartColors } from '../shared/native-chart.component.js';

export type DatasetDimension = 'topic' | 'source_org' | 'document_type' | 'year';
export const dimensionValue = (row: DatasetChartDocument, field: DatasetDimension) => String(row[field] || 'Sin dato');
export const normalizeSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function datasetMatrix(rows: DatasetChartDocument[], rowField: DatasetDimension, columnField: DatasetDimension) {
  const columns = [...new Set(rows.map((row) => dimensionValue(row, columnField)))].sort();
  const values = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const label = dimensionValue(row, rowField);
    const column = dimensionValue(row, columnField);
    const counts: Record<string, number> = values.get(label) ?? Object.create(null);
    counts[column] = (counts[column] ?? 0) + 1;
    values.set(label, counts);
  }
  const matrix = [...values].map(([label, counts]) => ({ label, values: counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }));
  matrix.sort((a, b) => rowField === 'year' ? a.label.localeCompare(b.label) : b.total - a.total || a.label.localeCompare(b.label));
  return { columns, rows: matrix };
}

export function datasetChart(rows: DatasetChartDocument[], field: DatasetDimension, sources: string[]): BarData {
  const matrix = datasetMatrix(rows, field, 'source_org');
  return {
    labels: matrix.rows.map((row) => row.label),
    datasets: matrix.columns.map((source) => ({
      label: source, backgroundColor: chartColors[sources.indexOf(source) % chartColors.length],
      data: matrix.rows.map((row) => row.values[source] ?? 0)
    }))
  };
}
