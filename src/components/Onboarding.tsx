import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES, type Language } from '../services/constants';

interface OnboardingProps {
  onComplete: (userLang: Language, listenerLang: Language) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [userLang, setUserLang] = useState<Language | null>(null);
  const [listenerLang, setListenerLang] = useState<Language | null>(null);

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1 && userLang) {
      setStep(2);
    } else if (step === 2 && listenerLang) {
      onComplete(userLang!, listenerLang!);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="onboarding-step fade-in">
            <div className="welcome-icon">🗣️</div>
            <h2>Welcome to Speak Buddy</h2>
            <p className="welcome-subtitle">
              Your AI-powered communication companion for India
            </p>
            <div className="feature-pills">
              <span className="pill">🎧 Live Translation</span>
              <span className="pill">🗣️ Voice Recognition</span>
              <span className="pill">💬 Smart Replies</span>
              <span className="pill">🇮🇳 10+ Indian Languages</span>
            </div>
            <p className="welcome-desc">
              Speak Buddy helps deaf and mute individuals communicate effortlessly
              by translating speech in real-time and providing context-aware
              suggested replies for everyday situations.
            </p>
            <button className="primary-btn" onClick={handleNext} id="get-started-btn">
              Get Started →
            </button>
          </div>
        )}

        {/* Step 1: Select user language */}
        {step === 1 && (
          <div className="onboarding-step fade-in">
            <h2>Your Language</h2>
            <p className="step-desc">
              Choose the language you read and understand best
            </p>
            <div className="language-grid">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-card ${userLang?.code === lang.code ? 'selected' : ''}`}
                  onClick={() => setUserLang(lang)}
                  id={`user-lang-${lang.code}`}
                >
                  <span className="lang-native">{lang.nativeName}</span>
                  <span className="lang-english">{lang.name}</span>
                </button>
              ))}
            </div>
            <button
              className="primary-btn"
              onClick={handleNext}
              disabled={!userLang}
              id="next-to-listener-lang"
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Select listener language */}
        {step === 2 && (
          <div className="onboarding-step fade-in">
            <h2>Speaker's Language</h2>
            <p className="step-desc">
              Choose the language spoken by the people around you
            </p>
            <div className="language-grid">
              {SUPPORTED_LANGUAGES.filter((l) => l.code !== userLang?.code).map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-card ${listenerLang?.code === lang.code ? 'selected' : ''}`}
                  onClick={() => setListenerLang(lang)}
                  id={`listener-lang-${lang.code}`}
                >
                  <span className="lang-native">{lang.nativeName}</span>
                  <span className="lang-english">{lang.name}</span>
                </button>
              ))}
            </div>
            <button
              className="primary-btn"
              onClick={handleNext}
              disabled={!listenerLang}
              id="start-app-btn"
            >
              Start Using Speak Buddy 🚀
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div className="progress-dots">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`dot ${step === i ? 'active' : ''} ${step > i ? 'completed' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
