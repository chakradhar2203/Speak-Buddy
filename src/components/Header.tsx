import React from 'react';

interface HeaderProps {
  isHearingAidConnected: boolean;
  onToggleHearingAid: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isHearingAidConnected,
  onToggleHearingAid,
  onOpenSettings,
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-icon">🗣️</div>
        <div className="logo-text">
          <h1>Speak Buddy</h1>
          <span className="tagline">Your voice, your language</span>
        </div>
      </div>
      <div className="header-right">
        <button
          className={`hearing-aid-btn ${isHearingAidConnected ? 'connected' : ''}`}
          onClick={onToggleHearingAid}
          title={isHearingAidConnected ? 'Hearing Aid Connected' : 'Connect Hearing Aid'}
          id="hearing-aid-toggle"
        >
          <span className="bt-icon">🎧</span>
          <span className={`bt-status ${isHearingAidConnected ? 'pulse' : ''}`}></span>
          <span className="bt-label">
            {isHearingAidConnected ? 'Connected' : 'Disconnected'}
          </span>
        </button>
        <button
          className="settings-btn"
          onClick={onOpenSettings}
          title="Settings"
          id="settings-button"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
};

export default Header;
