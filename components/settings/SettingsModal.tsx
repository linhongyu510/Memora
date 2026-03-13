"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X, KeyRound, Globe, Bot } from "lucide-react";
import {
  fetchSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from "@/lib/api";

const MODEL_SUGGESTIONS = [
  "qwen3.5-plus",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "deepseek-chat",
];

function Field({
  label,
  icon,
  hint,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {icon}
        {label}
      </span>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}

export function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [apiBase, setApiBase] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const data = await fetchSystemSettings();
        if (cancelled) {
          return;
        }
        setSettings(data);
        setApiBase(data.llm_api_base ?? "");
        setModel(data.llm_model ?? "");
        setApiKey("");
        setClearApiKey(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "获取系统设置失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateSystemSettings({
        llm_api_base: apiBase,
        llm_model: model,
        llm_api_key: apiKey || null,
        clear_llm_api_key: clearApiKey,
      });
      setSettings(updated);
      setApiKey("");
      setClearApiKey(false);
      setSuccess("系统设置已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存系统设置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-white/60 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">System Settings</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">模型与 API 配置</h2>
            <p className="mt-2 text-sm text-slate-500">
              配置会优先存入数据库，摘要服务会先读取这里，再回退到 `.env`。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭设置"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              读取系统设置中...
            </div>
          ) : (
            <>
              <Field
                label="API Base URL"
                icon={<Globe className="h-4 w-4 text-slate-400" />}
                hint="例如 https://api.openai.com/v1 或 DashScope/OpenAI 兼容网关地址。"
              >
                <input
                  type="url"
                  value={apiBase}
                  onChange={(event) => setApiBase(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="https://api.openai.com/v1"
                />
              </Field>

              <Field
                label="模型名称"
                icon={<Bot className="h-4 w-4 text-slate-400" />}
                hint="可直接输入自定义模型名，也可以从建议值中选择。"
              >
                <input
                  list="memora-model-suggestions"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder="qwen3.5-plus"
                />
                <datalist id="memora-model-suggestions">
                  {MODEL_SUGGESTIONS.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </Field>

              <Field
                label="API Key"
                icon={<KeyRound className="h-4 w-4 text-slate-400" />}
                hint={
                  settings?.llm_api_key_set
                    ? `当前已保存：${settings.llm_api_key_masked ?? "已设置"}。留空表示保持不变。`
                    : "当前数据库中尚未保存 API Key。"
                }
              >
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    if (event.target.value) {
                      setClearApiKey(false);
                    }
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder={settings?.llm_api_key_set ? "输入新 Key 以覆盖" : "sk-..."}
                />
              </Field>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={clearApiKey}
                  onChange={(event) => {
                    setClearApiKey(event.target.checked);
                    if (event.target.checked) {
                      setApiKey("");
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                清空数据库中已保存的 API Key
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  关闭
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存设置
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
