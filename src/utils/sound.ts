'use client';

// A utility to handle UI sounds using Howler or standard Audio API.
// Note: Since 'howler' might need to be installed, we use a simple fallback
// using the native Audio API for placeholders so it works out of the box.

class SoundManager {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;

  play(soundName: string, volume: number = 0.5, isCustomUrl: boolean = false) {
    if (!this.enabled || typeof window === 'undefined') return;

    if (!this.sounds[soundName]) {
      // Lazy load the sound con cache-busting para evitar que el navegador guarde el viejo
      const url = isCustomUrl ? soundName : `/audio/${soundName.includes('/') ? soundName : 'ui/'+soundName}.mp3?v=${Date.now()}`;
      const audio = new Audio(url);
      audio.volume = volume;
      this.sounds[soundName] = audio;
    }

    const sound = this.sounds[soundName];
    // Clone node to allow overlapping identical sounds
    const clone = sound.cloneNode() as HTMLAudioElement;
    clone.volume = volume;
    clone.play().catch((e) => {
      // Ignore autoplay errors or missing file errors for placeholders
      console.warn(`[SoundManager] Could not play sound ${soundName}:`, e);
    });
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const sounds = new SoundManager();

let lastHoverTime = 0;
export const playHover = () => {
  const now = Date.now();
  // Prevenir spam de sonido si se pasa rápido por muchos botones (throttle de 150ms)
  if (now - lastHoverTime > 150) {
    sounds.play('ui_hover', 0.5);
    lastHoverTime = now;
  }
};
export const playClickConfirm = () => sounds.play('ui_click', 0.4);
export const playClickBack = () => sounds.play('ui_click', 0.4); // Fallback to click
export const playSuccess = () => sounds.play('ui_success', 0.5);
export const playError = () => sounds.play('ui_error', 0.5);
export const playEquip = () => sounds.play('garage_equip', 0.5);
export const playNotification = () => sounds.play('ui_notification', 0.5);
