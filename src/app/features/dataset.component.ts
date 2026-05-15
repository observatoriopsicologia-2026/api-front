import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment.js';
import { ApiService } from '../core/api.service';
import { AnalyticsPoint, DatasetAnalyticsResponse, DatasetDocument } from '../core/models';
import { ElementRef, ViewChild, HostListener} from '@angular/core';

@Component({
  selector: 'app-dataset',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dataset.component.html'
})
export class DatasetComponent implements OnInit {
  readonly reportUrl = environment.datasetPowerBiReportUrl?.trim() ?? '';
  readonly safeReportUrl?: SafeResourceUrl;
  analytics?: DatasetAnalyticsResponse;
  documents: DatasetDocument[] = [];
  q = '';
  topic = '';
  loading = false;
  error = '';

  constructor(
    private readonly api: ApiService,
    private readonly sanitizer: DomSanitizer
  ) {
    if (this.reportUrl) {
      this.safeReportUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.reportUrl);
    }
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api
      .getDatasetAnalytics()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.analytics = response;
          this.search();
        },
        error: () => (this.error = 'No pudimos cargar la analitica documental.')
      });
  }

  search() {
    this.api.getDataset(this.q, 30, this.topic).subscribe({
      next: (response) => (this.documents = response.items),
      error: () => (this.error = 'No pudimos cargar los documentos del dataset.')
    });
  }

  maxValue(points: AnalyticsPoint[]) {
    return Math.max(...points.map((point) => point.value), 0);
  }

  barWidth(point: AnalyticsPoint, points: AnalyticsPoint[]) {
    const max = this.maxValue(points);
    return max ? Math.max(6, Math.round((point.value / max) * 100)) : 0;
  }

  barHeight(point: AnalyticsPoint, points: AnalyticsPoint[]) {
    const max = this.maxValue(points);
    return max ? Math.max(8, Math.round((point.value / max) * 100)) : 0;
  }

  @ViewChild('analyticsSection')
analyticsSection!: ElementRef;

isAtBottom = false;

toggleScroll(): void {
  if (this.isAtBottom) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  } else {
    this.analyticsSection.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

@HostListener('window:scroll')
onScroll(): void {
  const scrollPosition = window.innerHeight + window.scrollY;
  const pageHeight = document.body.offsetHeight;

  this.isAtBottom = scrollPosition >= pageHeight - 120;
}
}
