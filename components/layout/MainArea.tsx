"use client";

import { LayoutGrid, List, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";

import { NoteDetailPanel } from "@/components/detail/NoteDetailPanel";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mediaTypeIcon,
  type CategoryItem,
  type NoteItem,
  useOmniNoteStore,
} from "@/store/use-omninote-store";

/**
 * 主内容区域 - 上传中心 + 笔记列表
 */
export function MainArea() {
  const categories = useOmniNoteStore((state) => state.categories);
  const tags = useOmniNoteStore((state) => state.tags);
  const notes = useOmniNoteStore((state) => state.notes);
  const selectedCategoryId = useOmniNoteStore((state) => state.selectedCategoryId);
  const selectedTagIds = useOmniNoteStore((state) => state.selectedTagIds);
  const selectedNoteId = useOmniNoteStore((state) => state.selectedNoteId);
  const markdownDrafts = useOmniNoteStore((state) => state.markdownDrafts);
  const viewMode = useOmniNoteStore((state) => state.viewMode);
  const uploadState = useOmniNoteStore((state) => state.upload);
  const loadTaxonomy = useOmniNoteStore((state) => state.loadTaxonomy);
  const loadNotes = useOmniNoteStore((state) => state.loadNotes);
  const selectNote = useOmniNoteStore((state) => state.selectNote);
  const setMarkdownDraft = useOmniNoteStore((state) => state.setMarkdownDraft);
  const setViewMode = useOmniNoteStore((state) => state.setViewMode);

  useEffect(() => {
    loadTaxonomy().catch(() => {
      // 忽略启动加载错误，sidebar 会展示提示。
    });
    loadNotes().catch(() => {
      // 关键业务逻辑：后端离线时仍允许查看本地示例数据，避免主界面空白。
    });
  }, [loadNotes, loadTaxonomy]);

  const categoryChildrenMap = useMemo(() => {
    const map = new Map<number, CategoryItem[]>();
    categories.forEach((category) => {
      if (category.parentId === null) return;
      const list = map.get(category.parentId) ?? [];
      list.push(category);
      map.set(category.parentId, list);
    });
    return map;
  }, [categories]);

  const selectedCategoryIds = useMemo(() => {
    if (selectedCategoryId === null) return null;
    const result = new Set<number>([selectedCategoryId]);
    const queue = [selectedCategoryId];
    while (queue.length) {
      const current = queue.shift();
      if (current === undefined) break;
      const children = categoryChildrenMap.get(current) ?? [];
      children.forEach((child) => {
        if (!result.has(child.id)) {
          result.add(child.id);
          queue.push(child.id);
        }
      });
    }
    return result;
  }, [selectedCategoryId, categoryChildrenMap]);

  // 关键业务逻辑：分类支持“父分类包含子分类”，标签为多选且与分类过滤叠加。
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const inCategory =
        selectedCategoryIds === null
          ? true
          : note.categoryId !== null && selectedCategoryIds.has(note.categoryId);
      if (!inCategory) return false;
      if (!selectedTagIds.length) return true;
      return selectedTagIds.every((tagId) => note.tagIds.includes(tagId));
    });
  }, [notes, selectedCategoryIds, selectedTagIds]);

  const categoryNameMap = useMemo(() => {
    return categories.reduce<Record<number, string>>((map, item) => {
      map[item.id] = item.name;
      return map;
    }, {});
  }, [categories]);

  const tagNameMap = useMemo(() => {
    return tags.reduce<Record<number, string>>((map, item) => {
      map[item.id] = item.name;
      return map;
    }, {});
  }, [tags]);

  useEffect(() => {
    if (!filteredNotes.length) {
      if (selectedNoteId !== null) selectNote(null);
      return;
    }
    const stillVisible = selectedNoteId
      ? filteredNotes.some((note) => note.id === selectedNoteId)
      : false;
    if (!stillVisible) {
      selectNote(filteredNotes[0].id);
    }
  }, [filteredNotes, selectedNoteId, selectNote]);

  const selectedNote =
    filteredNotes.find((note) => note.id === selectedNoteId) ||
    notes.find((note) => note.id === selectedNoteId) ||
    null;

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              智能笔记中心
            </h2>
            <p className="text-sm text-slate-500">上传后自动进入 AI 处理流水线并实时展示结果</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadNotes().catch(() => undefined)}
              disabled={uploadState.isUploading}
            >
              <RefreshCcw className="mr-1 h-3.5 w-3.5" />
              刷新
            </Button>
            <Button
              size="icon"
              variant={viewMode === "card" ? "default" : "outline"}
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <UploadDropzone />
      </header>

      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[360px_1fr]">
        <section className="overflow-auto border-r border-slate-200 bg-slate-50/70 p-4">
          {!filteredNotes.length ? (
            <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="text-center text-slate-500">
                <p className="mb-1 text-base font-medium">暂无匹配笔记</p>
                <p className="text-sm">可切换分类/标签，或上传文件创建新笔记</p>
              </div>
            </div>
          ) : viewMode === "card" ? (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isActive={selectedNoteId === note.id}
                  onClick={() => selectNote(note.id)}
                  categoryName={note.categoryId ? categoryNameMap[note.categoryId] : "未分类"}
                  tagNameMap={tagNameMap}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  isActive={selectedNoteId === note.id}
                  onClick={() => selectNote(note.id)}
                  categoryName={note.categoryId ? categoryNameMap[note.categoryId] : "未分类"}
                  tagNameMap={tagNameMap}
                />
              ))}
            </div>
          )}
        </section>

        <section className="overflow-auto bg-slate-50/60 p-4">
          <NoteDetailPanel
            note={selectedNote}
            markdown={selectedNote ? markdownDrafts[selectedNote.id] || "" : ""}
            onMarkdownChange={(value) => {
              if (!selectedNote) return;
              setMarkdownDraft(selectedNote.id, value);
            }}
          />
        </section>
      </div>
    </main>
  );
}

