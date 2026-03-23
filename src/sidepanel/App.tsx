import { useState, useEffect, useCallback } from 'react';

export default function App() {
  const [isAlive, setIsAlive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stepCount, setStepCount] = useState(0);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      if (response?.alive) setIsAlive(true);
    });

    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (response?.state === 'recording') {
          setIsRecording(true);
          if (response.stepCount !== undefined) {
            setStepCount(response.stepCount);
          }
        } else {
          setIsRecording(false);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStartRecording = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url || '';

    chrome.runtime.sendMessage(
      { type: 'START_RECORDING', url },
      (response) => {
        if (response?.guideId) {
          setIsRecording(true);
          setStepCount(0);
        }
      }
    );
  }, []);

  const handleStopRecording = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
      if (response?.success) {
        setIsRecording(false);
        setStepCount(0);
      }
    });
  }, []);

  return (
    <div className="p-4 min-h-screen bg-white">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Mimik</h1>
      <p className="text-sm text-gray-600 mb-2">
        Auto-capture browser workflows into step-by-step guides.
      </p>
      <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs text-gray-500">
          Service Worker: {isAlive ? 'Connected' : '... Connecting'}
        </p>
        {isRecording && (
          <p className="text-xs text-red-600 mt-1 font-medium">
            Recording... {stepCount} step{stepCount !== 1 ? 's' : ''} captured
          </p>
        )}
      </div>

      {!isRecording ? (
        <button
          onClick={handleStartRecording}
          className="mt-4 w-full py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          disabled={!isAlive}
        >
          Start Recording
        </button>
      ) : (
        <button
          onClick={handleStopRecording}
          className="mt-4 w-full py-2 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Stop Recording
        </button>
      )}
    </div>
  );
}
