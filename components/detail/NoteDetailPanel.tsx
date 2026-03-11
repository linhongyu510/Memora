"use client";

import { FileText } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { type NoteItem } from "@/store/use-omninote-store";

interface NoteDetailPanelProps {
  note: NoteItem | null;
  markdown: string;
  onMarkdownChange: (value: string) => void;
}

export function NoteDetailPanel({ note, markdown, onMarkdownChange }: NoteDetailPanelProps) {
  if (!note) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        选择一条笔记后，在这里查看多模态详情与 AI 总结
      </div>
    );
  }

  const mediaUrl = `${API_BASE_URL}/api/notes/${note.id}/media`;

  return (
    <div className="grid h-full grid-cols-1 gap-3 xl:grid-cols-2">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <p className="text-sm font-medium text-slate-700">原始媒体预览</p>
        </div>
        <div className="h-[340px] p-4">{renderMediaPreview(note, mediaUrl)}</div>
      </section>

      <section className="space-y-3 overflow-auto rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">结构化总结</p>
          <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{note.summary || "暂无总结"}</div>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">提取全文</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            {note.content || "暂无提取文本"}
          </pre>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">可编辑 Markdown</p>
          <textarea
            className="h-48 w-full resize-y rounded-md border border-slate-200 p-3 font-mono text-xs outline-none focus:border-slate-400"
            value={markdown}
            onChange={(event) => onMarkdownChange(event.target.value)}
            placeholder="在此编辑你的 Markdown 笔记..."
          />
        </div>
      </section>
    </div>
  );
}

function renderMediaPreview(note: NoteItem, mediaUrl: string) {
  if (note.mediaType === "image") {
    return (
      <img
        src={mediaUrl}
        alt={note.title}
        className="h-full w-full rounded-md object-contain"
        loading="lazy"
      />
    );
  }

  if (note.mediaType === "audio") {
    return (
      <div className="flex h-full items-center justify-center">
        <audio controls className="w-full" src={mediaUrl} />
      </div>
    );
  }

  if (note.mediaType === "video") {
    return (
      <video controls className="h-full w-full rounded-md object-contain bg-black" src={mediaUrl} />
    );
  }

  if (note.mediaType === "document") {
    return (
      <iframe
        title={`${note.title}-preview`}
        src={mediaUrl}
        className="h-full w-full rounded-md border border-slate-200"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-sm text-slate-500">
      <div>
        <FileText className="mx-auto mb-2 h-5 w-5" />
        <p>文本类型笔记，无媒体预览</p>
      </div>
    </div>
  );
}

