/**
 * Sound Effects for NFC Transactions
 * Provides audio feedback for successful purchases and errors
 *
 * Now powered by the randomized sounds utility (supports multiple files per category)
 */

import { playSuccess, playError, preloadSounds } from '@/lib/sounds';

class SoundEffects {
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      // Preload/detect available files
      preloadSounds();

      // Restore persisted setting
      const soundEnabled = localStorage.getItem('nfc_sound_enabled');
      if (soundEnabled !== null) {
        this.isEnabled = soundEnabled === 'true';
      }
    }
  }

  /**
   * Play a sound effect
   * @param soundName - The name of the sound to play ('success' or 'error')
   */
  async play(soundName: 'success' | 'error'): Promise<void> {
    if (!this.isEnabled) {
      console.log('🔇 Sound disabled');
      return;
    }

    try {
      if (soundName === 'success') {
        await playSuccess();
      } else {
        await playError();
      }
    } catch (err) {
      console.warn('⚠️ Could not play sound:', err);
    }
  }

  /**
   * Enable or disable sound effects
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nfc_sound_enabled', String(enabled));
    }
    console.log(`🔊 Sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if sound is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Test a sound (for settings page)
   */
  test(soundName: 'success' | 'error'): void {
    const wasEnabled = this.isEnabled;
    this.isEnabled = true;
    this.play(soundName);
    this.isEnabled = wasEnabled;
  }
}

// Export singleton instance
export const soundEffects = new SoundEffects();
