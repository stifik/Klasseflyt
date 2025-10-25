/**
 * Sound utility: randomize among multiple sounds per category and support mp3/wav.
 *
 * Conventions:
 * - Place files under public/sounds/
 * - Supported names (any that exist will be used):
 *   - success.mp3, success.wav
 *   - success-1.mp3 ... success-10.mp3
 *   - success-1.wav ... success-10.wav
 *   - error.mp3, error.wav, error-1.*, error-2.*, ...
 *
 * Usage:
 *   import { playSuccess, playError, preloadSounds } from '@/lib/sounds';
 *   await playSuccess(); // plays a random success sound if available
 */

export type SoundCategory = 'success' | 'error';

const MAX_VARIANTS = 4; // We have success/error -1 through -4

const cache: Record<SoundCategory, string[] | null> = {
  success: null,
  error: null,
};

const detecting: Record<SoundCategory, Promise<string[]> | null> = {
  success: null,
  error: null,
};

function buildCandidates(category: SoundCategory): string[] {
  const base = `/sounds/${category}`;
  const list: string[] = [];
  // Prefer mp3 base first
  list.push(`${base}.mp3`);
  for (let i = 1; i <= MAX_VARIANTS; i++) list.push(`${base}-${i}.mp3`);
  // Then wav
  list.push(`${base}.wav`);
  for (let i = 1; i <= MAX_VARIANTS; i++) list.push(`${base}-${i}.wav`);
  return list;
}

async function urlExists(url: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false; // SSR safeguard
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (res.ok) return true;
    // Some setups may not support HEAD properly; fallback to GET for first byte
    if (res.status === 405) {
      const getRes = await fetch(url, { method: 'GET', cache: 'no-store' });
      return getRes.ok;
    }
    return false;
  } catch {
    return false;
  }
}

async function detect(category: SoundCategory): Promise<string[]> {
  if (cache[category]) return cache[category]!;
  if (detecting[category]) return detecting[category]!;

  const promise = (async () => {
    const candidates = buildCandidates(category);
    const results: string[] = [];

    // Probe in parallel, but cap concurrency to avoid hammering
    const chunks: string[][] = [];
    const chunkSize = 4;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      chunks.push(candidates.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const checks = await Promise.all(
        chunk.map(async (url) => ((await urlExists(url)) ? url : null))
      );
      for (const found of checks) if (found) results.push(found);
      // Early exit if we already have a decent set
      if (results.length >= MAX_VARIANTS) break;
    }

    // Deduplicate and cache
    const unique = Array.from(new Set(results));
    cache[category] = unique;
    detecting[category] = null;
    return unique;
  })();

  detecting[category] = promise;
  return promise;
}

export async function preloadSounds(): Promise<void> {
  await Promise.all([detect('success'), detect('error')]);
}

export async function playRandom(
  category: SoundCategory,
  opts?: { volume?: number }
): Promise<boolean> {
  try {
    const list = await detect(category);
    const candidates = list.length > 0 ? list : buildFallback(category);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];

    const audio = new Audio(pick);
    if (opts?.volume != null) audio.volume = opts.volume;
    await audio.play();
    return true;
  } catch (err) {
    // Autoplay policies or missing files may cause errors; swallow safely
    console.warn('[sounds] play error:', err);
    return false;
  }
}

export function playSuccess(opts?: { volume?: number }): Promise<boolean> {
  return playRandom('success', opts);
}

export function playError(opts?: { volume?: number }): Promise<boolean> {
  return playRandom('error', opts);
}

function buildFallback(category: SoundCategory): string[] {
  // Fallback to default names even if not detected (dev server caching or HEAD blocked)
  const base = `/sounds/${category}`;
  return [`${base}.mp3`, `${base}.wav`];
}
