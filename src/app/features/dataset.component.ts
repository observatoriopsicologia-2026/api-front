import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ApiService } from '../core/api.service';
import { DatasetChartDocument } from '../core/models';
import { datasetChart, datasetMatrix, dimensionValue, normalizeSearch } from '../core/dataset-report.js';
import { BarData, NativeChartComponent } from '../shared/native-chart.component.js';

@Component({
  selector: 'app-dataset', standalone: true,
  imports: [CommonModule, FormsModule, NativeChartComponent],
  templateUrl: './dataset.component.html', styleUrl: './dataset.component.css'
})
export class DatasetComponent implements OnInit {
  allDocuments: DatasetChartDocument[] = [];
  documents: DatasetChartDocument[] = [];
  sources: string[] = [];
  selectedSources: string[] = [];
  topics: string[] = [];
  types: string[] = [];
  q = '';
  topic = '';
  documentType = '';
  yearFrom?: number;
  yearTo?: number;
  minYear?: number;
  maxYear?: number;
  includeUndated = true;
  loading = false;
  loaded = false;
  error = '';
  page = 1;
  readonly pageSize = 20;
  matrix = datasetMatrix([], 'topic', 'source_org');
  topicChart: BarData = { datasets: [] };
  yearChart: BarData = { datasets: [] };
  typeChart: BarData = { datasets: [] };
  @ViewChild('analyticsSection') analyticsSection?: ElementRef<HTMLElement>;
  isAtBottom = false;

  constructor(private readonly api: ApiService) {}
  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.error = '';
    this.api.getDatasetChartDocuments().pipe(finalize(() => (this.loading = false))).subscribe({
      next: (rows) => {
        this.allDocuments = rows;
        this.sources = [...new Set(rows.map((row) => dimensionValue(row, 'source_org')))].sort();
        this.topics = [...new Set(rows.map((row) => dimensionValue(row, 'topic')))].sort();
        this.types = [...new Set(rows.map((row) => dimensionValue(row, 'document_type')))].sort();
        const years = rows.map((row) => row.year).filter((year): year is number => Number.isInteger(year));
        this.minYear = years.length ? Math.min(...years) : undefined;
        this.maxYear = years.length ? Math.max(...years) : undefined;
        this.loaded = true;
        this.reset();
      },
      error: () => { this.error = 'No pudimos cargar el dataset. Revisa la conexion con el servidor e intenta actualizar.'; }
    });
  }

  toggleSource(source: string, selected: boolean) {
    this.selectedSources = selected ? [...new Set([...this.selectedSources, source])] : this.selectedSources.filter((value) => value !== source);
    this.search();
  }

  reset() {
    this.q = ''; this.topic = ''; this.documentType = '';
    this.yearFrom = this.minYear; this.yearTo = this.maxYear;
    this.includeUndated = true;
    this.selectedSources = [...this.sources];
    this.search();
  }

  search() {
    this.page = 1;
    const query = normalizeSearch(this.q.trim());
    this.documents = this.allDocuments.filter((row) => {
      if (!this.selectedSources.includes(dimensionValue(row, 'source_org'))) return false;
      if (this.topic && dimensionValue(row, 'topic') !== this.topic) return false;
      if (this.documentType && dimensionValue(row, 'document_type') !== this.documentType) return false;
      if (!row.year && !this.includeUndated) return false;
      if (row.year && ((this.yearFrom != null && row.year < this.yearFrom) || (this.yearTo != null && row.year > this.yearTo))) return false;
      return normalizeSearch([row.title, row.author, row.topic, row.source_org, row.document_type].join(' ')).includes(query);
    });
    this.matrix = datasetMatrix(this.documents, 'topic', 'source_org');
    this.topicChart = datasetChart(this.documents, 'topic', this.sources);
    this.yearChart = datasetChart(this.documents, 'year', this.sources);
    this.typeChart = datasetChart(this.documents, 'document_type', this.sources);
  }

  selectTopic(topic: string) { this.topic = this.topic === topic ? '' : topic; this.search(); }
  selectType(type: string) { this.documentType = this.documentType === type ? '' : type; this.search(); }
  sourceTotal(source: string) { return this.documents.filter((row) => dimensionValue(row, 'source_org') === source).length; }
  get pageCount() { return Math.max(1, Math.ceil(this.documents.length / this.pageSize)); }
  get pageDocuments() { return this.documents.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get filteredYears() { return new Set(this.documents.filter((row) => row.year).map((row) => row.year)).size; }

  toggleScroll(): void {
    if (this.isAtBottom) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      this.analyticsSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 120;
  }
}
