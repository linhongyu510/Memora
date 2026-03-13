/**
 * API 客户端 - 调用后端接口
 */

const envApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
export const API_BASE = envApiBase ? envApiBase.replace(/\/+$/, "") : "/api";

export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  sort_order: number;
  created_at?: string;
}

export interface Note {
  id: number;
  title: string;
  summary?: string | null;
  content?: string | null;
  media_type: string;
  category_id?: number | null;
  original_path?: string | null;
  status: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
  tags: Tag[];
}

export interface SystemSettings {
  llm_api_base?: string | null;
  llm_model?: string | null;
  llm_api_key_set: boolean;
  llm_api_key_masked?: string | null;
}

export interface SystemSettingsUpdate {
  llm_api_base?: string | null;
  llm_model?: string | null;
  llm_api_key?: string | null;
  clear_llm_api_key?: boolean;
}

async function readErrorMessage(response: Response, fallbackMessage: string) {
  const data = await response.clone().json().catch(() => null);
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail;
  }

  const text = await response.text().catch(() => "");
  return text.trim() || fallbackMessage;
}

async function request<T>(path: string, fallbackMessage: string, init?: RequestInit): Promise<T> {
  let res: Response;

  try {
    const url = `${API_BASE}${path}`;

    res = await fetch(url, {
      cache: "no-store",
      ...init,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error && error.message.trim() ? error.message.trim() : "";

    const isGenericFetchFailure =
      !rawMessage ||
      /failed to fetch/i.test(rawMessage) ||
      /fetch failed/i.test(rawMessage) ||
      /networkerror/i.test(rawMessage);

    if (!isGenericFetchFailure) {
      throw new Error(rawMessage);
    }

    const url = `${API_BASE}${path}`;
    const hint = API_BASE.startsWith("/api")
      ? "请确认后端已启动（默认端口 8001），以及前端 rewrites 代理可用。"
      : "请检查 NEXT_PUBLIC_API_BASE 是否正确、后端是否可访问，以及后端 CORS 是否允许当前前端域名。";

    throw new Error(`网络请求失败：${hint}（${url}）`);
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res, fallbackMessage));
  }

  return res.json() as Promise<T>;
}

export async function fetchCategories(): Promise<Category[]> {
  return request<Category[]>("/categories", "获取分类失败");
}

export async function fetchTags(): Promise<Tag[]> {
  return request<Tag[]>("/tags", "获取标签失败");
}

export async function fetchNotes(categoryId?: number): Promise<Note[]> {
  const url = categoryId
    ? `/notes?category_id=${categoryId}`
    : "/notes";
  return request<Note[]>(url, "获取笔记失败");
}

export async function fetchNote(id: number): Promise<Note> {
  return request<Note>(`/notes/${id}`, "获取笔记详情失败");
}

export async function uploadFile(file: File): Promise<Note> {
  const formData = new FormData();
  formData.append("file", file);
  return request<Note>("/upload", "上传失败", {
    method: "POST",
    body: formData,
  });
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  return request<SystemSettings>("/settings", "获取系统设置失败");
}

export async function updateSystemSettings(payload: SystemSettingsUpdate): Promise<SystemSettings> {
  return request<SystemSettings>("/settings", "保存系统设置失败", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
