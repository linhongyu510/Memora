"use client";

import { create } from "zustand";

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
  mediaType: MediaType;
  categoryId: number | null;
  tagIds: number[];
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
  viewMode: ViewMode;
  upload: UploadState;
  selectCategory: (categoryId: number | null) => void;
  toggleTag: (tagId: number) => void;
  clearTagFilter: () => void;
  setViewMode: (mode: ViewMode) => void;
  setDragActive: (active: boolean) => void;
  addCategory: (name: string, parentId?: number | null) => void;
  addTag: (name: string) => void;
  ingestFiles: (files: File[]) => void;
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
    mediaType: "document",
    categoryId: 3,
    tagIds: [1, 3],
    status: "completed",
    createdAt: new Date().toISOString(),
  },
  {
    id: 1002,
    title: "OmniNote 需求评审录音",
    summary: "会议讨论了上传中心、处理流水线和标签系统的优先级。",
    mediaType: "audio",
    categoryId: 5,
    tagIds: [4],
    status: "completed",
    createdAt: new Date().toISOString(),
  },
];

function inferMediaType(file: File): MediaType {
  const mime = file.type.toLowerCase();
  const lowerName = file.name.toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    lowerName.endsWith(".pdf") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx")
  ) {
    return "document";
  }
  return "text";
}

function buildSummaryByMediaType(mediaType: MediaType) {
  if (mediaType === "image") return "图片 OCR 处理中，正在提取文字并生成结构化摘要。";
  if (mediaType === "audio") return "音频转写处理中，正在生成会议要点与行动项。";
  if (mediaType === "video") return "视频解析处理中，正在抽取关键片段与主题内容。";
  if (mediaType === "document") return "文档解析处理中，正在提取章节结构与核心结论。";
  return "文本清洗处理中，正在生成摘要与推荐标签。";
}

function suggestTagIds(mediaType: MediaType, allTags: TagItem[]) {
  if (!allTags.length) return [];
  if (mediaType === "audio" || mediaType === "video") {
    const meetingTag = allTags.find((tag) => tag.name.includes("会议"));
    return meetingTag ? [meetingTag.id] : [allTags[0].id];
  }
  if (mediaType === "image") {
    const ideaTag = allTags.find((tag) => tag.name.includes("灵感"));
    return ideaTag ? [ideaTag.id] : [allTags[0].id];
  }
  return [allTags[0].id];
}

export const useOmniNoteStore = create<OmniNoteState>((set) => ({
  categories: initialCategories,
  tags: initialTags,
  notes: initialNotes,
  selectedCategoryId: null,
  selectedTagIds: [],
  viewMode: "card",
  upload: {
    isDragging: false,
    isUploading: false,
    progress: 0,
    message: "等待上传",
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
  setViewMode: (mode) => set({ viewMode: mode }),
  setDragActive: (active) =>
    set((state) => ({
      upload: { ...state.upload, isDragging: active },
    })),
  addCategory: (name, parentId = null) =>
    set((state) => {
      const maxId = state.categories.reduce((max, item) => Math.max(max, item.id), 0);
      const siblings = state.categories.filter((item) => item.parentId === parentId);
      return {
        categories: [
          ...state.categories,
          {
            id: maxId + 1,
            name,
            parentId,
            sortOrder: siblings.length,
          },
        ],
      };
    }),
  addTag: (name) =>
    set((state) => {
      const maxId = state.tags.reduce((max, item) => Math.max(max, item.id), 0);
      return {
        tags: [...state.tags, { id: maxId + 1, name, color: "#6366F1" }],
      };
    }),
  ingestFiles: (files) => {
    if (!files.length) return;

    const now = new Date().toISOString();
    const fileRefs = files.map((file, index) => {
      const id = Date.now() + index;
      return {
        id,
        file,
        mediaType: inferMediaType(file),
      };
    });

    // 关键业务逻辑：先落一批 processing 笔记，后续再统一更新为 completed，模拟后端流水线。
    set((state) => ({
      notes: [
        ...fileRefs.map(({ id, file, mediaType }) => ({
          id,
          title: file.name.replace(/\.[^/.]+$/, "") || "未命名笔记",
          summary: buildSummaryByMediaType(mediaType),
          mediaType,
          categoryId: state.selectedCategoryId,
          tagIds: [],
          status: "processing" as NoteStatus,
          createdAt: now,
        })),
        ...state.notes,
      ],
      upload: {
        ...state.upload,
        isUploading: true,
        progress: 8,
        message: `正在处理 ${files.length} 个文件`,
      },
    }));

    let progress = 8;
    const timer = setInterval(() => {
      progress += 12;
      if (progress >= 100) {
        clearInterval(timer);
        set((state) => ({
          notes: state.notes.map((note) => {
            const target = fileRefs.find((item) => item.id === note.id);
            if (!target) return note;
            return {
              ...note,
              summary: "AI 已完成摘要：这是基于多模态内容提取后的结构化总结（Mock）。",
              tagIds: suggestTagIds(target.mediaType, state.tags),
              status: "completed",
            };
          }),
          upload: {
            ...state.upload,
            isUploading: false,
            progress: 100,
            message: "处理完成",
          },
        }));
        return;
      }

      set((state) => ({
        upload: {
          ...state.upload,
          progress,
          message: `后台处理中 ${progress}%`,
        },
      }));
    }, 220);
  },
}));

export function mediaTypeIcon(mediaType: MediaType) {
  if (mediaType === "audio") return "🎵";
  if (mediaType === "video") return "🎥";
  if (mediaType === "image") return "🖼️";
  if (mediaType === "document") return "📄";
  return "📝";
}

