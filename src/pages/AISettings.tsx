import { useState } from "react";
import { usePreferences } from "@/settings/preferences";
import { cn } from "@/lib/utils";

export default function AISettings() {
  const { preferences, updatePreferences } = usePreferences();
  const [apiKey, setApiKey] = useState(preferences.aiApiKey || "");
  const [provider, setProvider] = useState(preferences.aiProvider || "openai");
  const [isEnabled, setIsEnabled] = useState(preferences.aiEnabled || false);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updatePreferences({
      aiApiKey: apiKey,
      aiProvider: provider as "openai" | "anthropic" | "custom",
      aiEnabled: isEnabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providers = [
    { value: "openai", label: "OpenAI", placeholder: "sk-..." },
    { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
    { value: "custom", label: "自定义 API", placeholder: "API Key" },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <div className="sticky top-0 z-10 flex h-11 items-center justify-between border-b border-border bg-surface px-4">
        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-hover-overlay"
          onClick={() => window.history.back()}
        >
          ←
        </button>
        <h1 className="text-sm font-semibold text-text">AI 设置</h1>
        <div className="w-8" />
      </div>

      <div className="px-4 py-4">
        <div className="mb-6 rounded-[12px] border border-border bg-surface-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-text">启用 AI 功能</span>
            <button
              type="button"
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                isEnabled ? "bg-primary" : "bg-surface-muted"
              )}
              onClick={() => setIsEnabled(!isEnabled)}
            >
              <span
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  isEnabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          <p className="text-xs text-text-muted">
            启用后，系统会自动尝试从您的消息中识别安排并生成草稿
          </p>
        </div>

        <div className="mb-6 rounded-[12px] border border-border bg-surface-card p-4">
          <h3 className="mb-4 text-sm font-medium text-text">API 提供商</h3>
          <div className="flex flex-col gap-2">
            {providers.map((p) => (
              <button
                key={p.value}
                type="button"
                className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition",
                  provider === p.value
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setProvider(p.value)}
              >
                <span className="text-sm text-text">{p.label}</span>
                {provider === p.value && (
                  <span className="h-5 w-5 flex items-center justify-center rounded-full bg-primary text-white">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-[12px] border border-border bg-surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text">API Key</label>
            <button
              type="button"
              className="text-xs text-primary"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={providers.find((p) => p.value === provider)?.placeholder || "输入您的 API Key"}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          {provider === "openai" && (
            <p className="mt-2 text-xs text-text-muted">
              您可以在 <a href="https://platform.openai.com/api-keys" className="text-primary">OpenAI Platform</a> 获取 API Key
            </p>
          )}
        </div>

        <div className="mb-6 rounded-[12px] border border-border bg-surface-card p-4">
          <h3 className="mb-2 text-sm font-medium text-text">使用说明</h3>
          <ul className="space-y-2 text-xs text-text-muted">
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">1</span>
              <span>发送消息给自己时，AI 会尝试识别安排</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">2</span>
              <span>识别成功后会生成安排草稿，您可以确认或忽略</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">3</span>
              <span>支持识别日期、时间、地点、人物等信息</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className={cn(
            "w-full rounded-lg px-4 py-3 text-sm font-medium transition",
            saved
              ? "bg-success text-white"
              : "bg-primary text-white hover:bg-primary-dark"
          )}
          onClick={handleSave}
        >
          {saved ? "已保存" : "保存设置"}
        </button>
      </div>
    </div>
  );
}
