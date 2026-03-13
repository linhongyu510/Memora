"use client";

import { create } from "zustand";
import type { Category, Tag, Note } from "@/lib/api";
export type { Note, Category, Tag } from "@/lib/api";
import { fetchCategories, fetchTags, fetchNotes, fetchNote, uploadFile } from "@/lib/api";

type MediaFilter = "all" | Note["media_type"];

interface AppState {
  categories: Category[];
  tags: Tag[];
  notes: Note[];
  selectedNote: Note | null;

  selectedCategoryId: number | null;
  mediaFilter: MediaFilter;
  searchQuery: string;

  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;

  loading: { categories: boolean; tags: boolean; notes: boolean };

  loadCategories: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadNotes: (categoryId?: number) => Promise<void>;
  selectCategory: (id: number | null) => void;
  setMediaFilter: (filter: MediaFilter) => void;
  setSearchQuery: (q: string) => void;
  selectNote: (note: Note | null) => void;
  loadNoteDetail: (id: number) => Promise<void>;

  upload: (file: File) => Promise<Note | null>;
  uploadFiles: (files: FileList | File[]) => Promise<Note[]>;
  clearUploadError: () => void;
}

function syncSelectedNote(notes: Note[], selectedNote: Note | null) {
  if (!selectedNote) {
    return null;
  }

  return notes.find((note) => note.id === selectedNote.id) ?? null;
}

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  tags: [],
  notes: [],
  selectedNote: null,

  selectedCategoryId: null,
  mediaFilter: "all",
  searchQuery: "",

  isUploading: false,
  uploadProgress: 0,
  uploadError: null,

  loading: { categories: false, tags: false, notes: false },

  loadCategories: async () => {
    set((state) => ({ loading: { ...state.loading, categories: true } }));
    try {
      const categories = await fetchCategories();
      set((state) => ({
        categories,
        loading: { ...state.loading, categories: false },
      }));
    } catch (error) {
      console.error("loadCategories", error);
      set((state) => ({ loading: { ...state.loading, categories: false } }));
    }
  },

  loadTags: async () => {
    set((state) => ({ loading: { ...state.loading, tags: true } }));
    try {
      const tags = await fetchTags();
      set((state) => ({ tags, loading: { ...state.loading, tags: false } }));
    } catch (error) {
      console.error("loadTags", error);
      set((state) => ({ loading: { ...state.loading, tags: false } }));
    }
  },

  loadNotes: async (categoryId?: number) => {
    set((state) => ({ loading: { ...state.loading, notes: true } }));
    try {
      const notes = await fetchNotes(categoryId);
      set((state) => ({
        notes,
        selectedNote: syncSelectedNote(notes, state.selectedNote),
        loading: { ...state.loading, notes: false },
      }));
    } catch (error) {
      console.error("loadNotes", error);
      set((state) => ({
        notes: [],
        selectedNote: null,
        loading: { ...state.loading, notes: false },
      }));
    }
  },

  selectCategory: (id) => {
    set({ selectedCategoryId: id, selectedNote: null });
  },

  setMediaFilter: (filter) => set({ mediaFilter: filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  selectNote: (note) => set({ selectedNote: note }),

  loadNoteDetail: async (id) => {
    try {
      const note = await fetchNote(id);
      set({ selectedNote: note });
    } catch (error) {
      console.error("loadNoteDetail", error);
    }
  },

  upload: async (file) => {
    if (get().isUploading) {
      return null;
    }

    set({ isUploading: true, uploadError: null, uploadProgress: 0 });
    let timer: ReturnType<typeof setInterval> | null = null;

    try {
      timer = setInterval(() => {
        set((state) => ({
          uploadProgress: Math.min(state.uploadProgress + 10, 90),
        }));
      }, 200);

      const note = await uploadFile(file);
      const selectedCategoryId = get().selectedCategoryId;
      const shouldAppendToCurrentList =
        selectedCategoryId === null || selectedCategoryId === note.category_id;

      set((state) => ({
        isUploading: false,
        uploadProgress: 100,
        uploadError: null,
        notes: shouldAppendToCurrentList
          ? [note, ...state.notes.filter((item) => item.id !== note.id)]
          : state.notes,
        selectedNote: note,
      }));

      return note;
    } catch (error) {
      set({
        isUploading: false,
        uploadProgress: 0,
        uploadError: error instanceof Error ? error.message : "上传失败",
      });
      return null;
    } finally {
      if (timer) {
        clearInterval(timer);
      }
    }
  },

  uploadFiles: async (files) => {
    const uploaded: Note[] = [];
    for (const file of Array.from(files)) {
      const note = await get().upload(file);
      if (note) {
        uploaded.push(note);
      }
    }

    if (uploaded.length > 0) {
      await Promise.all([
        get().loadCategories(),
        get().loadTags(),
        get().loadNotes(get().selectedCategoryId ?? undefined),
      ]);
      set({ selectedNote: uploaded[uploaded.length - 1] });
    }

    return uploaded;
  },

  clearUploadError: () => set({ uploadError: null }),
}));

