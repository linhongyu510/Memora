"use client";

import { ChevronRight, FolderPlus, Tag as TagIcon } from "lucide-react";
import { Fragment, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOmniNoteStore } from "@/store/use-omninote-store";

/**
 * 左侧边栏 - 分类树 + 标签筛选
 */
export function Sidebar() {
  const categories = useOmniNoteStore((state) => state.categories);
  const tags = useOmniNoteStore((state) => state.tags);
  const selectedCategoryId = useOmniNoteStore((state) => state.selectedCategoryId);
  const selectedTagIds = useOmniNoteStore((state) => state.selectedTagIds);
  const selectCategory = useOmniNoteStore((state) => state.selectCategory);
  const toggleTag = useOmniNoteStore((state) => state.toggleTag);
  const clearTagFilter = useOmniNoteStore((state) => state.clearTagFilter);
  const addCategory = useOmniNoteStore((state) => state.addCategory);
  const addTag = useOmniNoteStore((state) => state.addTag);

  const rootCategories = useMemo(
    () => categories.filter((item) => item.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const childMap = useMemo(() => {
    const map = new Map<number, typeof categories>();
    categories.forEach((category) => {
      if (category.parentId === null) return;
      const list = map.get(category.parentId) ?? [];
      list.push(category);
      map.set(category.parentId, list);
    });
    map.forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [categories]);

  const handleAddCategory = (parentId: number | null = null) => {
    const name = window.prompt("请输入分类名称");
    if (!name?.trim()) return;
    addCategory(name.trim(), parentId);
  };

  const handleAddTag = () => {
    const name = window.prompt("请输入标签名称");
    if (!name?.trim()) return;
    addTag(name.trim());
  };

  const renderCategoryTree = (categoryId: number, depth = 0): JSX.Element => {
    const current = categories.find((item) => item.id === categoryId);
    if (!current) return <Fragment key={categoryId} />;
    const children = childMap.get(categoryId) ?? [];

    return (
      <Fragment key={current.id}>
        <button
          className={cn(
            "flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            selectedCategoryId === current.id
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => selectCategory(current.id)}
          type="button"
        >
          <ChevronRight className="h-3 w-3 opacity-70" />
          <span className="truncate">{current.name}</span>
        </button>
        {children.map((child) => renderCategoryTree(child.id, depth + 1))}
      </Fragment>
    );
  };

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* 标题区 */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-800">OmniNote</h1>
        <p className="text-xs text-slate-500">智能知识库</p>
      </div>

      {/* 分类树 */}
      <div className="flex-1 overflow-auto p-3">
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">分类</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleAddCategory(null)}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className={cn(
                "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                selectedCategoryId === null
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              全部笔记
            </button>
            {rootCategories.map((category) => renderCategoryTree(category.id))}
          </div>
        </div>

        {/* 标签筛选 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">标签</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddTag}>
              <TagIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}>
                  <Badge
                    variant={selected ? "default" : "outline"}
                    className={cn(selected ? "" : "text-slate-600")}
                    style={{ borderColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={clearTagFilter}
            disabled={selectedTagIds.length === 0}
          >
            清空标签筛选
          </Button>
        </div>
      </div>
    </aside>
  );
}
