import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.js';
import {
  ApiItem,
  ApiList,
  AnalyticsResponse,
  CollectionKey,
  DatasetAnalyticsResponse,
  DatasetDocument,
  DatasetPivotResponse,
  EventItem,
  LoginResponse,
  NewsItem,
  Publication,
  Researcher,
  ResourceItem
} from './models';

type CollectionMap = {
  publications: Publication;
  researchers: Researcher;
  events: EventItem;
  news: NewsItem;
  resources: ResourceItem;
  dataset: DatasetDocument;
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password });
  }

  getAnalytics(): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(`${this.apiUrl}/analytics`);
  }

  getDatasetAnalytics(): Observable<DatasetAnalyticsResponse> {
    return this.http.get<DatasetAnalyticsResponse>(`${this.apiUrl}/dataset/analytics`);
  }

  getDataset(q = '', limit = 50, topic = ''): Observable<ApiList<DatasetDocument>> {
    return this.http.get<ApiList<DatasetDocument>>(`${this.apiUrl}/dataset`, {
      params: this.params({ q, limit, topic })
    });
  }

  getDatasetPivot(row = 'topic', column = 'source_org'): Observable<DatasetPivotResponse> {
    return this.http.get<DatasetPivotResponse>(`${this.apiUrl}/dataset/pivot`, {
      params: this.params({ row, column })
    });
  }

  getPublications(q = '', limit = 50): Observable<ApiList<Publication>> {
    return this.http.get<ApiList<Publication>>(`${this.apiUrl}/publications`, {
      params: this.params({ q, limit })
    });
  }

  getCollection<K extends Exclude<CollectionKey, 'publications'>>(
    key: K,
    q = '',
    limit = 50
  ): Observable<ApiList<CollectionMap[K]>> {
    return this.http.get<ApiList<CollectionMap[K]>>(`${this.apiUrl}/${key}`, {
      params: this.params({ q, limit })
    });
  }

  create<K extends CollectionKey>(key: K, payload: Record<string, unknown> | FormData): Observable<ApiItem<CollectionMap[K]>> {
    return this.http.post<ApiItem<CollectionMap[K]>>(`${this.apiUrl}/${key}`, payload, {
      headers: this.authHeaders(payload instanceof FormData)
    });
  }

  update<K extends CollectionKey>(
    key: K,
    id: string,
    payload: Record<string, unknown> | FormData
  ): Observable<ApiItem<CollectionMap[K]>> {
    return this.http.put<ApiItem<CollectionMap[K]>>(`${this.apiUrl}/${key}/${id}`, payload, {
      headers: this.authHeaders(payload instanceof FormData)
    });
  }

  delete(key: CollectionKey, id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${key}/${id}`, {
      headers: this.authHeaders()
    });
  }

  publicationFileUrl(id: string, mode: 'preview' | 'download' = 'preview'): string {
    return `${this.apiUrl}/publications/${id}/file?mode=${mode}`;
  }

  private authHeaders(isFormData = false): HttpHeaders {
    const token = localStorage.getItem('pot_token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (!isFormData) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return headers;
  }

  private params(values: Record<string, string | number>): HttpParams {
    let params = new HttpParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
