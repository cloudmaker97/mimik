import { useState, useEffect, useCallback } from 'react';
import { Video, Search } from 'lucide-react';
import { sendMessage } from '@/lib/messaging';
import { getActiveTab } from '@/lib/browser-api';
import LibraryView from './LibraryView';
import GuideEditor from './GuideEditor';
import RecordingView from './RecordingView';

type View =
  | { name: 'library' }
  | { name: 'editor'; guideId: string }
  | { name: 'recording'; guideId: string };

function MascotIcon({ size = 44 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <clipPath id="cc"><circle cx="100" cy="100" r="95"/></clipPath>
      </defs>
      <g clipPath="url(#cc)">
        <rect x="-50" y="-50" width="300" height="300" fill="#FDE68A"/>
        <rect x="30" y="-80" width="50" height="400" fill="#F59E0B" transform="rotate(45, 100, 100)" opacity="0.15"/>
        <rect x="90" y="-80" width="50" height="400" fill="#D97706" transform="rotate(45, 100, 100)" opacity="0.12"/>
        <rect x="-30" y="-80" width="50" height="400" fill="#FCD34D" transform="rotate(45, 100, 100)" opacity="0.15"/>
        <rect x="150" y="-80" width="50" height="400" fill="#FBBF24" transform="rotate(45, 100, 100)" opacity="0.1"/>
      </g>
      <rect x="30" y="95" width="140" height="68" rx="5" fill="#451a03"/>
      <path d="M30 95 L30 80 Q30 60, 100 60 Q170 60, 170 80 L170 95 Z" fill="#572508"/>
      <rect x="30" y="93" width="140" height="3" fill="#FDE68A"/>
      <path d="M68 122 Q76 112 84 122" stroke="#FDE68A" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M116 122 Q124 112 132 122" stroke="#FDE68A" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d="M84 138 Q100 148 116 138" stroke="#FDE68A" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export default function App() {
  const [isAlive, setIsAlive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [view, setView] = useState<View>({ name: 'library' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    sendMessage('ping', undefined).then(res => {
      if (res.alive) setIsAlive(true);
    }).catch(() => {});

    const interval = setInterval(() => {
      sendMessage('getState', undefined).then(res => {
        if (res.state === 'recording') {
          setIsRecording(true);
          if (res.currentGuideId) {
            setView(prev => {
              if (prev.name === 'recording') return prev;
              return { name: 'recording', guideId: res.currentGuideId! };
            });
          }
        } else {
          setIsRecording(false);
        }
      }).catch(() => {});
    }, 1000);

    return () => clearInterval(interval);
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
      console.error('[Mimik] START_RECORDING error', err);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    try {
      const res = await sendMessage('stopRecording', undefined);
      if (res.success) {
        setIsRecording(false);
        if (res.guideId) {
          setView({ name: 'editor', guideId: res.guideId });
        } else {
          setView({ name: 'library' });
        }
      }
    } catch (err) {
      console.error('[Mimik] STOP_RECORDING error', err);
    }
  }, []);

  if (view.name === 'recording') {
    return (
      <RecordingView
        guideId={view.guideId}
        onStop={handleStopRecording}
      />
    );
  }

  if (view.name === 'editor') {
    return (
      <GuideEditor
        guideId={view.guideId}
        onBack={() => setView({ name: 'library' })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Stripe-style gradient header */}
      <div className="relative overflow-hidden px-6 pt-6 pb-7" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' }}>
        {/* Glow accent */}
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full opacity-15 blur-[40px]" style={{ background: 'linear-gradient(135deg, #FDE68A, #fff)' }} />

        {/* Top bar */}
        <div className="relative flex items-center justify-between mb-6">
          <span className="text-[17px] font-bold tracking-tight" style={{ color: '#451a03' }}>Mimik</span>
          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${isAlive ? 'text-amber-900 bg-white/30' : 'text-amber-700/50 bg-white/15'}`}>
            {isAlive ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        {/* Mascot + message */}
        <div className="relative text-center mb-5">
          <div className="flex justify-center mb-2">
            <MascotIcon size={44} />
          </div>
          <h3 className="text-base font-medium" style={{ color: '#451a03' }}>What would you like to capture?</h3>
          <p className="text-xs mt-1" style={{ color: '#92400E' }}>Record any workflow automatically</p>
        </div>

        {/* Start Capture button */}
        <button
          onClick={handleStartRecording}
          disabled={!isAlive}
          className="relative w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-px"
          style={{ background: '#451a03', color: '#FDE68A', boxShadow: '0 4px 12px rgba(69,26,3,0.3)' }}
        >
          <Video size={18} />
          Start Capture
        </button>
      </div>

      {/* Body — white section */}
      <div className="flex-1 px-5 pt-5">
        {/* Search bar */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B5A48B' }} />
          <input
            type="text"
            placeholder="Search guides..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm rounded-lg outline-none transition-colors"
            style={{ border: '1px solid #E8E2DA', color: '#451a03', background: '#fff' }}
            onFocus={(e) => { e.target.style.borderColor = '#F59E0B'; }}
            onBlur={(e) => { e.target.style.borderColor = '#E8E2DA'; }}
          />
        </div>

        {/* Recent section label */}
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: '#92400E' }}>Recent</p>

        {/* Guide list */}
        <LibraryView
          onOpen={(guideId) => setView({ name: 'editor', guideId })}
          isAlive={isAlive}
          searchQuery={search}
        />
      </div>
    </div>
  );
}
