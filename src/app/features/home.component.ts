import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AnalyticsSummary, EventItem, NewsItem, Publication, Researcher } from '../core/models';
import { BarData, NativeChartComponent } from '../shared/native-chart.component.js';

@Component({
  selector: 'app-home', standalone: true,
  imports: [CommonModule, RouterLink, NativeChartComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  publications: Publication[] = [];
  researchers: Researcher[] = [];
  events: EventItem[] = [];
  news: NewsItem[] = [];
  summary?: AnalyticsSummary;
  countryChart: BarData = { labels: [], datasets: [] };
  analyticsError = '';

  quickLinks = [
    { title: 'Publicaciones', text: 'Accede a artículos, libros y recursos académicos sobre POT.', path: '/publicaciones', tone: 'blue' },
    { title: 'Directorio', text: 'Conecta con investigadores y profesionales de toda la región.', path: '/directorio', tone: 'orange' },
    { title: 'Eventos', text: 'Descubre conferencias, webinars y talleres próximos.', path: '/eventos', tone: 'yellow' },
    { title: 'Colaboración', text: 'Participa en proyectos de investigación y grupos de trabajo.', path: '/recursos', tone: 'green' }
  ];

  constructor(private readonly api: ApiService) {}
  ngOnInit(): void {
    forkJoin({
      analytics: this.api.getAnalytics().pipe(catchError(() => of(null))),
      publications: this.api.getPublications('', 3).pipe(catchError(() => of({ items: [] as Publication[] }))),
      researchers: this.api.getCollection('researchers', '', 4).pipe(catchError(() => of({ items: [] as Researcher[] }))),
      events: this.api.getCollection('events', '', 3).pipe(catchError(() => of({ items: [] as EventItem[] }))),
      news: this.api.getCollection('news', '', 3).pipe(catchError(() => of({ items: [] as NewsItem[] })))
    }).subscribe((data) => {
      this.publications = data.publications.items;
      this.researchers = data.researchers.items;
      this.events = data.events.items;
      this.news = data.news.items;
      if (data.analytics) {
        this.summary = data.analytics.summary;
        this.countryChart = {
          labels: data.analytics.publications_by_country.map((point) => point.label),
          datasets: [{ label: 'Publicaciones', data: data.analytics.publications_by_country.map((point) => point.value),
            backgroundColor: '#1276b8', maxBarThickness: 48 }]
        };
      } else {
        this.analyticsError = 'No pudimos cargar los indicadores del observatorio.';
      }
    });
  }
}
