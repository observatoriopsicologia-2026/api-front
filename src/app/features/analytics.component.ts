import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { environment } from '../../environments/environment.js';
import { ApiService } from '../core/api.service';
import { AnalyticsPoint, AnalyticsResponse } from '../core/models';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit {
  readonly reportUrl = environment.powerBiReportUrl?.trim() ?? '';
  readonly safeReportUrl?: SafeResourceUrl;
  analytics?: AnalyticsResponse;
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
      .getAnalytics()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => (this.analytics = response),
        error: () => (this.error = 'No pudimos cargar los indicadores en este momento.')
      });
  }

  maxValue(points: AnalyticsPoint[]) {
    return Math.max(...points.map((point) => point.value), 0);
  }

  barHeight(point: AnalyticsPoint, points: AnalyticsPoint[]) {
    const max = this.maxValue(points);
    return max ? Math.max(8, Math.round((point.value / max) * 100)) : 0;
  }

  barWidth(point: AnalyticsPoint, points: AnalyticsPoint[]) {
    const max = this.maxValue(points);
    return max ? Math.max(6, Math.round((point.value / max) * 100)) : 0;
  }
}
