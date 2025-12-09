/**
 * AI Message Service
 * 
 * Genererer velkomstmeldinger ved hjelp av OpenAI eller Anthropic API.
 * BYOK (Bring Your Own Key) - API-nøkkel lagres i localStorage.
 */

import { db } from './db';
import type { AIMessageSettings, AIMessageCache, TimePeriod } from './types';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

// localStorage keys for API keys (never synced, stays local)
const OPENAI_API_KEY = 'klasseflyt_openai_api_key';
const ANTHROPIC_API_KEY = 'klasseflyt_anthropic_api_key';

// --- API Key Management ---

export function getApiKey(provider: 'openai' | 'anthropic'): string | null {
  if (typeof window === 'undefined') return null;
  const key = provider === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY;
  return localStorage.getItem(key);
}

export function setApiKey(provider: 'openai' | 'anthropic', apiKey: string): void {
  if (typeof window === 'undefined') return;
  const key = provider === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY;
  localStorage.setItem(key, apiKey);
}

export function clearApiKey(provider: 'openai' | 'anthropic'): void {
  if (typeof window === 'undefined') return;
  const key = provider === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY;
  localStorage.removeItem(key);
}

// --- Time Period Helpers ---

/**
 * Finner aktiv tidsperiode basert på nåværende klokkeslett
 */
export async function getCurrentTimePeriod(): Promise<TimePeriod | null> {
  const timePeriods = await db.timePeriods.orderBy('order').toArray();
  if (timePeriods.length === 0) return null;

  const now = new Date();
  const currentTime = format(now, 'HH:mm');

  // Finn den siste perioden som har startet
  let currentPeriod: TimePeriod | null = null;
  for (const period of timePeriods) {
    if (period.startTime <= currentTime) {
      currentPeriod = period;
    } else {
      break;
    }
  }

  // Hvis ingen periode har startet enda, returner første periode
  return currentPeriod || timePeriods[0];
}

/**
 * Sjekker om vi er i en ny tidsperiode sammenlignet med cached melding
 */
export async function hasTimePeriodChanged(cachedTimePeriodId: number | null): Promise<boolean> {
  const currentPeriod = await getCurrentTimePeriod();
  if (!currentPeriod || !currentPeriod.id) return false;
  return currentPeriod.id !== cachedTimePeriodId;
}

// --- Cache Management ---

/**
 * Henter cached melding for dagens dato og gitt tidsperiode
 */
export async function getCachedMessage(timePeriodId: number): Promise<AIMessageCache | null> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const cached = await db.aiMessageCache
    .where('[date+timePeriodId]')
    .equals([today, timePeriodId])
    .first();
  return cached || null;
}

/**
 * Lagrer generert melding i cache
 */
export async function cacheMessage(timePeriodId: number, message: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Slett evt. eksisterende cache for denne dato+periode
  await db.aiMessageCache
    .where('[date+timePeriodId]')
    .equals([today, timePeriodId])
    .delete();
  
  // Lagre ny cache
  await db.aiMessageCache.add({
    date: today,
    timePeriodId,
    message,
    generatedAt: new Date(),
  });
}

/**
 * Rydder opp gamle cache-entries (eldre enn 7 dager)
 */
export async function cleanupOldCache(): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffDate = format(sevenDaysAgo, 'yyyy-MM-dd');
  
  await db.aiMessageCache
    .where('date')
    .below(cutoffDate)
    .delete();
}

// --- Prompt Building ---

function buildPrompt(settings: AIMessageSettings, timePeriod: TimePeriod | null): string {
  const now = new Date();
  
  // Tid på dagen
  const hour = now.getHours();
  let timeOfDay = 'morgen';
  if (hour >= 10 && hour < 12) timeOfDay = 'formiddag';
  else if (hour >= 12 && hour < 14) timeOfDay = 'ettermiddag';
  else if (hour >= 14) timeOfDay = 'sen ettermiddag';

  // Ukedag
  const dayOfWeek = format(now, 'EEEE', { locale: nb });

  // Tone
  const toneDescriptions: Record<string, string> = {
    friendly: 'vennlig og varm',
    formal: 'formell og profesjonell',
    humorous: 'humoristisk og leken',
    motivational: 'motiverende og oppmuntrende',
  };
  const toneDesc = toneDescriptions[settings.tone] || 'vennlig';

  // Språk
  const languageInstructions = settings.language === 'norwegian' 
    ? 'Skriv på norsk bokmål.'
    : 'Write in English.';

  // Bygg prompt
  let prompt = `Du er en lærer som skal skrive en kort velkomstmelding til elevene i klassen.\n`;
  prompt += `Meldingen skal være ${toneDesc}.\n`;
  prompt += `${languageInstructions}\n`;
  
  if (settings.messageContext) {
    prompt += `\nKontekst for meldingen: ${settings.messageContext}\n`;
  }
  
  if (settings.includeTimeOfDay) {
    prompt += `\nDet er ${timeOfDay}.`;
  }
  
  if (settings.includeDayOfWeek) {
    prompt += ` I dag er det ${dayOfWeek}.`;
  }
  
  if (timePeriod) {
    prompt += `\nDette er for tidsperioden "${timePeriod.name}" som starter kl. ${timePeriod.startTime}.`;
  }
  
  prompt += `\n\nSkriv en kort velkomstmelding (1-2 setninger). Ikke inkluder anførselstegn rundt meldingen.`;
  
  return prompt;
}

