"use client";

import { create } from "zustand";

import { API_BASE_URL } from "@/lib/api";

export type MediaType = "text" | "image" | "document" | "audio" | "video";
export type NoteStatus = "pending" | "processing" | "completed" | "failed";
export type ViewMode = "card" | "list";

export interface CategoryItem {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder: number;
}

export interface TagItem {
  id: number;
  name: string;
  color: string;
}

export interface NoteItem {
  id: number;
  title: string;
  summary: string;
  content: string;
  mediaType: MediaType;
  categoryId: number | null;
  tagIds: number[];
  originalPath: string | null;
  status: NoteStatus;
  createdAt: string;
}

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
  message: string;
}

interface OmniNoteState {
  categories: CategoryItem[];
  tags: TagItem[];
  notes: NoteItem[];
  selectedCategoryId: number | null;
  selectedTagIds: number[];
  selectedNoteId: number | null;
  markdownDrafts: Record<number, string>;
  viewMode: ViewMode;
  upload: UploadState;
  bootstrapError: string | null;
  loadTaxonomy: () => Promise<void>;
  loadNotes: () => Promise<void>;
  selectCategory: (categoryId: number | null) => void;
  toggleTag: (tagId: number) => void;
  clearTagFilter: () => void;
  selectNote: (noteId: number | null) => void;
  setMarkdownDraft: (noteId: number, markdown: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setDragActive: (active: boolean) => void;
  addCategory: (name: string, parentId?: number | null) => Promise<void>;
  addTag: (name: string) => Promise<void>;
  uploadFiles: (files: File[]) => Promise<void>;
}

const initialCategories: CategoryItem[] = [
  { id: 1, name: "学习", parentId: null, sortOrder: 0 },
  { id: 2, name: "项目", parentId: null, sortOrder: 1 },
  { id: 3, name: "AI 研究", parentId: 1, sortOrder: 0 },
  { id: 4, name: "前端工程", parentId: 1, sortOrder: 1 },
  { id: 5, name: "OmniNote", parentId: 2, sortOrder: 0 },
];

const initialTags: TagItem[] = [
  { id: 1, name: "高优先级", color: "#EF4444" },
  { id: 2, name: "待整理", color: "#F59E0B" },
  { id: 3, name: "灵感", color: "#3B82F6" },
  { id: 4, name: "会议", color: "#10B981" },
];

const initialNotes: NoteItem[] = [
  {
    id: 1001,
    title: "RAG 架构设计草稿",
    summary: "梳理检索增强生成在个人知识库中的分层架构与索引策略。",
    content: "这是示例文本。后续将由后端真实解析内容替换。",
    mediaType: "document",
    categoryId: 3,
    tagIds: [1, 3],
    originalPath: null,
    status: "completed",
    createdAt: new Date().toISOString(),
  },
  {
    id: 1002,
    title: "OmniNote 需求评审录音",
    summary: "会议讨论了上传中心、处理流水线和标签系统的优先级。",
    content: "这是示例转写。后续将由后端真实解析内容替换。",
    mediaType: "audio",
    categoryId: 5,
    tagIds: [4],
    originalPath: null,
    status: "completed",
    createdAt: new Date().toISOString(),
  },
];

interface BackendTag {
  id: number;
  name: string;
  color?: string | null;
  sort_order?: number | null;
}

interface BackendCategory {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
}

interface BackendNote {
  id: number;
  title: string;
  summary: string | null;
  content: string | null;
  media_type: MediaType;
  category_id: number | null;
  original_path?: string | null;
  status: NoteStatus;
  created_at?: string | null;
  tags?: BackendTag[];
}

interface UploadBatchResponse {
  total: number;
  completed: number;
  failed: number;
  results: Array<{
    note_id: number;
    status: string;
    message: string;
  }>;
}

interface PollResponse {
  items: Array<{
    note_id: number;
    status: string;
    error_message?: string | null;
  }>;
}

function toTagItem(tag: BackendTag): TagItem {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color || "#3B82F6",
  };
}

