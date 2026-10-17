/**
 * Sound synthesis using Web Audio API and Avatar presets
 */

// Synthesize pleasant sound effects without external audio file dependencies
class SoundFX {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    this.enabled = localStorage.getItem('aurachat_sound') !== 'false';
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(val: boolean) {
    this.enabled = val;
    localStorage.setItem('aurachat_sound', val ? 'true' : 'false');
  }

  public isSoundEnabled(): boolean {
    return this.enabled;
  }

  // Soft modern chime for incoming message
  public playMessage() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Friendly bright chime when someone joins
  public playUserJoined() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); // E5
      osc1.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.2); // G5

      osc2.frequency.setValueAtTime(1046.5, this.ctx.currentTime + 0.2); // C6

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start(this.ctx.currentTime + 0.2);
      osc1.stop(this.ctx.currentTime + 0.5);
      osc2.stop(this.ctx.currentTime + 0.5);
    } catch {
      // Audio policy fallback
    }
  }
}

export const soundManager = new SoundFX();

// Preset avatars with modern minimal design, gradients & symbols
export interface AvatarPreset {
  id: string;
  label: string;
  type: 'gradient' | 'emoji' | 'icon';
  value: string;
  bg: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'av1', label: 'Неон', type: 'gradient', value: '⚡', bg: 'from-violet-500 to-indigo-600' },
  { id: 'av2', label: 'Пламя', type: 'gradient', value: '🔥', bg: 'from-amber-500 to-rose-600' },
  { id: 'av3', label: 'Изумруд', type: 'gradient', value: '💎', bg: 'from-emerald-400 to-teal-600' },
  { id: 'av4', label: 'Космос', type: 'gradient', value: '🚀', bg: 'from-blue-600 to-cyan-500' },
  { id: 'av5', label: 'Аура', type: 'gradient', value: '✨', bg: 'from-fuchsia-500 to-pink-500' },
  { id: 'av6', label: 'Кот', type: 'emoji', value: '🐱', bg: 'from-orange-400 to-amber-500' },
  { id: 'av7', label: 'Панда', type: 'emoji', value: '🐼', bg: 'from-slate-600 to-zinc-800' },
  { id: 'av8', label: 'Лиса', type: 'emoji', value: '🦊', bg: 'from-orange-500 to-red-500' },
  { id: 'av9', label: 'Робот', type: 'emoji', value: '🤖', bg: 'from-cyan-500 to-blue-700' },
  { id: 'av10', label: 'Ниндзя', type: 'emoji', value: '🥷', bg: 'from-zinc-700 to-stone-900' },
  { id: 'av11', label: 'Маг', type: 'emoji', value: '🧙', bg: 'from-purple-600 to-violet-900' },
  { id: 'av12', label: 'Музыка', type: 'gradient', value: '🎧', bg: 'from-rose-500 to-purple-600' },
  { id: 'av13', label: 'Призрак', type: 'emoji', value: '👻', bg: 'from-sky-400 to-indigo-500' },
  { id: 'av14', label: 'Сакура', type: 'gradient', value: '🌸', bg: 'from-pink-400 to-rose-400' },
  { id: 'av15', label: 'Звезда', type: 'gradient', value: '⭐', bg: 'from-yellow-400 to-amber-600' },
  { id: 'av16', label: 'Волна', type: 'gradient', value: '🌊', bg: 'from-teal-400 to-blue-600' },
];

export const GROUP_AVATAR_PRESETS = [
  { id: 'g1', emoji: '💬', bg: 'from-indigo-500 to-violet-600', label: 'Общий чат' },
  { id: 'g2', emoji: '🎮', bg: 'from-purple-500 to-pink-600', label: 'Игры' },
  { id: 'g3', emoji: '💻', bg: 'from-cyan-500 to-blue-600', label: 'Разработка' },
  { id: 'g4', emoji: '🔥', bg: 'from-orange-500 to-red-600', label: 'Флудилка' },
  { id: 'g5', emoji: '🎵', bg: 'from-rose-500 to-amber-500', label: 'Музыка' },
  { id: 'g6', emoji: '☕', bg: 'from-amber-600 to-stone-700', label: 'Перерыв' },
];

export const THEME_ACCENTS = [
  { id: 'violet', name: 'Aura Violet', class: 'bg-violet-600 hover:bg-violet-700 text-white', ring: 'ring-violet-500', hex: '#7c3aed' },
  { id: 'ocean', name: 'Ocean Cyan', class: 'bg-cyan-600 hover:bg-cyan-700 text-white', ring: 'ring-cyan-500', hex: '#0891b2' },
  { id: 'emerald', name: 'Emerald', class: 'bg-emerald-600 hover:bg-emerald-700 text-white', ring: 'ring-emerald-500', hex: '#059669' },
  { id: 'rose', name: 'Rose', class: 'bg-rose-600 hover:bg-rose-700 text-white', ring: 'ring-rose-500', hex: '#e11d48' },
  { id: 'amber', name: 'Amber Glow', class: 'bg-amber-600 hover:bg-amber-700 text-white', ring: 'ring-amber-500', hex: '#d97706' },
];
