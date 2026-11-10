import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AnalyticsPoint, AnalyticsResponse } from '../core/models';
import { BarData, chartColors, NativeChartComponent } from '../shared/native-chart.component.js';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NativeChartComponent],
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit {
  charts: Array<{ title: string; horizontal: boolean; data: BarData }> = [];
  analytics?: AnalyticsResponse;
  loading = false;
  error = '';

  constructor(private readonly api: ApiService) {}

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
        next: (response) => {
          this.analytics = response;
          this.charts = [
            this.chart('Publicaciones por anio', response.publications_by_year, false, 0),
            this.chart('Publicaciones por pais', response.publications_by_country, true, 1),
            this.chart('Temas frecuentes', response.publications_by_tag, true, 2),
            this.chart('Investigadores por pais', response.researchers_by_country, true, 0),
            this.chart('Eventos por modalidad', response.events_by_modality, true, 1),
            this.chart('Recursos por tipo', response.resources_by_type, true, 2)
          ].filter((chart) => chart.data.labels!.length);
        },
        error: () => (this.error = 'No pudimos cargar los indicadores en este momento.')
      });
  }

  private chart(title: string, points: AnalyticsPoint[], horizontal: boolean, color: number) {
    return { title, horizontal, data: {
      labels: points.map((point) => point.label),
      datasets: [{ label: 'Cantidad', data: points.map((point) => point.value), backgroundColor: chartColors[color] }]
    } };
  }
}
