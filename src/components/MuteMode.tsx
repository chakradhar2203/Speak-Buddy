import React, { useState, useEffect } from 'react';
import type { Language, SuggestedReply, TemplatePhrase, FillOption } from '../services/constants';
import { SCENARIOS, getReplies, getTemplatePhrases, resolveTemplate } from '../services/constants';
import { speakText, cancelSpeech } from '../services/speech';
import {
  getApiKey,
  generateContextualReplies,
  translateText,
} from '../services/gemini';

interface MuteModeProps {
  userLang: Language;
  listenerLang: Language;
}

const MuteMode: React.FC<MuteModeProps> = ({ userLang, listenerLang }) => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [replies, setReplies] = useState<SuggestedReply[]>([]);
  const [aiReplies, setAiReplies] = useState<
    Array<{ textInUserLang: string; textInListenerLang: string; emoji: string }>
  >([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [customText, setCustomText] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showFullScreen, setShowFullScreen] = useState<{
    text: string;
    lang: string;
  } | null>(null);
  const [customContext, setCustomContext] = useState('');

  // Template phrase state
  const [activeTemplate, setActiveTemplate] = useState<TemplatePhrase | null>(null);
  const [templateSelections, setTemplateSelections] = useState<Record<string, FillOption>>({});
  const [currentPlaceholderIdx, setCurrentPlaceholderIdx] = useState(0);

  // Clean up speech when component unmounts or scenario changes
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  useEffect(() => {
    if (selectedScenario) {
      const offlineReplies = getReplies(
        selectedScenario,
        userLang.code,
        listenerLang.code
      );
      setReplies(offlineReplies);

      // If API key is set, also generate AI replies
      const apiKey = getApiKey();
      if (apiKey) {
        setIsLoadingAI(true);
        const scenario = SCENARIOS.find((s) => s.id === selectedScenario);
        generateContextualReplies(
          scenario?.name || selectedScenario,
          userLang.code,
          listenerLang.code,
          apiKey,
          customContext || undefined
        )
          .then((result) => {
            setAiReplies(result);
            setIsLoadingAI(false);
          })
          .catch(() => setIsLoadingAI(false));
      }
    }
  }, [selectedScenario, userLang, listenerLang, customContext]);

  const handleSpeak = async (text: string, id: string) => {
    // Cancel any ongoing speech first
    cancelSpeech();
    setSpeakingId(id);
    // Show full screen card
    setShowFullScreen({ text, lang: listenerLang.nativeName });
    await speakText(text, listenerLang.bcp47, 0.85, () => setSpeakingId(null));
  };

  const handleCustomSpeak = async () => {
    if (!customText.trim()) return;
    const apiKey = getApiKey();
    let textToSpeak = customText;

    if (apiKey) {
      textToSpeak = await translateText(
        customText,
        userLang.code,
        listenerLang.code,
        apiKey
      );
    }

    cancelSpeech();
    setSpeakingId('custom');
    setShowFullScreen({ text: textToSpeak, lang: listenerLang.nativeName });
    await speakText(textToSpeak, listenerLang.bcp47, 0.85, () =>
      setSpeakingId(null)
    );
    setCustomText('');
  };

  // Template phrase handlers
  const handleTemplateSelect = (template: TemplatePhrase) => {
    setActiveTemplate(template);
    setTemplateSelections({});
    setCurrentPlaceholderIdx(0);
  };

  const handleOptionSelect = (placeholderKey: string, option: FillOption) => {
    const newSelections = { ...templateSelections, [placeholderKey]: option };
    setTemplateSelections(newSelections);

    if (activeTemplate) {
      const nextIdx = currentPlaceholderIdx + 1;
      if (nextIdx < activeTemplate.placeholders.length) {
        // Move to next placeholder
        setCurrentPlaceholderIdx(nextIdx);
      } else {
        // All placeholders filled — resolve and speak
        const resolved = resolveTemplate(
          activeTemplate,
          newSelections,
          userLang.code,
          listenerLang.code
        );
        handleSpeak(resolved.textInListenerLang, `tpl-${activeTemplate.id}`);
        // Reset template state
        setActiveTemplate(null);
        setTemplateSelections({});
        setCurrentPlaceholderIdx(0);
      }
    }
  };

  const handleTemplateBack = () => {
    if (currentPlaceholderIdx > 0) {
      // Go back to previous placeholder
      const prevKey = activeTemplate!.placeholders[currentPlaceholderIdx - 1].key;
      const newSelections = { ...templateSelections };
      delete newSelections[prevKey];
      setTemplateSelections(newSelections);
      setCurrentPlaceholderIdx(currentPlaceholderIdx - 1);
    } else {
      // Exit template mode
      setActiveTemplate(null);
      setTemplateSelections({});
      setCurrentPlaceholderIdx(0);
    }
  };

  // Build preview text showing filled placeholders and remaining blanks
  const getTemplatePreview = (): { userPreview: string; listenerPreview: string } => {
    if (!activeTemplate) return { userPreview: '', listenerPreview: '' };
    
    let userText = activeTemplate.template[userLang.code] || activeTemplate.template['en'] || '';
    let listenerText = activeTemplate.template[listenerLang.code] || activeTemplate.template['en'] || '';

    for (const placeholder of activeTemplate.placeholders) {
      const selection = templateSelections[placeholder.key];
      if (selection) {
        const userVal = selection.translations[userLang.code] || selection.translations['en'] || '';
        const listenerVal = selection.translations[listenerLang.code] || selection.translations['en'] || '';
        userText = userText.replace(new RegExp(`\\{${placeholder.key}\\}`, 'g'), `【${userVal}】`);
        listenerText = listenerText.replace(new RegExp(`\\{${placeholder.key}\\}`, 'g'), `【${listenerVal}】`);
      } else {
        userText = userText.replace(new RegExp(`\\{${placeholder.key}\\}`, 'g'), `___`);
        listenerText = listenerText.replace(new RegExp(`\\{${placeholder.key}\\}`, 'g'), `___`);
      }
    }

    return { userPreview: userText, listenerPreview: listenerText };
  };

  const templatePhrases = selectedScenario ? getTemplatePhrases(selectedScenario) : [];

  return (
    <div className="mute-mode">
      {/* Full screen speaking card */}
      {showFullScreen && (
        <div
          className="fullscreen-card fade-in"
          onClick={() => setShowFullScreen(null)}
        >
          <div className="fullscreen-content">
            <div className="speaking-indicator">
              <span className="speaking-wave">🔊</span>
              <span>Speaking in {showFullScreen.lang}...</span>
            </div>
            <p className="fullscreen-text">{showFullScreen.text}</p>
            <button className="dismiss-btn" id="dismiss-fullscreen">
              Tap anywhere to dismiss
            </button>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="mode-info">
        <span className="info-icon">💬</span>
        <div>
          <strong>Reply Mode</strong>
          <p>
            Choose a reply in <strong>{userLang.nativeName}</strong> → speaks in{' '}
            <strong>{listenerLang.nativeName}</strong>
          </p>
        </div>
      </div>

      {/* Template fill-in overlay */}
      {activeTemplate && (
        <div className="template-overlay fade-in">
          <div className="template-modal">
            <div className="template-modal-header">
              <button className="back-btn" onClick={handleTemplateBack} id="template-back-btn">
                ← {currentPlaceholderIdx > 0 ? 'Previous' : 'Back'}
              </button>
              <span className="template-step-indicator">
                Step {currentPlaceholderIdx + 1} of {activeTemplate.placeholders.length}
              </span>
            </div>

            {/* Preview of the sentence being built */}
            <div className="template-preview">
              <span className="template-preview-emoji">{activeTemplate.emoji}</span>
              <div className="template-preview-texts">
                <span className="template-preview-user">{getTemplatePreview().userPreview}</span>
                <span className="template-preview-listener">{getTemplatePreview().listenerPreview}</span>
              </div>
            </div>

            {/* Current placeholder options */}
            <div className="template-placeholder-section">
              <h4 className="template-placeholder-label">
                Select {activeTemplate.placeholders[currentPlaceholderIdx].label}:
              </h4>
              <div className="template-options-grid">
                {activeTemplate.placeholders[currentPlaceholderIdx].options.map((option, idx) => {
                  const userVal = option.translations[userLang.code] || option.translations['en'] || '';
                  const listenerVal = option.translations[listenerLang.code] || option.translations['en'] || '';
                  return (
                    <button
                      key={idx}
                      className="template-option-btn"
                      onClick={() => handleOptionSelect(
                        activeTemplate.placeholders[currentPlaceholderIdx].key,
                        option
                      )}
                      id={`template-option-${idx}`}
                    >
                      <span className="template-option-user">{userVal}</span>
                      {userLang.code !== listenerLang.code && userVal !== listenerVal && (
                        <span className="template-option-listener">{listenerVal}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scenario selection */}
      {!selectedScenario ? (
        <div className="scenario-selection">
          <h3 className="section-title">Where are you?</h3>
          <p className="section-desc">
            Select your current situation for relevant phrases
          </p>

          {/* Custom context input */}
          <div className="context-input-wrapper">
            <input
              type="text"
              className="context-input"
              placeholder="Describe your situation (optional)... e.g., 'buying vegetables at a street market'"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              id="context-input"
            />
          </div>

          <div className="scenario-grid">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                className="scenario-card"
                onClick={() => setSelectedScenario(scenario.id)}
                id={`scenario-${scenario.id}`}
              >
                <span className="scenario-emoji">{scenario.emoji}</span>
                <span className="scenario-name">{scenario.name}</span>
                <span className="scenario-desc">{scenario.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="replies-section">
          {/* Back button and scenario header */}
          <div className="replies-header">
            <button
              className="back-btn"
              onClick={() => {
                setSelectedScenario(null);
                setReplies([]);
                setAiReplies([]);
                setActiveTemplate(null);
              }}
              id="back-to-scenarios"
            >
              ← Back
            </button>
            <h3>
              {SCENARIOS.find((s) => s.id === selectedScenario)?.emoji}{' '}
              {SCENARIOS.find((s) => s.id === selectedScenario)?.name}
            </h3>
          </div>

          {/* Template phrases — fill-in-the-blank */}
          {templatePhrases.length > 0 && (
            <>
              <h4 className="template-section-title">✏️ Fill-in Phrases</h4>
              <p className="template-section-desc">Tap to customize with your details</p>
              <div className="template-phrases-grid">
                {templatePhrases.map((tpl) => {
                  // Show template with blanks in user language
                  let preview = tpl.template[userLang.code] || tpl.template['en'] || '';
                  for (const ph of tpl.placeholders) {
                    preview = preview.replace(
                      new RegExp(`\\{${ph.key}\\}`, 'g'),
                      `___`
                    );
                  }
                  return (
                    <button
                      key={tpl.id}
                      className="template-phrase-card"
                      onClick={() => handleTemplateSelect(tpl)}
                      id={`template-${tpl.id}`}
                    >
                      <span className="reply-emoji">{tpl.emoji}</span>
                      <div className="reply-texts">
                        <span className="reply-user-text">{preview}</span>
                        <span className="template-tap-hint">Tap to fill in details →</span>
                      </div>
                      <span className="template-edit-icon">✏️</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Offline replies */}
          <h4 className="quick-replies-title">⚡ Quick Replies</h4>
          <div className="replies-grid">
            {replies.map((reply) => (
              <button
                key={reply.id}
                className={`reply-card ${speakingId === reply.id ? 'speaking' : ''}`}
                onClick={() => handleSpeak(reply.textInListenerLang, reply.id)}
                id={`reply-${reply.id}`}
              >
                <span className="reply-emoji">{reply.emoji}</span>
                <div className="reply-texts">
                  <span className="reply-user-text">{reply.textInUserLang}</span>
                  <span className="reply-listener-text">
                    {reply.textInListenerLang}
                  </span>
                </div>
                <span className="reply-speak-icon">
                  {speakingId === reply.id ? '⏳' : '🔊'}
                </span>
              </button>
            ))}
          </div>

          {/* AI replies */}
          {isLoadingAI && (
            <div className="ai-loading">
              <div className="loading-spinner"></div>
              <span>AI is generating personalized replies...</span>
            </div>
          )}

          {aiReplies.length > 0 && (
            <>
              <h4 className="ai-section-title">✨ AI Suggested Replies</h4>
              <div className="replies-grid">
                {aiReplies.map((reply, idx) => (
                  <button
                    key={`ai-${idx}`}
                    className={`reply-card ai-card ${speakingId === `ai-${idx}` ? 'speaking' : ''}`}
                    onClick={() =>
                      handleSpeak(reply.textInListenerLang, `ai-${idx}`)
                    }
                    id={`ai-reply-${idx}`}
                  >
                    <span className="reply-emoji">{reply.emoji}</span>
                    <div className="reply-texts">
                      <span className="reply-user-text">
                        {reply.textInUserLang}
                      </span>
                      <span className="reply-listener-text">
                        {reply.textInListenerLang}
                      </span>
                    </div>
                    <span className="reply-speak-icon">
                      {speakingId === `ai-${idx}` ? '⏳' : '🔊'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Custom text input */}
          <div className="custom-input-section">
            <h4>Type a custom message</h4>
            <div className="custom-input-row">
              <input
                type="text"
                className="custom-input"
                placeholder={`Type in ${userLang.name}...`}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSpeak()}
                id="custom-reply-input"
              />
              <button
                className="send-btn"
                onClick={handleCustomSpeak}
                disabled={!customText.trim() || speakingId === 'custom'}
                id="send-custom-btn"
              >
                {speakingId === 'custom' ? '⏳' : '🔊'} Speak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MuteMode;
