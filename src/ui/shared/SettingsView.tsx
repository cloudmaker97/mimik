import { ArrowLeft, Check, EyeOff, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PRESET_LABELS, type PresetKey } from '@/core/blur/regexes';
import { AI_PROVIDERS, type AIProviderKey } from '@/core/capture/ai/models';
import { localStorage } from '@/lib/browser-api';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';

interface SettingsViewProps {
  onBack?: () => void;
}

export default function SettingsView({ onBack }: SettingsViewProps) {
  const [provider, setProvider] = useState<AIProviderKey>('openai');
  const [model, setModel] = useState(AI_PROVIDERS.openai.defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [blurPresets, setBlurPresets] = useState<Record<PresetKey, boolean>>({
    email: true,
    phone: true,
    ssn: false,
    creditCard: false,
    ipAddress: false,
    macAddress: false,
  });
  const [blurAiEnabled, setBlurAiEnabled] = useState(false);

  useEffect(() => {
    localStorage.get(['aiApiKey', 'aiProvider', 'aiModel', 'blurPresets', 'blurAiEnabled']).then((result) => {
      const p = (result.aiProvider as AIProviderKey) || 'openai';
      setProvider(p);
      setModel((result.aiModel as string) || AI_PROVIDERS[p].defaultModel);
      if (result.aiApiKey) setApiKey(result.aiApiKey as string);
      if (result.blurPresets) setBlurPresets(result.blurPresets as Record<PresetKey, boolean>);
      if (result.blurAiEnabled) setBlurAiEnabled(result.blurAiEnabled as boolean);
    });
  }, []);

  const handleProviderChange = (newProvider: AIProviderKey) => {
    setProvider(newProvider);
    setModel(AI_PROVIDERS[newProvider].defaultModel);
  };

  const handleSave = async () => {
    await localStorage.set({ aiApiKey: apiKey, aiProvider: provider, aiModel: model, blurPresets, blurAiEnabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providerConfig = AI_PROVIDERS[provider];

  return (
    <div className="bg-card flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        {onBack && (
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <h1 className="text-[15px] font-bold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">AI Provider</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as AIProviderKey)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
          >
            {Object.entries(AI_PROVIDERS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-card font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
          >
            {providerConfig.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">API Key</label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Used for generating step descriptions automatically.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saved}
          className="w-full transition-all duration-300"
          style={saved ? { backgroundColor: '#2d5a27', color: '#d4edda', opacity: 0.9 } : undefined}
        >
          {saved && <Check size={16} />}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>

        <div className="border-t border-border pt-5">
          <div className="flex items-center gap-2 mb-4">
            <EyeOff size={14} className="text-foreground" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">Smart Blur</h2>
          </div>

          <div className="space-y-3">
            {(Object.entries(PRESET_LABELS) as [PresetKey, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{label}</span>
                <button
                  onClick={() => setBlurPresets((prev) => ({ ...prev, [key]: !prev[key] }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${
                    blurPresets[key] ? 'bg-amber' : 'bg-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      blurPresets[key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[13px] font-medium text-foreground">AI Detection</span>
              <button
                onClick={() => setBlurAiEnabled((prev) => !prev)}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  blurAiEnabled ? 'bg-amber' : 'bg-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                    blurAiEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-secondary text-[10px] text-muted-foreground leading-relaxed">
          <Shield size={12} className="shrink-0 mt-0.5 text-violet" />
          <span>
            Your API key is stored locally and only sent to the selected AI provider. No data leaves your browser
            otherwise.
          </span>
        </div>
      </div>
    </div>
  );
}
