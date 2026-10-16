import type { Asset, ExportResult, HealthStatus, Project, ProjectSummary, Template } from './types';

const API = 'http://127.0.0.1:8000/api';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  baseUrl: API,

  health: () => request<HealthStatus>(`${API}/health`),

  templates: () => request<Template[]>(`${API}/templates`),

  listProjects: () => request<ProjectSummary[]>(`${API}/projects`),

  listAssets: async (): Promise<Asset[]> => {
    const list = await request<Asset[]>(`${API}/assets`);
    return list.map(a => ({
      ...a,
      url: a.url.startsWith('http') ? a.url : `${API}${a.url.replace('/api', '')}`,
      thumbnailUrl: a.thumbnailUrl ? (a.thumbnailUrl.startsWith('http') ? a.thumbnailUrl : `${API}${a.thumbnailUrl.replace('/api', '')}`) : null,
    }));
  },

  deleteAsset: (id: string) =>
    request<{ deleted: boolean }>(`${API}/assets/${id}`, { method: 'DELETE' }),

  getThumbnailUrl: (id: string) => `${API}/assets/${id}/thumbnail`,

  getProject: (id: string) => request<Project>(`${API}/projects/${id}`),

  saveProject: (project: Project) =>
    request<Project>(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }),

  deleteProject: (id: string) =>
    request<{ deleted: boolean }>(`${API}/projects/${id}`, { method: 'DELETE' }),

  uploadAsset: async (file: File): Promise<Asset> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/assets`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `Failed to upload ${file.name}`);
    return {
      ...data,
      url: data.url.startsWith('http') ? data.url : `${API}${data.url.replace('/api', '')}`,
      thumbnailUrl: data.thumbnailUrl ? (data.thumbnailUrl.startsWith('http') ? data.thumbnailUrl : `${API}${data.thumbnailUrl.replace('/api', '')}`) : null,
    };
  },

  getAssetUrl: (id: string) => `${API}/assets/${id}`,

  exportProject: (project: Project) =>
    request<ExportResult>(`${API}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }),

  getExportUrl: (id: string) => `${API}/exports/${id}`,

  generateRanking: (params: { topic: string; platform?: string; itemCount?: number }) =>
    request<{
      title: string;
      hookText: string;
      templateId: string;
      accentColor: string;
      platform: string;
      items: Array<{ rank: number; label: string; duration: number; description: string }>;
    }>(`${API}/ai/generate-ranking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),

  saveTemplate: (template: Partial<Template>) =>
    request<Template>(`${API}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    }),

  deleteTemplate: (id: string) =>
    request<{ deleted: boolean }>(`${API}/templates/${id}`, { method: 'DELETE' }),

  discoverVideos: (params: { topic: string; platform?: string; itemCount?: number }) =>
    request<{
      topic: string;
      hookText: string;
      templateId: string;
      accentColor: string;
      platform: string;
      candidates: any[];
    }>(`${API}/ai/discover-videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }),

  inspectUrl: (url: string) =>
    request<any>(`${API}/ai/inspect-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  assembleProject: (payload: any) =>
    request<Project>(`${API}/ai/assemble-project`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};
