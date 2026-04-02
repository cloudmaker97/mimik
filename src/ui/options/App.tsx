import SettingsView from '@/ui/shared/SettingsView';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        background: 'radial-gradient(ellipse at center, #fffdf8 0%, #f5f0e8 60%, #ede5d8 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #E8E2DA',
          boxShadow: '0 8px 40px rgba(69,26,3,0.08)',
          overflow: 'hidden',
        }}
      >
        <SettingsView />
      </div>
    </div>
  );
}
