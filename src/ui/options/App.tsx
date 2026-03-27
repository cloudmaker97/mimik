import { useState, useEffect } from 'react';
import { localStorage } from '@/lib/browser-api';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.get(['aiApiKey', 'aiProvider']).then((result) => {
      if (result.aiApiKey) setApiKey(result.aiApiKey as string);
      if (result.aiProvider) setProvider(result.aiProvider as 'openai' | 'anthropic');
    });
  }, []);

  const handleSave = async () => {
    await localStorage.set({ aiApiKey: apiKey, aiProvider: provider });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Mimik Settings</h1>

      <div className="space-y-4">
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">
            AI Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your key is stored locally and never sent to any server except the AI provider.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2 px-4 bg-amber-600 text-white rounded-md font-medium hover:bg-amber-700 transition-colors text-sm"
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