function toNoteItem(note: BackendNote): NoteItem {
  return {
    id: note.id,
    title: note.title,
    summary: note.summary || "",
    content: note.content || "",
    mediaType: note.media_type || "text",
    categoryId: note.category_id,
    tagIds: (note.tags || []).map((tag) => tag.id),
    originalPath: note.original_path || null,
    status: note.status || "pending",
    createdAt: note.created_at || new Date().toISOString(),
  };
}

function buildDefaultMarkdown(note: NoteItem): string {
  return [
    `# ${note.title}`,
    "",
    "## AI 结构化总结",
    note.summary || "（暂无总结）",
    "",
    "## 可编辑笔记",
    "- 在此补充你的个人理解、行动项与复盘。",
  ].join("\n");
}

function mergeTags(existing: TagItem[], incoming: TagItem[]): TagItem[] {
  const map = new Map<number, TagItem>();
  existing.forEach((tag) => map.set(tag.id, tag));
  incoming.forEach((tag) => {
    const old = map.get(tag.id);
    map.set(tag.id, old ? { ...old, ...tag } : tag);
  });
  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

async function pollProcessingNotes(noteIds: number[], setProgress: (progress: number, message: string) => void) {
  const maxRounds = 30;
  for (let round = 0; round < maxRounds; round += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/status?ids=${noteIds.join(",")}`);
      if (!response.ok) {
        continue;
      }
      const payload: PollResponse = await response.json();
      const statuses = payload.items.map((item) => item.status);
      const allFinished = statuses.every((status) => status === "completed" || status === "failed");

      const progress = Math.min(95, 35 + round * 2);
      setProgress(progress, `AI 处理中 ${progress}%`);

      if (allFinished) {
        return payload;
      }
    } catch {
      // 网络抖动时继续轮询，避免一次请求失败就终止流程。
      continue;
    }
  }
  return null;
}

export const useOmniNoteStore = create<OmniNoteState>((set) => ({
  categories: initialCategories,
  tags: initialTags,
  notes: initialNotes,
  selectedCategoryId: null,
  selectedTagIds: [],
  selectedNoteId: initialNotes[0]?.id ?? null,
  markdownDrafts: initialNotes.reduce<Record<number, string>>((acc, note) => {
    acc[note.id] = buildDefaultMarkdown(note);
    return acc;
  }, {}),
  viewMode: "card",
  upload: {
    isDragging: false,
    isUploading: false,
    progress: 0,
    message: "等待上传",
  },
  bootstrapError: null,
  loadTaxonomy: async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/categories`),
        fetch(`${API_BASE_URL}/api/tags`),
      ]);

      if (!categoriesRes.ok || !tagsRes.ok) {
        throw new Error("分类/标签加载失败");
      }

      const categoriesPayload: BackendCategory[] = await categoriesRes.json();
      const tagsPayload: BackendTag[] = await tagsRes.json();

      set({
        categories: categoriesPayload.map((item) => ({
          id: item.id,
          name: item.name,
          parentId: item.parent_id,
          sortOrder: item.sort_order ?? 0,
        })),
        tags: tagsPayload.map(toTagItem),
        bootstrapError: null,
      });
    } catch {
      set({ bootstrapError: "后端分类与标签加载失败，当前使用本地示例数据。" });
    }
  },
  loadNotes: async () => {
    const response = await fetch(`${API_BASE_URL}/api/notes`);
    if (!response.ok) {
      throw new Error("获取笔记列表失败");
    }
    const payload: BackendNote[] = await response.json();
    const mappedNotes = payload.map(toNoteItem);
    const incomingTags = payload.flatMap((note) => (note.tags || []).map(toTagItem));

    set((state) => {
      const markdownDrafts = { ...state.markdownDrafts };
      mappedNotes.forEach((note) => {
        if (!markdownDrafts[note.id]) {
          markdownDrafts[note.id] = buildDefaultMarkdown(note);
        }
      });

      const selectedNoteStillExists = state.selectedNoteId
        ? mappedNotes.some((note) => note.id === state.selectedNoteId)
        : false;

      return {
        notes: mappedNotes,
        tags: mergeTags(state.tags, incomingTags),
        markdownDrafts,
        selectedNoteId: selectedNoteStillExists ? state.selectedNoteId : mappedNotes[0]?.id ?? null,
      };
    });
  },
  selectCategory: (categoryId) => set({ selectedCategoryId: categoryId }),
  toggleTag: (tagId) =>
    set((state) => {
      const exists = state.selectedTagIds.includes(tagId);
      return {
        selectedTagIds: exists
          ? state.selectedTagIds.filter((id) => id !== tagId)
          : [...state.selectedTagIds, tagId],
      };
    }),
  clearTagFilter: () => set({ selectedTagIds: [] }),
  selectNote: (noteId) => set({ selectedNoteId: noteId }),
  setMarkdownDraft: (noteId, markdown) =>
    set((state) => ({
      markdownDrafts: {
        ...state.markdownDrafts,
        [noteId]: markdown,
      },
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setDragActive: (active) =>
    set((state) => ({
      upload: { ...state.upload, isDragging: active },
    })),
  addCategory: async (name, parentId = null) => {
    const state = useOmniNoteStore.getState();
    const sortOrder = state.categories.filter((item) => item.parentId === parentId).length;

    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        parent_id: parentId,
        sort_order: sortOrder,
      }),
    });
    if (!response.ok) {
      throw new Error("新建分类失败");
    }

    const payload: BackendCategory = await response.json();
    set((prev) => ({
      categories: [
        ...prev.categories,
        {
          id: payload.id,
          name: payload.name,
          parentId: payload.parent_id,
          sortOrder: payload.sort_order ?? 0,
        },
      ],
    }));
  },
  addTag: async (name) => {
    const state = useOmniNoteStore.getState();
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sort_order: state.tags.length,
      }),
    });
    if (!response.ok) {
      throw new Error("新建标签失败");
    }

    const payload: BackendTag = await response.json();
    set((prev) => ({
      tags: mergeTags(prev.tags, [toTagItem(payload)]),
    }));
  },
  uploadFiles: async (files) => {
    if (!files.length) return;

    set((state) => ({
      upload: { ...state.upload, isUploading: true, progress: 10, message: "上传中..." },
    }));

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const selectedCategoryId = useOmniNoteStore.getState().selectedCategoryId;
      if (selectedCategoryId !== null) {
        formData.append("category_id", String(selectedCategoryId));
      }

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("上传失败，请检查后端服务是否可用");
      }

      const payload: UploadBatchResponse = await response.json();
      const processingIds = payload.results
        .filter((item) => item.status === "processing")
        .map((item) => item.note_id);

      set((state) => ({
        upload: {
          ...state.upload,
          progress: 35,
          message: "上传完成，等待 AI 处理...",
        },
      }));

      await useOmniNoteStore.getState().loadNotes();

      if (processingIds.length > 0) {
        await pollProcessingNotes(processingIds, (progress, message) => {
          set((state) => ({
            upload: {
              ...state.upload,
              progress,
              message,
            },
          }));
        });
      }

      await useOmniNoteStore.getState().loadNotes();

      const failedCount = payload.results.filter((item) => item.status === "failed").length;
      set((state) => ({
        upload: {
          ...state.upload,
          isUploading: false,
          progress: 100,
          message: failedCount
            ? `处理完成，${failedCount} 个文件失败`
            : "处理完成，全部文件已入库",
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传异常，请稍后重试";
      set((state) => ({
        upload: {
          ...state.upload,
          isUploading: false,
          progress: 0,
          message,
        },
      }));
    }
  },
}));

export function mediaTypeIcon(mediaType: MediaType) {
  if (mediaType === "audio") return "🎵";
  if (mediaType === "video") return "🎥";
  if (mediaType === "image") return "🖼️";
  if (mediaType === "document") return "📄";
  return "📝";
}

