"use client";

import { FileText, Image as ImageIcon, File, Music, Video, X, FileDown } from "lucide-react";
import type { Note } from "@/store/useStore";
import { API_BASE } from "@/lib/api";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  text: FileText,
  image: ImageIcon,
  document: File,
  audio: Music,
  video: Video,
};

const TYPE_LABELS: Record<string, string> = {
  text: "文本",
  image: "图片",
  document: "文档",
  audio: "音频",
  video: "视频",
};

function renderInline(text: string) {
  return text
    .split(/(\*\*.*?\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`${part}-${index}`} className="text-indigo-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      return part;
    });
}

function MarkdownContent({ content }: { content: string }) {
  if (!content.trim()) return <p className="text-slate-400">（无内容）</p>;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim()) {
      elements.push(<div key={`space-${index}`} className="h-2" />);
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      elements.push(
        <pre
          key={`code-${index}`}
          className="my-4 overflow-x-auto rounded-xl bg-slate-800 p-4 font-mono text-xs text-slate-50"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={`heading-${index}`}>{renderInline(line.replace("### ", ""))}</h3>);
      continue;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="my-4 rounded-r-lg border-l-4 border-indigo-200 bg-indigo-50/50 py-2 pl-4 italic text-slate-700"
        >
          {renderInline(line.replace("> ", ""))}
        </blockquote>
      );
      continue;
    }

    if (line.startsWith("- [ ]") || line.startsWith("- [x]")) {
      const items: Array<{ checked: boolean; text: string }> = [];
      while (
        index < lines.length &&
        (lines[index].startsWith("- [ ]") || lines[index].startsWith("- [x]"))
      ) {
        items.push({
          checked: lines[index].startsWith("- [x]"),
          text: lines[index].replace(/- \[[ x]\]\s*/, ""),
        });
        index += 1;
      }
      index -= 1;
      elements.push(
        <div key={`task-${index}`} className="space-y-2">
          {items.map((item, itemIndex) => (
            <div key={`task-item-${itemIndex}`} className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={item.checked}
                readOnly
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>{renderInline(item.text)}</span>
            </div>
          ))}
        </div>
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].replace("- ", ""));
        index += 1;
      }
      index -= 1;
      elements.push(
        <ul key={`list-${index}`} className="ml-5 list-disc space-y-1 marker:text-slate-300">
          {items.map((item, itemIndex) => (
            <li key={`list-item-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s/, ""));
        index += 1;
      }
      index -= 1;
      elements.push(
        <ol key={`ordered-${index}`} className="ml-5 list-decimal space-y-1 marker:text-slate-400">
          {items.map((item, itemIndex) => (
            <li key={`ordered-item-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    elements.push(
      <p key={`paragraph-${index}`} className="mb-2">
        {renderInline(line)}
      </p>
    );
  }

  return (
    <div className="prose prose-slate max-w-none text-sm text-slate-600 prose-headings:font-bold prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-lg prose-li:my-1 prose-p:leading-relaxed prose-strong:text-indigo-900">
      {elements}
    </div>
  );
}

export function NoteDetail({ note, onClose }: { note: Note; onClose: () => void }) {
  const originalPathLower = (note.original_path ?? "").toLowerCase();
  const isImage =
    note.media_type === "image" || [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => originalPathLower.endsWith(ext));
  const isPdf = originalPathLower.endsWith(".pdf");
  const isVideo =
    note.media_type === "video" || [".mp4", ".webm", ".mkv", ".avi", ".mov"].some((ext) => originalPathLower.endsWith(ext));
  const isAudio =
    note.media_type === "audio" || [".mp3", ".wav", ".m4a", ".aac", ".flac"].some((ext) => originalPathLower.endsWith(ext));

  const originalFileName = note.original_path
    ? note.original_path.split(/[\\/]/).filter(Boolean).at(-1) ?? null
    : null;
  const mediaUrl = originalFileName ? `${API_BASE}/files/${originalFileName}` : null;

  const showMediaPreview = Boolean(mediaUrl && (isImage || isPdf || isVideo || isAudio));
  const TypeIcon = TYPE_ICONS[note.media_type] ?? FileText;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
      <header className="sticky top-0 z-20 flex items-start justify-between border-b border-slate-100 bg-white/80 px-8 py-4 backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-slate-100 p-2">
              <TypeIcon className="h-5 w-5 text-slate-600" />
            </span>
            <h1 className="text-lg font-bold text-slate-800">{note.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {TYPE_LABELS[note.media_type] ?? "其他"}
            </span>
            {note.created_at && (
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {new Date(note.created_at).toLocaleString("zh-CN", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              {note.status === "completed" ? "已完成" : note.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mediaUrl && (
            <a
              href={mediaUrl}
              download
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              title="下载"
            >
              <FileDown className="h-5 w-5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-8 p-8">
          {showMediaPreview && (
            <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-2 shadow-sm">
              {isImage && mediaUrl && (
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
                  <img
                    src={mediaUrl}
                    alt={note.title}
                    className="h-full w-full object-cover opacity-90"
                  />
                </div>
              )}

              {isPdf && mediaUrl && (
                <iframe
                  src={mediaUrl}
                  title={note.title}
                  className="h-96 w-full rounded-2xl border-0"
                />
              )}

              {isVideo && mediaUrl && (
                <video
                  src={mediaUrl}
                  controls
                  className="aspect-video w-full rounded-2xl bg-slate-900"
                />
              )}

              {isAudio && mediaUrl && (
                <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-indigo-100/50 bg-gradient-to-br from-indigo-50 to-purple-50">
                  <audio src={mediaUrl} controls className="w-full max-w-md" />
                </div>
              )}
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-2 text-indigo-600">
              <span className="text-lg">✨</span>
              <h2 className="text-base font-bold">AI 智能解析与总结</h2>
            </div>

            {note.summary && (
              <div className="mb-6">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">摘要</p>
                <p className="text-sm leading-relaxed text-slate-700">{note.summary}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">完整内容</p>
              <MarkdownContent content={note.content || ""} />
            </div>

            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">AI 推荐标签：</span>
                {note.tags?.length ? (
                  note.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600"
                      style={{
                        backgroundColor: `${tag.color || "#6366f1"}20`,
                        color: tag.color || "#6366f1",
                      }}
                    >
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">暂无推荐标签</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
