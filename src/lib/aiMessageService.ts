/**
 * AI Message Service
 * 
 * Genererer velkomstmeldinger ved hjelp av OpenAI eller Anthropic API.
 * BYOK (Bring Your Own Key) - API-nøkkel lagres i localStorage.
 */

import { db } from './db';
import type { AIMessageSettings, AIMessageCache, TimePeriod, MessageConcepts } from './types';
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
 * Lagrer generert melding i cache med konsept-ekstraksjon
 */
export async function cacheMessage(
  timePeriodId: number, 
  message: string,
  provider: 'openai' | 'anthropic',
  apiKey: string
): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Slett evt. eksisterende cache for denne dato+periode
  await db.aiMessageCache
    .where('[date+timePeriodId]')
    .equals([today, timePeriodId])
    .delete();
  
  // Ekstraher konsepter fra meldingen (asynkront, feiler stille)
  const concepts = await extractConcepts(message, provider, apiKey);
  
  // Lagre ny cache med konsepter
  await db.aiMessageCache.add({
    date: today,
    timePeriodId,
    message,
    generatedAt: new Date(),
    concepts: concepts || undefined,
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

/**
 * Henter konsepter fra de siste N meldingene for å unngå repetisjon
 */
async function getRecentMessageConcepts(count: number = 5): Promise<string[]> {
  try {
    const recentMessages = await db.aiMessageCache
      .orderBy('generatedAt')
      .reverse()
      .limit(count)
      .toArray();
    
    const allConcepts: string[] = [];
    
    for (const msg of recentMessages) {
      if (msg.concepts) {
        allConcepts.push(...msg.concepts.mainTopics);
        allConcepts.push(...msg.concepts.activities);
      }
    }
    
    // Returner unike konsepter
    return [...new Set(allConcepts)];
  } catch (error) {
    console.error('Error fetching recent message concepts:', error);
    return []; // Returner tom liste ved feil
  }
}

async function buildPrompt(settings: AIMessageSettings, timePeriod: TimePeriod | null): Promise<string> {
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
  
  // Legg til tidligere brukte konsepter for å unngå repetisjon
  const recentConcepts = await getRecentMessageConcepts(5);
  if (recentConcepts.length > 0) {
    prompt += `\n\nViktig: Tidligere meldinger har brukt følgende tema og konsepter. UNNGÅ disse og vær kreativ med nye innfallsvinkler:\n${recentConcepts.join(', ')}`;
  }
  
  prompt += `\n\nSkriv en kort velkomstmelding (1-2 setninger). Ikke inkluder anførselstegn rundt meldingen.`;
  
  return prompt;
}

// --- API Calls ---

/**
 * Ekstraherer konsepter fra en generert melding ved hjelp av AI
 */
async function extractConcepts(
  message: string, 
  provider: 'openai' | 'anthropic', 
  apiKey: string
): Promise<MessageConcepts | null> {
  const extractionPrompt = `Ekstraher nøkkelkonsepter fra denne velkomstmeldingen:
"${message}"

Returner BARE en JSON-struktur uten noe annet, i dette formatet:
{
  "mainTopics": ["emner nevnt som faktaer, tema, personer, fenomener"],
  "activities": ["type aktiviteter eller oppgaver nevnt"],
  "tone": "stemning/tone i meldingen (ett ord)"
}`;

  try {
    let result: string;
    
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Du er en assistent som ekstraherer konsepter fra tekst. Returner kun JSON.' },
            { role: 'user', content: extractionPrompt },
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to extract concepts from OpenAI');
        return null;
      }
      
      const data = await response.json();
      result = data.choices[0]?.message?.content?.trim() || '';
    } else {
      // Anthropic - bruk Haiku for rask/billig ekstraksjon
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 100,
          temperature: 0.3,
          messages: [
            { role: 'user', content: extractionPrompt },
          ],
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to extract concepts from Anthropic');
        return null;
      }
      
      const data = await response.json();
      result = data.content[0]?.text?.trim() || '';
    }
    
    // Parse JSON-respons
    const concepts = JSON.parse(result) as MessageConcepts;
    return concepts;
  } catch (error) {
    console.error('Error extracting concepts:', error);
    return null;
  }
}

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
      temperature: 1.0,
      frequency_penalty: 1.5,
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
    const prompt = await buildPrompt(settings, timePeriod);
    let message: string;

    if (settings.provider === 'openai') {
      message = await callOpenAI(prompt, apiKey);
    } else {
      message = await callAnthropic(prompt, apiKey);
    }

    // Cache meldingen med konsept-ekstraksjon
    await cacheMessage(cacheId, message, settings.provider, apiKey);
    
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
    const prompt = await buildPrompt(settings, timePeriod);
    let message: string;

    if (settings.provider === 'openai') {
      message = await callOpenAI(prompt, apiKey);
    } else {
      message = await callAnthropic(prompt, apiKey);
    }

    // Overskriv cache med konsept-ekstraksjon
    await cacheMessage(cacheId, message, settings.provider, apiKey);

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
  const prompt = await buildPrompt(settings, timePeriod);

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
