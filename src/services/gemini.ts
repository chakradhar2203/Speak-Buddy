// =============================================
// Speak Buddy - Gemini API Client
// =============================================

import { SUPPORTED_LANGUAGES } from './constants';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export async function translateText(
  text: string,
  fromLangCode: string,
  toLangCode: string,
  apiKey: string
): Promise<string> {
  const fromLang = SUPPORTED_LANGUAGES.find((l) => l.code === fromLangCode);
  const toLang = SUPPORTED_LANGUAGES.find((l) => l.code === toLangCode);

  if (!fromLang || !toLang) return text;

  const prompt = `Translate the following text from ${fromLang.name} to ${toLang.name}. Only return the translated text, nothing else. Do not add quotes or explanations.\n\nText: ${text}`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch (error) {
    console.error('Gemini translation error:', error);
    return text;
  }
}

export async function generateContextualReplies(
  scenario: string,
  userLangCode: string,
  listenerLangCode: string,
  apiKey: string,
  additionalContext?: string
): Promise<Array<{ textInUserLang: string; textInListenerLang: string; emoji: string }>> {
  const userLang = SUPPORTED_LANGUAGES.find((l) => l.code === userLangCode);
  const listenerLang = SUPPORTED_LANGUAGES.find((l) => l.code === listenerLangCode);

  if (!userLang || !listenerLang) return [];

  const prompt = `You are helping a deaf/mute person communicate in India. They are at: ${scenario}.
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Generate 6 practical, commonly-needed phrases for this situation.
For each phrase, provide:
1. The text in ${userLang.name} (for the deaf/mute user to read)
2. The text in ${listenerLang.name} (to be spoken to the other person)
3. A relevant emoji

Respond in this exact JSON format (no markdown, no code blocks):
[{"textInUserLang": "...", "textInListenerLang": "...", "emoji": "..."}]`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data: GeminiResponse = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    // Parse JSON from response, handling possible markdown code blocks
    const jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Gemini contextual replies error:', error);
    return [];
  }
}

export function isApiKeySet(): boolean {
  return !!localStorage.getItem('speakbuddy_api_key');
}

export function getApiKey(): string {
  return localStorage.getItem('speakbuddy_api_key') || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem('speakbuddy_api_key', key);
}

export function removeApiKey(): void {
  localStorage.removeItem('speakbuddy_api_key');
}
