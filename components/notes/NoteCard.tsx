"use client";

import { FileText, Image, File, Music, Video } from "lucide-react";
import type { Note } from "@/store/useStore";

const MEDIA_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  image: Image,
  document: File,
  audio: Music,
  video: Video,
};

const ICON_COLORS: Record<string, string> = {
  video: "text-blue-500",
  audio: "text-purple-500",
  document: "text-red-500",
  image: "text-emerald-500",
  text: "text-slate-500",
};

const MEDIA_LABELS: Record<string, string> = {
  text: "文本",
  image: "图片",
  document: "文档",
  audio: "音频",
  video: "视频",
};

export function NoteCard({
  note,
  isSelected,
  onClick,
  formatDate = (s?: string) => (s ? new Date(s).toLocaleDateString("zh-CN") : ""),
}: {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  formatDate?: (dateStr?: string) => string;
}) {
  const Icon = MEDIA_ICONS[note.media_type] ?? FileText;
  const iconColor = ICON_COLORS[note.media_type] ?? "text-slate-500";

  return (
    <button
      onClick={onClick}
      type="button"
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? "border-indigo-200 bg-white shadow-sm ring-1 ring-indigo-500/10"
          : "border-transparent bg-white hover:border-slate-200 hover:shadow-sm"
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-100 p-1.5">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <span className="text-xs font-medium text-slate-400">
            {formatDate(note.created_at)}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
          {MEDIA_LABELS[note.media_type] ?? "其他"}
        </span>
      </div>

      <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold leading-tight text-slate-800">
        {note.title}
      </h3>

      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
        {note.summary || note.content?.slice(0, 80) || "暂无 AI 摘要"}
      </p>

      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
