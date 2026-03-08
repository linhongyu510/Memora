"use client";

import { useRef } from "react";
import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOmniNoteStore } from "@/store/use-omninote-store";

export function UploadDropzone() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const upload = useOmniNoteStore((state) => state.upload);
  const setDragActive = useOmniNoteStore((state) => state.setDragActive);
  const ingestFiles = useOmniNoteStore((state) => state.ingestFiles);

  const handleFiles = (list: FileList | null) => {
    if (!list?.length) return;
    ingestFiles(Array.from(list));
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 transition-colors",
          upload.isDragging && "border-slate-500 bg-slate-100"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <UploadCloud className="h-4 w-4" />
            <span>拖拽文件到这里，或点击右侧按钮上传（支持多文件）</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isUploading}
          >
            选择文件
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-slate-700 transition-all"
            style={{ width: `${upload.progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">{upload.message}</p>
      </div>
    </div>
  );
}

