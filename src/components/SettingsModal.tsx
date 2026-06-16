import React, { useState, useEffect } from 'react';
import type { Language } from '../services/constants';
import { SUPPORTED_LANGUAGES } from '../services/constants';
import { getApiKey, setApiKey, removeApiKey } from '../services/gemini';
import { preloadVoices } from '../services/speech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLang: Language;
  listenerLang: Language;
  onChangeUserLang: (lang: Language) => void;
  onChangeListenerLang: (lang: Language) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userLang,
  listenerLang,
  onChangeUserLang,
  onChangeListenerLang,
}) => {
  const [apiKey, setApiKeyState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      setApiKeyState(getApiKey());
      preloadVoices().then(setVoices);
    }
  }, [isOpen]);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setSavedMessage('API key saved successfully!');
    } else {
      removeApiKey();
      setSavedMessage('API key removed.');
    }
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  if (!isOpen) return null;

  const indianVoices = voices.filter(
    (v) => v.lang.includes('IN') || v.lang.includes('in')
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose} id="close-settings">
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* Language settings */}
          <div className="settings-section">
            <h3>🌐 Languages</h3>
            <div className="setting-row">
              <label>Your Language</label>
              <select
                value={userLang.code}
                onChange={(e) => {
                  const lang = SUPPORTED_LANGUAGES.find(
                    (l) => l.code === e.target.value
                  );
                  if (lang) onChangeUserLang(lang);
                }}
                id="setting-user-lang"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
            <div className="setting-row">
              <label>Speaker's Language</label>
              <select
                value={listenerLang.code}
                onChange={(e) => {
                  const lang = SUPPORTED_LANGUAGES.find(
                    (l) => l.code === e.target.value
                  );
                  if (lang) onChangeListenerLang(lang);
                }}
                id="setting-listener-lang"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* API Key */}
          <div className="settings-section">
            <h3>🤖 Gemini AI</h3>
            <p className="settings-desc">
              Add your Gemini API key for real-time AI translations and
              context-aware smart replies. Without it, the app uses offline
              phrase database.
            </p>
            <div className="api-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="api-key-input"
                placeholder="Enter Gemini API Key..."
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                id="api-key-input"
              />
              <button
                className="toggle-key-btn"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <button
              className="save-key-btn"
              onClick={handleSaveKey}
              id="save-api-key"
            >
              💾 Save API Key
            </button>
            {savedMessage && (
              <span className="saved-message">{savedMessage}</span>
            )}
          </div>

          {/* Available voices info */}
          <div className="settings-section">
            <h3>🗣️ Available Indian Voices</h3>
            <p className="settings-desc">
              {indianVoices.length > 0
                ? `Found ${indianVoices.length} Indian language voice(s) on your device.`
                : 'No Indian voices found. Install language packs in your system settings for better text-to-speech.'}
            </p>
            {indianVoices.length > 0 && (
              <div className="voice-list">
                {indianVoices.slice(0, 10).map((voice, idx) => (
                  <span key={idx} className="voice-tag">
                    {voice.name} ({voice.lang})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          <div className="settings-section">
            <h3>🔄 Reset</h3>
            <button
              className="reset-btn"
              onClick={handleReset}
              id="reset-all-btn"
            >
              Reset All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
