// =============================================
// Speak Buddy - Web Speech API Service
// =============================================

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

type RecognitionCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (error: string) => void;

let recognitionInstance: any = null;

export function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function isSpeechSynthesisSupported(): boolean {
  return !!window.speechSynthesis;
}

export function startListening(
  langBcp47: string,
  onResult: RecognitionCallback,
  onError: ErrorCallback,
  onEnd?: () => void
): void {
  if (!isSpeechRecognitionSupported()) {
    onError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  stopListening();

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  recognitionInstance = new SpeechRecognition();
  recognitionInstance.lang = langBcp47;
  recognitionInstance.interimResults = true;
  recognitionInstance.continuous = true;
  recognitionInstance.maxAlternatives = 1;

  recognitionInstance.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      onResult({
        transcript: result[0].transcript,
        isFinal: result.isFinal,
        confidence: result[0].confidence || 0,
      });
    }
  };

  recognitionInstance.onerror = (event: any) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      onError(`Speech recognition error: ${event.error}`);
    }
  };

  recognitionInstance.onend = () => {
    if (onEnd) onEnd();
  };

  recognitionInstance.start();
}

export function stopListening(): void {
  if (recognitionInstance) {
    try {
      recognitionInstance.stop();
    } catch {
      // ignore
    }
    recognitionInstance = null;
  }
}

/**
 * Chrome has a bug where speechSynthesis stops after ~15 seconds.
 * This workaround keeps it alive by calling resume() periodically.
 */
let chromeTtsKeepAlive: ReturnType<typeof setInterval> | null = null;

function startChromeTtsWorkaround() {
  stopChromeTtsWorkaround();
  chromeTtsKeepAlive = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10000);
}

function stopChromeTtsWorkaround() {
  if (chromeTtsKeepAlive) {
    clearInterval(chromeTtsKeepAlive);
    chromeTtsKeepAlive = null;
  }
}

/**
 * Speak text aloud using the Web Speech API.
 *
 * KEY DESIGN: We do NOT force a specific voice object. Instead we only set
 * `utterance.lang` and let the browser pick the best voice. Chrome has
 * built-in online Google voices for all Indian languages (Tamil, Telugu,
 * Kannada, Malayalam, etc.) that work automatically when lang is set —
 * even though they often do NOT appear in getVoices().
 *
 * Only if we find a high-quality Google voice in the voices list do we
 * explicitly set it.
 */
export async function speakText(
  text: string,
  langBcp47: string,
  rate: number = 0.9,
  onEnd?: () => void
): Promise<void> {
  if (!isSpeechSynthesisSupported()) {
    if (onEnd) onEnd();
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  stopChromeTtsWorkaround();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langBcp47;
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try to find a Google voice (best quality for Indian languages).
  // Only set utterance.voice if we find a Google one — otherwise let
  // the browser auto-select based on utterance.lang.
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const langPrefix = langBcp47.split('-')[0].toLowerCase();
    const googleVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(langPrefix) &&
        v.name.toLowerCase().includes('google')
    );
    if (googleVoice) {
      utterance.voice = googleVoice;
    }
    // Don't set non-Google voices — they might not support the script
  }

  // Track whether onEnd has been called to avoid double-fire
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    stopChromeTtsWorkaround();
    if (onEnd) onEnd();
  };

  utterance.onend = finish;
  utterance.onerror = (event) => {
    console.warn('Speech synthesis error:', event.error);
    finish();
  };

  startChromeTtsWorkaround();

  // Small delay after cancel() to let the engine reset
  await new Promise((resolve) => setTimeout(resolve, 100));

  window.speechSynthesis.speak(utterance);

  // Safety: if speech doesn't start within 3s or doesn't end within 30s
  setTimeout(() => {
    if (!window.speechSynthesis.speaking && !ended) {
      // Speech never started — try once more without any voice set
      console.warn('Speech did not start, retrying...');
      const retry = new SpeechSynthesisUtterance(text);
      retry.lang = langBcp47;
      retry.rate = rate;
      retry.pitch = 1;
      retry.volume = 1;
      retry.onend = finish;
      retry.onerror = () => finish();
      window.speechSynthesis.speak(retry);

      // Final safety
      setTimeout(() => finish(), 15000);
    }
  }, 3000);

  setTimeout(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, 30000);
}

export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    stopChromeTtsWorkaround();
  }
}

// Preload voices (needed for some browsers — triggers Chrome to fetch online voices)
export function preloadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    let handled = false;
    const done = (v: SpeechSynthesisVoice[]) => {
      if (handled) return;
      handled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      clearInterval(poll);
      resolve(v);
    };

    const onVoicesChanged = () => {
      done(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    // Poll as backup — some browsers are slow to fire voiceschanged
    const poll = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) done(v);
    }, 250);

    // Timeout
    setTimeout(() => done(window.speechSynthesis.getVoices()), 3000);
  });
}
