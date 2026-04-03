import { Search, Settings, Video } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { browser } from '#imports';
import { CaptureState } from '@/core/capture/machine';
import type { GuideMeSession } from '@/core/guideme/session';
import { SESSION_KEY } from '@/core/guideme/session';
import { createTab, focusWindow, getActiveTab, getExtensionURL, queryTabs, updateTab } from '@/lib/browser-api';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/messaging';
import { connectToBackground } from '@/lib/port';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import SettingsView from '@/ui/shared/SettingsView';
import GuideEditor from './GuideEditor';
import GuideMeCompletion from './GuideMeCompletion';
import GuideMeView from './GuideMeView';
import LibraryView from './LibraryView';
import RecordingView from './RecordingView';

type View =
  | { name: 'library' }
  | { name: 'editor'; guideId: string }
  | { name: 'recording'; guideId: string }
  | { name: 'settings' }
  | { name: 'guideme'; guideId: string }
  | { name: 'guideme-done'; guideId: string };

function MascotIcon({ size = 44 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <clipPath id="cc">
          <circle cx="100" cy="100" r="95" />
        </clipPath>
      </defs>
      <g clipPath="url(#cc)">
        <rect x="-50" y="-50" width="300" height="300" className="fill-gold" />
        <rect
          x="30"
          y="-80"
          width="50"
          height="400"
          className="fill-accent"
          transform="rotate(45, 100, 100)"
          opacity="0.15"
        />
        <rect x="90" y="-80" width="50" height="400" fill="#D97706" transform="rotate(45, 100, 100)" opacity="0.12" />
        <rect x="-30" y="-80" width="50" height="400" fill="#FCD34D" transform="rotate(45, 100, 100)" opacity="0.15" />
        <rect
          x="150"
          y="-80"
          width="50"
          height="400"
          className="fill-amber-light"
          transform="rotate(45, 100, 100)"
          opacity="0.1"
        />
      </g>
      <rect x="30" y="95" width="140" height="68" rx="5" className="fill-primary" />
      <path d="M30 95 L30 80 Q30 60, 100 60 Q170 60, 170 80 L170 95 Z" className="fill-brown-dark" />
      <rect x="30" y="93" width="140" height="3" className="fill-gold" />
      <path d="M68 122 Q76 112 84 122" className="stroke-gold" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M116 122 Q124 112 132 122" className="stroke-gold" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M84 138 Q100 148 116 138" className="stroke-gold" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [isAlive, setIsAlive] = useState(false);
  const [_isRecording, setIsRecording] = useState(false);
  const [view, setView] = useState<View>({ name: 'library' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const disconnect = connectToBackground({
      onConnect: () => setIsAlive(true),
      onDisconnect: () => setIsAlive(false),
      onStateUpdate: (update) => {
        if (update.state === CaptureState.RECORDING) {
          setIsRecording(true);
        } else {
          setIsRecording(false);
        }
      },
    });

    return disconnect;
  }, []);

  useEffect(() => {
    browser.storage.local.get([SESSION_KEY]).then((data: Record<string, unknown>) => {
      const session = data[SESSION_KEY] as GuideMeSession | null;
      if (session?.active) {
        setView({ name: 'guideme', guideId: session.guideId });
      }
    });
  }, []);

  const handleStartRecording = useCallback(async () => {
    const tab = await getActiveTab();
    const url = tab?.url || '';

    try {
      const res = await sendMessage('startRecording', { url });
      if (res.guideId) {
        setIsRecording(true);
        setView({ name: 'recording', guideId: res.guideId });
      }
    } catch (err) {
      logger.error(' START_RECORDING error', err);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    try {
      const res = await sendMessage('stopRecording', undefined);
      if (res.success) {
        setIsRecording(false);
        setView({ name: 'library' });
        if (res.guideId) {
          const url = getExtensionURL(`/fullview.html?guideId=${res.guideId}`);
          const tabs = await queryTabs({ url: getExtensionURL('/fullview.html') });
          if (tabs.length > 0 && tabs[0].id) {
            await updateTab(tabs[0].id, { active: true, url });
            if (tabs[0].windowId) await focusWindow(tabs[0].windowId);
          } else {
            await createTab({ url });
          }
        }
      }
    } catch (err) {
      logger.error(' STOP_RECORDING error', err);
    }
  }, []);

  if (view.name === 'recording') {
    return <RecordingView guideId={view.guideId} onStop={handleStopRecording} />;
  }

  if (view.name === 'guideme') {
    return (
      <GuideMeView
        guideId={view.guideId}
        onExit={() => {
          sendMessage('guideMeCancel', undefined).catch(() => {});
          setView({ name: 'library' });
        }}
        onComplete={(id) => setView({ name: 'guideme-done', guideId: id })}
      />
    );
  }

  if (view.name === 'guideme-done') {
    return (
      <GuideMeCompletion
        guideId={view.guideId}
        onDone={() => setView({ name: 'library' })}
        onRunAgain={async (id) => {
          await sendMessage('startGuideMe', { guideId: id });
          setView({ name: 'guideme', guideId: id });
        }}
      />
    );
  }

  if (view.name === 'editor') {
    return (
      <GuideEditor
        guideId={view.guideId}
        onBack={() => setView({ name: 'library' })}
        onGuideMe={(id) => setView({ name: 'guideme', guideId: id })}
      />
    );
  }

  if (view.name === 'settings') {
    return <SettingsView onBack={() => setView({ name: 'library' })} />;
  }

  return (
    <div className="min-h-screen bg-card flex flex-col">
      {/* Header */}
      <div className="relative overflow-hidden px-6 pt-6 pb-7 bg-gradient-to-br from-amber to-amber-light">
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full opacity-15 blur-[40px] bg-gradient-to-br from-gold to-white" />

        <div className="relative flex items-center justify-between mb-6">
          <span className="text-[17px] font-bold tracking-tight text-foreground">Mimik</span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${isAlive ? 'text-foreground bg-white/30' : 'text-brown/50 bg-white/15'}`}
            >
              {isAlive ? 'Connected' : 'Connecting...'}
            </span>
            <button
              onClick={() => setView({ name: 'settings' })}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-white/20 transition-colors"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        <div className="relative text-center mb-5">
          <div className="flex justify-center mb-2">
            <MascotIcon size={44} />
          </div>
          <h3 className="text-base font-medium text-foreground">What would you like to capture?</h3>
          <p className="text-xs mt-1 text-amber-dark">Record any workflow automatically</p>
        </div>

        <Button
          onClick={handleStartRecording}
          disabled={!isAlive}
          className="w-full py-3 px-4 h-auto rounded-lg font-semibold text-sm hover:-translate-y-px shadow-lg"
        >
          <Video size={18} />
          Start Capture
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 px-5 pt-5">
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm" />
          <Input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 rounded-xl border-border bg-card !text-[13px]"
          />
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 text-muted-foreground">Recent</p>

        <LibraryView
          onOpen={(guideId) => setView({ name: 'editor', guideId })}
          isAlive={isAlive}
          searchQuery={search}
        />
      </div>
    </div>
  );
}