// --- API Calls ---

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Du er en hjelpsom assistent som skriver velkomstmeldinger for en skoleklasse.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 150,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content?.trim() || '';
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text?.trim() || '';
}

// --- Main Functions ---

export type GenerateResult = {
  success: boolean;
  message: string;
  fromCache: boolean;
  error?: string;
};

/**
 * Henter eller genererer velkomstmelding for nåværende tidsperiode.
 * Returnerer cached melding hvis den finnes, ellers genererer ny.
 */
export async function getOrGenerateMessage(settings: AIMessageSettings): Promise<GenerateResult> {
  if (!settings.enabled) {
    return { success: false, message: '', fromCache: false, error: 'AI-meldinger er ikke aktivert' };
  }

  const apiKey = getApiKey(settings.provider);
  if (!apiKey) {
    return { success: false, message: '', fromCache: false, error: 'API-nøkkel mangler' };
  }

  const timePeriod = await getCurrentTimePeriod();
  // Use time period ID if available, otherwise use 0 as fallback for caching
  const cacheId = timePeriod?.id ?? 0;

  // Sjekk cache først
  const cached = await getCachedMessage(cacheId);
  if (cached) {
    return { success: true, message: cached.message, fromCache: true };
  }

  // Generer ny melding
  try {
    const prompt = buildPrompt(settings, timePeriod);
    let message: string;

    if (settings.provider === 'openai') {
      message = await callOpenAI(prompt, apiKey);
    } else {
      message = await callAnthropic(prompt, apiKey);
    }

    // Cache meldingen
    await cacheMessage(cacheId, message);
    
    // Rydd opp gammel cache i bakgrunnen
    cleanupOldCache().catch(console.error);

    return { success: true, message, fromCache: false };
  } catch (error) {
    console.error('Feil ved generering av AI-melding:', error);
    return { 
      success: false, 
      message: '', 
      fromCache: false, 
      error: error instanceof Error ? error.message : 'Ukjent feil' 
    };
  }
}

/**
 * Tvinger generering av ny melding (overskriver cache).
 * Brukes ved manuell regenerering.
 */
export async function forceRegenerate(settings: AIMessageSettings): Promise<GenerateResult> {
  if (!settings.enabled) {
    return { success: false, message: '', fromCache: false, error: 'AI-meldinger er ikke aktivert' };
  }

  const apiKey = getApiKey(settings.provider);
  if (!apiKey) {
    return { success: false, message: '', fromCache: false, error: 'API-nøkkel mangler' };
  }

  const timePeriod = await getCurrentTimePeriod();
  const cacheId = timePeriod?.id ?? 0;

  try {
    const prompt = buildPrompt(settings, timePeriod);
    let message: string;

    if (settings.provider === 'openai') {
      message = await callOpenAI(prompt, apiKey);
    } else {
      message = await callAnthropic(prompt, apiKey);
    }

    // Overskriv cache
    await cacheMessage(cacheId, message);

    return { success: true, message, fromCache: false };
  } catch (error) {
    console.error('Feil ved regenerering av AI-melding:', error);
    return { 
      success: false, 
      message: '', 
      fromCache: false, 
      error: error instanceof Error ? error.message : 'Ukjent feil' 
    };
  }
}

/**
 * Tester API-tilkobling med gitt provider og nøkkel
 */
export async function testConnection(provider: 'openai' | 'anthropic', apiKey: string): Promise<{ success: boolean; error?: string }> {
  const testPrompt = 'Si "Hei" på norsk.';
  
  try {
    if (provider === 'openai') {
      await callOpenAI(testPrompt, apiKey);
    } else {
      await callAnthropic(testPrompt, apiKey);
    }
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Ukjent feil' 
    };
  }
}

/**
 * Genererer en preview-melding basert på gjeldende innstillinger.
 * Brukes for testing i innstillingene uten å lagre til cache.
 */
export async function generatePreview(
  settings: AIMessageSettings, 
  apiKey: string
): Promise<{ success: boolean; message: string; prompt: string; error?: string }> {
  const timePeriod = await getCurrentTimePeriod();
  const prompt = buildPrompt(settings, timePeriod);

  try {
    let message: string;

    if (settings.provider === 'openai') {
      message = await callOpenAI(prompt, apiKey);
    } else {
      message = await callAnthropic(prompt, apiKey);
    }

    return { success: true, message, prompt };
  } catch (error) {
    return { 
      success: false, 
      message: '', 
      prompt,
      error: error instanceof Error ? error.message : 'Ukjent feil' 
    };
  }
}
