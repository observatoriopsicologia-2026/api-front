export interface BaseItem {
  id: string;
  is_featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Publication extends BaseItem {
  title: string;
  abstract: string;
  authors: string;
  year?: number | null;
  country: string;
  tags: string[];
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  published_at?: string | null;
}

export interface Researcher extends BaseItem {
  name: string;
  institution: string;
  country: string;
  specialty: string;
  bio: string;
  email: string;
  profile_url: string;
}

export interface EventItem extends BaseItem {
  title: string;
  description: string;
  starts_at?: string | null;
  location: string;
  modality: string;
  category: string;
  url: string;
}

export interface NewsItem extends BaseItem {
  title: string;
  summary: string;
  body: string;
  image_url: string;
  source_url: string;
  published_at?: string | null;
}

export interface ResourceItem extends BaseItem {
  title: string;
  description: string;
  type: string;
  url: string;
  tags: string[];
}

export interface DatasetDocument extends BaseItem {
  title: string;
  author: string;
  publication_date?: string | null;
  year?: number | null;
  language: string[];
  document_type: string;
  source_org: string;
  topic: string;
  batch: string;
  source_url: string;
  local_file: string;
  extracted_text: string;
  manual_notes: string;
  is_visible: boolean;
}

export interface ApiList<T> {
  items: T[];
}

export interface ApiItem<T> {
  item: T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor';
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface AnalyticsSummary {
  publications: number;
  publications_with_pdf: number;
  researchers: number;
  events: number;
  news: number;
  resources: number;
  countries: number;
}

export interface DatasetAnalyticsSummary {
  documents: number;
  visible_documents: number;
  topics: number;
  sources: number;
  years: number;
}

export interface LatestPublicationSummary {
  title: string;
  authors: string;
  country: string;
  year?: number | null;
}

export interface AnalyticsResponse {
  generated_at: string;
  summary: AnalyticsSummary;
  publications_by_year: AnalyticsPoint[];
  publications_by_country: AnalyticsPoint[];
  publications_by_tag: AnalyticsPoint[];
  researchers_by_country: AnalyticsPoint[];
  researchers_by_specialty: AnalyticsPoint[];
  events_by_modality: AnalyticsPoint[];
  events_by_month: AnalyticsPoint[];
  news_by_month: AnalyticsPoint[];
  resources_by_type: AnalyticsPoint[];
  latest_publications: LatestPublicationSummary[];
}

export interface DatasetAnalyticsResponse {
  generated_at: string;
  summary: DatasetAnalyticsSummary;
  documents_by_topic: AnalyticsPoint[];
  documents_by_source: AnalyticsPoint[];
  documents_by_year: AnalyticsPoint[];
  documents_by_language: AnalyticsPoint[];
  documents_by_type: AnalyticsPoint[];
  latest_documents: DatasetDocument[];
}

export interface DatasetPivotResponse {
  row_dimension: string;
  column_dimension: string;
  columns: string[];
  rows: Array<{
    label: string;
    total: number;
    values: Record<string, number>;
  }>;
}

export type CollectionKey = 'publications' | 'researchers' | 'events' | 'news' | 'resources' | 'dataset';
