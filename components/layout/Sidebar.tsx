"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Layout,
  Clock,
  Sparkles,
  FolderClosed,
  Hash,
  Settings,
  Loader2,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { SettingsModal } from "@/components/settings/SettingsModal";

function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-all ${
        active
          ? "bg-white font-medium text-indigo-600 shadow-sm"
          : "text-slate-600 hover:bg-slate-200/50"
      }`}
    >
      <div className="flex items-center gap-3">{icon} <span className="text-sm">{label}</span></div>
      {badge && (
        <span className="rounded bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
          {badge}
        </span>
      )}
    </div>
  );
}

export function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    categories,
    tags,
    loading,
    loadCategories,
    loadTags,
    selectedCategoryId,
    selectCategory,
    isUploading,
    uploadFiles,
  } = useStore();

  useEffect(() => {
    loadCategories();
    loadTags();
  }, [loadCategories, loadTags]);

  return (
    <aside className="flex w-full flex-shrink-0 flex-col border-b border-slate-200 bg-white/70 backdrop-blur-sm lg:h-full lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-5 pb-2 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-sm">
          O
        </div>
        <span className="bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-xl font-bold text-transparent">
          Memora
        </span>
      </div>
      <p className="px-5 text-sm text-slate-500">
        把文档、截图和音视频整理成可搜索的知识卡片。
      </p>

      <div className="px-4 pb-4">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.mp4,.webm"
          multiple
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length && !isUploading) {
              uploadFiles(files);
              e.target.value = "";
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />
          新建 / 上传
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3">
        <div className="space-y-1">
          <NavItem icon={<Layout className="h-4 w-4" />} label="全部笔记" active={selectedCategoryId === null} onClick={() => selectCategory(null)} />
          <NavItem icon={<Clock className="h-4 w-4 text-slate-400" />} label="最近处理" />
          <NavItem icon={<Sparkles className="h-4 w-4 text-slate-400" />} label="AI 智能分类" badge="新" />
        </div>

        <div>
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            分类 (Categories)
          </div>
          {loading.categories ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="space-y-1">
              <div
                onClick={() => selectCategory(null)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-200/50 ${
                  selectedCategoryId === null ? "bg-slate-200/70 font-medium" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderClosed className="h-4 w-4 text-slate-400" />
                  <span>全部</span>
                </div>
              </div>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-200/50 ${
                    selectedCategoryId === cat.id ? "bg-slate-200/70 font-medium" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderClosed className="h-4 w-4 text-slate-400" />
                    <span>{cat.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            标签 (Tags)
          </div>
          {loading.tags ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 px-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex cursor-pointer items-center rounded-md bg-slate-200/60 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-300"
                  style={{ backgroundColor: `${tag.color || "#3B82F6"}20`, color: tag.color || "#3B82F6" }}
                >
                  <Hash className="mr-1 h-3 w-3 opacity-50" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-slate-600 transition-colors hover:bg-slate-200/50"
        >
          <Settings className="h-5 w-5" />
          <span className="text-sm font-medium">系统设置</span>
        </button>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}
