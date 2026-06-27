import { fetchJson } from './fetchJson';

export interface TechNewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl: string;
}

export interface TechNewsResponse {
  success: boolean;
  articles: TechNewsArticle[];
  fetchedAt?: string;
  cached?: boolean;
  error?: string;
}

export function getTechNews(limit = 12): Promise<TechNewsResponse> {
  return fetchJson<TechNewsResponse>(`/api/news/tech?limit=${limit}`);
}