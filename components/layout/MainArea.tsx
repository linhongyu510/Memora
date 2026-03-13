"use client";

import { useEffect, useMemo } from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { UploadZone } from "@/components/upload/UploadZone";
import { useStore } from "@/store/useStore";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteDetail } from "@/components/notes/NoteDetail";

const MEDIA_LABELS: Record<string, string> = {
  all: "全部类型",
  video: "视频",
  audio: "音频",
  document: "文档",
  image: "图片",
  text: "文本",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86_400_000) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (diff < 172_800_000) {
    return `昨天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
        active ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

export function MainArea() {
  const {
    categories,
    notes,
    selectedNote,
    selectedCategoryId,
    loading,
    loadNotes,
    selectNote,
    mediaFilter,
    searchQuery,
    setMediaFilter,
    setSearchQuery,
  } = useStore();

  useEffect(() => {
    loadNotes(selectedCategoryId ?? undefined);
  }, [loadNotes, selectedCategoryId]);

  const filteredNotes = useMemo(() => {
    let result = notes;

    if (mediaFilter !== "all") {
      result = result.filter((note) => note.media_type === mediaFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (note) =>
          note.title?.toLowerCase().includes(query) ||
          note.summary?.toLowerCase().includes(query) ||
          note.content?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [notes, mediaFilter, searchQuery]);

  const visibleSelectedNote = useMemo(
    () => (selectedNote && filteredNotes.some((note) => note.id === selectedNote.id) ? selectedNote : null),
    [filteredNotes, selectedNote]
  );

  const selectedCategoryName = useMemo(() => {
    if (selectedCategoryId === null) {
      return "全部笔记";
    }

    return categories.find((category) => category.id === selectedCategoryId)?.name ?? "当前分类";
  }, [categories, selectedCategoryId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <section className="flex w-full flex-shrink-0 flex-col border-b border-slate-200 bg-white shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] lg:w-[360px] lg:border-b-0 lg:border-r">
        <div className="space-y-4 border-b border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedCategoryName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                当前筛选：{MEDIA_LABELS[mediaFilter]} · {filteredNotes.length} 条结果
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right shadow-sm">
              <p className="text-lg font-semibold text-slate-900">{notes.length}</p>
              <p className="text-xs text-slate-500">总笔记</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索全文或 AI 总结..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border-none bg-slate-100/50 px-4 py-2 pl-9 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex space-x-2 overflow-x-auto pb-1">
            <FilterChip label="全部" active={mediaFilter === "all"} onClick={() => setMediaFilter("all")} />
            <FilterChip label="视频" active={mediaFilter === "video"} onClick={() => setMediaFilter("video")} />
            <FilterChip label="音频" active={mediaFilter === "audio"} onClick={() => setMediaFilter("audio")} />
            <FilterChip label="文档" active={mediaFilter === "document"} onClick={() => setMediaFilter("document")} />
            <FilterChip label="图片" active={mediaFilter === "image"} onClick={() => setMediaFilter("image")} />
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/30 p-3">
          {loading.notes ? (
            <div className="flex flex-1 items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              加载笔记...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-slate-500">
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-sm">暂无笔记</p>
              <p className="text-xs">点击左侧「新建/上传」或使用下方区域添加</p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isSelected={visibleSelectedNote?.id === note.id}
                onClick={() => selectNote(note)}
                formatDate={formatDate}
              />
            ))
          )}
        </div>

        <div className="border-t border-slate-100 p-3">
          <UploadZone />
        </div>
      </section>

      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        {visibleSelectedNote ? (
          <NoteDetail note={visibleSelectedNote} onClose={() => selectNote(null)} />
        ) : (
          !loading.notes &&
          filteredNotes.length > 0 && (
            <div className="flex flex-1 items-center justify-center px-6 text-slate-400">
              <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
                <p className="text-sm font-medium text-slate-600">选择一条笔记查看详情</p>
                <p className="mt-2 text-xs text-slate-500">右侧会展示媒体预览、AI 摘要和全文内容。</p>
              </div>
            </div>
          )
        )}

        {!loading.notes && filteredNotes.length === 0 && visibleSelectedNote === null && (
          <div className="flex flex-1 items-center justify-center px-6 text-slate-400">
            <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-600">拖拽或点击上传区域添加笔记</p>
              <p className="mt-2 text-xs text-slate-500">支持文本、图片、PDF、Word、音频和视频。</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
