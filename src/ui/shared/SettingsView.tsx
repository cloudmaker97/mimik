import { ArrowLeft, Check, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    localStorage.get(['aiApiKey', 'aiProvider', 'aiModel']).then((result) => {
      const p = (result.aiProvider as AIProviderKey) || 'openai';
      setProvider(p);
      setModel((result.aiModel as string) || AI_PROVIDERS[p].defaultModel);
      if (result.aiApiKey) setApiKey(result.aiApiKey as string);
    });
  }, []);

  const handleProviderChange = (newProvider: AIProviderKey) => {
    setProvider(newProvider);
    setModel(AI_PROVIDERS[newProvider].defaultModel);
  };

  const handleSave = async () => {
    await localStorage.set({ aiApiKey: apiKey, aiProvider: provider, aiModel: model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providerConfig = AI_PROVIDERS[provider];

  return (
    <div className="bg-card flex flex-col">
      {/* Header */}
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

      {/* Body */}
      <div className="flex-1 px-4 py-5 space-y-5">
        {/* Provider */}
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

        {/* Model */}
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

        {/* API Key */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">API Key</label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Used for generating step descriptions automatically.
          </p>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={saved}
          className="w-full transition-all duration-300"
          style={saved ? { backgroundColor: '#2d5a27', color: '#d4edda', opacity: 0.9 } : undefined}
        >
          {saved && <Check size={16} />}
          {saved ? 'Saved' : 'Save Settings'}
        </Button>

        {/* Privacy note */}
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
