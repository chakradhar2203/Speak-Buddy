import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Language } from '../services/constants';
import {
  startListening,
  stopListening,
  speakText,
  cancelSpeech,
  isSpeechRecognitionSupported,
} from '../services/speech';
import { translateText, getApiKey } from '../services/gemini';

interface DeafModeProps {
  userLang: Language;
  listenerLang: Language;
}

interface TranscriptEntry {
  id: number;
  original: string;
  translated: string;
  timestamp: Date;
}

const DeafMode: React.FC<DeafModeProps> = ({ userLang, listenerLang }) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const entryIdRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [entries]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const handleTranslate = useCallback(
    async (text: string) => {
      const apiKey = getApiKey();
      let translated = text;

      if (apiKey) {
        translated = await translateText(
          text,
          listenerLang.code,
          userLang.code,
          apiKey
        );
      } else {
        // Without API key, show a note
        translated = `[${userLang.name} translation requires API key] ${text}`;
      }

      const newEntry: TranscriptEntry = {
        id: ++entryIdRef.current,
        original: text,
        translated,
        timestamp: new Date(),
      };

      setEntries((prev) => [...prev, newEntry]);
    },
    [userLang, listenerLang]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      // Process any remaining transcript
      if (currentTranscript.trim()) {
        handleTranslate(currentTranscript.trim());
        setCurrentTranscript('');
      }
    } else {
      setError('');
      setCurrentTranscript('');
      setIsListening(true);

      startListening(
        listenerLang.bcp47,
        (result) => {
          if (result.isFinal) {
            handleTranslate(result.transcript.trim());
            setCurrentTranscript('');
          } else {
            setCurrentTranscript(result.transcript);
          }
        },
        (err) => {
          setError(err);
          setIsListening(false);
        },
        () => {
          // On end, restart if still should be listening
          setIsListening(false);
        }
      );
    }
  }, [isListening, currentTranscript, handleTranslate, listenerLang]);

  const handlePlayTranslation = async (text: string) => {
    cancelSpeech();
    setIsSpeaking(true);
    await speakText(text, userLang.bcp47, 0.85, () => setIsSpeaking(false));
  };

  const supported = isSpeechRecognitionSupported();

  return (
    <div className="deaf-mode">
      {/* Info banner */}
      <div className="mode-info">
        <span className="info-icon">👂</span>
        <div>
          <strong>Listening Mode</strong>
          <p>
            Listening in <strong>{listenerLang.nativeName}</strong> → translating
            to <strong>{userLang.nativeName}</strong>
          </p>
        </div>
      </div>

      {/* Waveform visualization */}
      <div className={`waveform-container ${isListening ? 'active' : ''}`}>
        <div className="waveform">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                animationDelay: `${i * 0.05}s`,
                height: isListening ? undefined : '4px',
              }}
            />
          ))}
        </div>
        {currentTranscript && (
          <div className="live-transcript">
            <span className="live-dot"></span>
            {currentTranscript}
          </div>
        )}
      </div>

      {/* Live Translation Display - Hero Card */}
      <div className={`live-translation-display ${isListening ? 'active' : ''} ${entries.length > 0 ? 'has-content' : ''}`}>
        {entries.length === 0 && !isListening && !currentTranscript ? (
          <div className="ltd-empty">
            <span className="ltd-empty-icon">🎙️</span>
            <p className="ltd-empty-title">Tap the microphone to start listening</p>
            <p className="ltd-empty-sub">Translated text will appear here in large, readable text</p>
          </div>
        ) : (
          <>
            {/* Show latest translated entry */}
            {entries.length > 0 && (
              <div className="ltd-content fade-in">
                <div className="ltd-original-row">
                  <span className="ltd-lang-badge">{listenerLang.nativeName}</span>
                  <p className="ltd-original-text">{entries[entries.length - 1].original}</p>
                </div>
                <div className="ltd-divider">
                  <span className="ltd-arrow">⬇</span>
                  <span className="ltd-label">Translated</span>
                  <span className="ltd-arrow">⬇</span>
                </div>
                <div className="ltd-translated-row">
                  <span className="ltd-lang-badge highlight">{userLang.nativeName}</span>
                  <p className="ltd-translated-text">{entries[entries.length - 1].translated}</p>
                </div>
                <div className="ltd-actions">
                  <button
                    className="ltd-play-btn"
                    onClick={() => handlePlayTranslation(entries[entries.length - 1].translated)}
                    disabled={isSpeaking}
                    id="ltd-play-btn"
                  >
                    {isSpeaking ? '⏳ Playing...' : '🔊 Play in Hearing Aid'}
                  </button>
                  <span className="ltd-time">
                    {entries[entries.length - 1].timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            {/* Show real-time interim text while listening */}
            {isListening && currentTranscript && (
              <div className="ltd-interim fade-in">
                <span className="ltd-interim-dot"></span>
                <p className="ltd-interim-text">{currentTranscript}</p>
              </div>
            )}

            {/* Listening but no speech yet */}
            {isListening && !currentTranscript && entries.length === 0 && (
              <div className="ltd-waiting">
                <span className="ltd-waiting-icon">👂</span>
                <p>Listening... speak now</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transcript History */}
      <div className="transcript-feed" ref={feedRef}>
        {entries.length > 1 && (
          <h4 className="history-title">📜 Conversation History</h4>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="transcript-entry fade-in">
            <div className="entry-original">
              <span className="entry-lang">{listenerLang.nativeName}</span>
              <p>{entry.original}</p>
            </div>
            <div className="entry-arrow">→</div>
            <div className="entry-translated">
              <span className="entry-lang">{userLang.nativeName}</span>
              <p>{entry.translated}</p>
              <button
                className="play-btn"
                onClick={() => handlePlayTranslation(entry.translated)}
                disabled={isSpeaking}
                title="Play in hearing aid"
              >
                {isSpeaking ? '⏳' : '🔊'} Play
              </button>
            </div>
            <span className="entry-time">
              {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && <div className="error-banner">{error}</div>}

      {/* Mic button */}
      <div className="mic-container">
        {!supported ? (
          <div className="error-banner">
            Speech recognition is not supported. Please use Chrome or Edge.
          </div>
        ) : (
          <button
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            id="mic-toggle-btn"
          >
            <span className="mic-icon">{isListening ? '⏹️' : '🎙️'}</span>
            <span className="mic-label">
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default DeafMode;
