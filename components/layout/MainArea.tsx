"use client";

import { LayoutGrid, List } from "lucide-react";
import { useMemo } from "react";

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
  const viewMode = useOmniNoteStore((state) => state.viewMode);
  const setViewMode = useOmniNoteStore((state) => state.setViewMode);

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

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium text-slate-700">笔记</h2>
            <p className="text-sm text-slate-500">上传后将进入 AI 后台处理流程（Phase 2 Mock）</p>
          </div>
          <div className="flex gap-2">
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

      <div className="flex-1 overflow-auto p-6">
        {!filteredNotes.length ? (
          <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50">
            <div className="text-center text-slate-500">
              <p className="mb-1 text-base font-medium">暂无匹配笔记</p>
              <p className="text-sm">可切换分类/标签，或上传文件创建新笔记</p>
            </div>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
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
                categoryName={note.categoryId ? categoryNameMap[note.categoryId] : "未分类"}
                tagNameMap={tagNameMap}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function NoteCard({
  note,
  categoryName,
  tagNameMap,
}: {
  note: NoteItem;
  categoryName: string;
  tagNameMap: Record<number, string>;
}) {
  return (
    <Card>
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
  );
}

function NoteRow({
  note,
  categoryName,
  tagNameMap,
}: {
  note: NoteItem;
  categoryName: string;
  tagNameMap: Record<number, string>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
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
    </div>
  );
}
