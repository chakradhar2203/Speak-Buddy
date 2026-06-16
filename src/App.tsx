import { useState, useEffect } from 'react';
import type { Language } from './services/constants';
import { SUPPORTED_LANGUAGES } from './services/constants';
import { preloadVoices } from './services/speech';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import DeafMode from './components/DeafMode';
import MuteMode from './components/MuteMode';
import SettingsModal from './components/SettingsModal';

type Tab = 'listen' | 'reply';

function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userLang, setUserLang] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [listenerLang, setListenerLang] = useState<Language>(SUPPORTED_LANGUAGES[1]);
  const [activeTab, setActiveTab] = useState<Tab>('listen');
  const [isHearingAidConnected, setIsHearingAidConnected] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem('speakbuddy_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.isOnboarded) {
          setIsOnboarded(true);
          const uLang = SUPPORTED_LANGUAGES.find((l) => l.code === state.userLangCode);
          const lLang = SUPPORTED_LANGUAGES.find((l) => l.code === state.listenerLangCode);
          if (uLang) setUserLang(uLang);
          if (lLang) setListenerLang(lLang);
          if (state.isHearingAidConnected) setIsHearingAidConnected(true);
        }
      } catch {
        // ignore
      }
    }
    // Preload voices
    preloadVoices();
  }, []);

  // Save state on changes
  useEffect(() => {
    if (isOnboarded) {
      localStorage.setItem(
        'speakbuddy_state',
        JSON.stringify({
          isOnboarded,
          userLangCode: userLang.code,
          listenerLangCode: listenerLang.code,
          isHearingAidConnected,
        })
      );
    }
  }, [isOnboarded, userLang, listenerLang, isHearingAidConnected]);

  const handleOnboardingComplete = (uLang: Language, lLang: Language) => {
    setUserLang(uLang);
    setListenerLang(lLang);
    setIsOnboarded(true);
    setIsHearingAidConnected(true);
  };

  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="app-container">
      <Header
        isHearingAidConnected={isHearingAidConnected}
        onToggleHearingAid={() => setIsHearingAidConnected(!isHearingAidConnected)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Tab navigation */}
      <nav className="main-tabs">
        <button
          className={`tab-btn ${activeTab === 'listen' ? 'active' : ''}`}
          onClick={() => setActiveTab('listen')}
          id="tab-listen"
        >
          <span className="tab-icon">👂</span>
          Listen & Translate
        </button>
        <button
          className={`tab-btn ${activeTab === 'reply' ? 'active' : ''}`}
          onClick={() => setActiveTab('reply')}
          id="tab-reply"
        >
          <span className="tab-icon">💬</span>
          Smart Replies
        </button>
      </nav>

      {/* Tab content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'listen' ? (
          <DeafMode userLang={userLang} listenerLang={listenerLang} />
        ) : (
          <MuteMode userLang={userLang} listenerLang={listenerLang} />
        )}
      </main>

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userLang={userLang}
        listenerLang={listenerLang}
        onChangeUserLang={(lang) => setUserLang(lang)}
        onChangeListenerLang={(lang) => setListenerLang(lang)}
      />
    </div>
  );
}

export default App;
