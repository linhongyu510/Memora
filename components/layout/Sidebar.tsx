"use client";

/**
 * 左侧边栏 - 分类与标签的占位
 * Phase 2 将实现完整树形结构和拖拽排序
 */
export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* 标题区 */}
      <div className="border-b border-slate-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-800">OmniNote</h1>
        <p className="text-xs text-slate-500">智能知识库</p>
      </div>

      {/* 分类区域占位 */}
      <div className="flex-1 overflow-auto p-3">
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            分类
          </h2>
          <ul className="space-y-1">
            <li className="rounded-md px-2 py-1.5 text-sm text-slate-600">
              （分类列表占位 - Phase 2 实现）
            </li>
          </ul>
        </div>

        {/* 标签区域占位 */}
        <div>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            标签
          </h2>
          <ul className="space-y-1">
            <li className="rounded-md px-2 py-1.5 text-sm text-slate-600">
              （标签列表占位 - Phase 2 实现）
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
