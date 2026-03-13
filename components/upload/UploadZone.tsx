"use client";

import { useCallback, useState } from "react";
import { useStore } from "@/store/useStore";

/**
 * 多文件拖拽上传区域
 */
export function UploadZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    uploadFiles,
    isUploading,
    uploadProgress,
    uploadError,
    clearUploadError,
  } = useStore();

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || isUploading) return;
      await uploadFiles(files);
    },
    [uploadFiles, isUploading]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  return (
    <div className="space-y-2">
      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed 
          px-4 py-6 transition-colors
          ${isDragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"}
          ${isUploading ? "cursor-not-allowed opacity-70" : ""}
        `}
      >
        <input
          type="file"
          className="hidden"
          onChange={onInputChange}
          disabled={isUploading}
          multiple
          accept=".txt,.md,.pdf,.docx,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.mp4,.webm"
        />
        {isUploading ? (
          <div className="w-full max-w-xs space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-600">处理中...</p>
          </div>
        ) : (
          <>
            <span className="mb-1 text-3xl">📤</span>
            <p className="text-sm font-medium text-slate-600">
              拖拽文件到此处或点击上传
            </p>
            <p className="text-xs text-slate-500">
              支持 txt、pdf、docx、图片、音视频
            </p>
          </>
        )}
      </label>
      {uploadError && (
        <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={clearUploadError}
            className="text-red-500 hover:underline"
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}