function NoteCard({
  note,
  isActive,
  onClick,
  categoryName,
  tagNameMap,
}: {
  note: NoteItem;
  isActive: boolean;
  onClick: () => void;
  categoryName: string;
  tagNameMap: Record<number, string>;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className={isActive ? "ring-2 ring-slate-300" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{note.title}</CardTitle>
            <span className="text-base">{mediaTypeIcon(note.mediaType)}</span>
          </div>
          <CardDescription className="line-clamp-2">{note.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-slate-500">分类：{categoryName}</p>
          <div className="flex flex-wrap gap-1">
            {note.tagIds.map((tagId) => (
              <Badge key={tagId} variant="secondary">
                {tagNameMap[tagId] ?? `标签#${tagId}`}
              </Badge>
            ))}
            {!note.tagIds.length && <Badge variant="outline">待自动打标</Badge>}
            {note.status !== "completed" && <Badge variant="outline">处理中</Badge>}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function NoteRow({
  note,
  isActive,
  onClick,
  categoryName,
  tagNameMap,
}: {
  note: NoteItem;
  isActive: boolean;
  onClick: () => void;
  categoryName: string;
  tagNameMap: Record<number, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left ${
        isActive ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <p className="line-clamp-1 text-sm font-medium text-slate-800">
          {mediaTypeIcon(note.mediaType)} {note.title}
        </p>
        <span className="text-xs text-slate-400">{categoryName}</span>
      </div>
      <p className="mb-2 line-clamp-1 text-sm text-slate-500">{note.summary}</p>
      <div className="flex flex-wrap gap-1">
        {note.tagIds.map((tagId) => (
          <Badge key={tagId} variant="secondary">
            {tagNameMap[tagId] ?? `标签#${tagId}`}
          </Badge>
        ))}
        {!note.tagIds.length && <Badge variant="outline">待自动打标</Badge>}
      </div>
    </button>
  );
}
