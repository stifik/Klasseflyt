/**
 * Sound Effects for NFC Transactions
 * Provides audio feedback for successful purchases and errors
 */

class SoundEffects {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isEnabled: boolean = true;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.loadSound('success', '/sounds/success.mp3');
      this.loadSound('error', '/sounds/error.mp3');

      // Check if sound is enabled in localStorage
      const soundEnabled = localStorage.getItem('nfc_sound_enabled');
      if (soundEnabled !== null) {
        this.isEnabled = soundEnabled === 'true';
      }
    }
  }

  private loadSound(name: string, path: string): void {
    try {
      const audio = new Audio(path);
      audio.preload = 'auto';
      
      // Handle loading errors gracefully
      audio.addEventListener('error', (e) => {
        console.warn(`⚠️ Could not load sound: ${path}`, e);
      });
      
      this.sounds.set(name, audio);
    } catch (err) {
      console.warn(`⚠️ Error creating audio element for ${name}:`, err);
    }
  }

  /**
   * Play a sound effect
   * @param soundName - The name of the sound to play ('success' or 'error')
   */
  play(soundName: 'success' | 'error'): void {
    if (!this.isEnabled) {
      console.log('🔇 Sound disabled');
      return;
    }

    const sound = this.sounds.get(soundName);
    if (sound) {
      // Reset playback position if already playing
      sound.currentTime = 0;
      
      sound.play().catch(err => {
        // Browser may block autoplay - this is expected
        console.warn('⚠️ Could not play sound (may be blocked by browser):', err);
      });
    } else {
      console.warn(`⚠️ Sound not found: ${soundName}`);
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
