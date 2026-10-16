/**
 * Procedural Web Audio Ceramic Sound Synthesizer & Mobile Haptics Engine
 * Synthesizes authentic glazed porcelain clacks, wooden board slots, linen rustles,
 * and harmonic Iberian marimba/celesta scoring arpeggios with zero external audio assets.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private hapticsEnabled: boolean = true;

  constructor() {
    // Load persisted preferences if available
    try {
      const savedMuted = localStorage.getItem('azulejo_muted');
      if (savedMuted !== null) {
        this.muted = savedMuted === 'true';
      }
      const savedHaptics = localStorage.getItem('azulejo_haptics');
      if (savedHaptics !== null) {
        this.hapticsEnabled = savedHaptics === 'true';
      }
    } catch {
      // Ignore storage access errors
    }
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.hapticsEnabled || this.muted) return;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration failures on unsupported devices
    }
  }

  /**
   * Generates a short noise buffer for transient porcelain impulses and linen rustles
   */
  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Crisp porcelain/ceramic high-Q resonant clack (1800Hz & 3400Hz bandpass-filtered impulse
   * + short woody body 420Hz) with slight pitch jitter per tile.
   */
  public playTilePickup(count: number = 1): void {
    const ctx = this.getContext();
    const clampedCount = Math.max(1, Math.min(count, 8));
    this.vibrate(clampedCount > 1 ? [12, 25, 14] : 12);
    if (!ctx) return;

    const now = ctx.currentTime;

    for (let i = 0; i < clampedCount; i++) {
      const offset = i * 0.042;
      const startTime = now + offset;
      const jitter = 0.94 + Math.random() * 0.12;

      // 1. High-Q porcelain resonant ring 1 (1800Hz)
      const noiseBuf = this.createNoiseBuffer(ctx, 0.045);
      const noise1 = ctx.createBufferSource();
      noise1.buffer = noiseBuf;

      const bp1 = ctx.createBiquadFilter();
      bp1.type = 'bandpass';
      bp1.frequency.setValueAtTime(1800 * jitter, startTime);
      bp1.Q.setValueAtTime(18, startTime);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.001, startTime);
      gain1.gain.linearRampToValueAtTime(0.32, startTime + 0.002);
      gain1.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.042);

      noise1.connect(bp1);
      bp1.connect(gain1);
      gain1.connect(ctx.destination);
      noise1.start(startTime);
      noise1.stop(startTime + 0.045);

      // 2. Glazed ceramic overtone shimmer (3400Hz)
      const noise2 = ctx.createBufferSource();
      noise2.buffer = noiseBuf;

      const bp2 = ctx.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.setValueAtTime(3400 * jitter, startTime);
      bp2.Q.setValueAtTime(22, startTime);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.001, startTime);
      gain2.gain.linearRampToValueAtTime(0.24, startTime + 0.0015);
      gain2.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.032);

      noise2.connect(bp2);
      bp2.connect(gain2);
      gain2.connect(ctx.destination);
      noise2.start(startTime);
      noise2.stop(startTime + 0.035);

      // 3. Short woody/ceramic body resonance (420Hz)
      const bodyOsc = ctx.createOscillator();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(420 * jitter, startTime);
      bodyOsc.frequency.exponentialRampToValueAtTime(290 * jitter, startTime + 0.035);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.001, startTime);
      bodyGain.gain.linearRampToValueAtTime(0.16, startTime + 0.002);
      bodyGain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.038);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      bodyOsc.start(startTime);
      bodyOsc.stop(startTime + 0.04);
    }
  }

  /**
   * Satisfying ceramic click-lock into recessed wooden board slot.
   */
  public playTilePlace(index: number = 0): void {
    const ctx = this.getContext();
    this.vibrate(18);
    if (!ctx) return;

    const now = ctx.currentTime + index * 0.055;
    const pitchScale = 1 + Math.min(index, 6) * 0.045;

    // 1. Recessed wooden slot thock (low-mid sine/triangle drop)
    const woodOsc = ctx.createOscillator();
    woodOsc.type = 'sine';
    woodOsc.frequency.setValueAtTime(360 * pitchScale, now);
    woodOsc.frequency.exponentialRampToValueAtTime(145 * pitchScale, now + 0.055);

    const woodGain = ctx.createGain();
    woodGain.gain.setValueAtTime(0.001, now);
    woodGain.gain.linearRampToValueAtTime(0.28, now + 0.003);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    woodOsc.connect(woodGain);
    woodGain.connect(ctx.destination);
    woodOsc.start(now);
    woodOsc.stop(now + 0.065);

    // 2. Crisp porcelain click-lock transient (2200Hz resonant ping)
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(2150 * pitchScale, now + 0.004);
    clickOsc.frequency.exponentialRampToValueAtTime(1680 * pitchScale, now + 0.038);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.001, now + 0.004);
    clickGain.gain.linearRampToValueAtTime(0.18, now + 0.006);
    clickGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.042);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now + 0.004);
    clickOsc.stop(now + 0.045);
  }

  /**
   * Warm ceramic slide followed by an ascending harmonic marimba/celesta arpeggio
   * proportional to points and chainLength.
   */
  public playWallSlideScore(points: number = 1, chainLength: number = 1): void {
    const ctx = this.getContext();
    this.vibrate(chainLength > 1 ? [15, 30, 25] : 20);
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Warm ceramic slide across glazed board (filtered noise sweep)
    const slideBuf = this.createNoiseBuffer(ctx, 0.14);
    const slideSrc = ctx.createBufferSource();
    slideSrc.buffer = slideBuf;

    const slideFilter = ctx.createBiquadFilter();
    slideFilter.type = 'bandpass';
    slideFilter.frequency.setValueAtTime(900, now);
    slideFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
    slideFilter.Q.setValueAtTime(6, now);

    const slideGain = ctx.createGain();
    slideGain.gain.setValueAtTime(0.001, now);
    slideGain.gain.linearRampToValueAtTime(0.14, now + 0.03);
    slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    slideSrc.connect(slideFilter);
    slideFilter.connect(slideGain);
    slideGain.connect(ctx.destination);
    slideSrc.start(now);
    slideSrc.stop(now + 0.14);

    // 2. Ascending Iberian marimba/celesta scale (D major / Lydian warmth)
    const scaleFreqs = [
      587.33, // D5
      659.25, // E5
      739.99, // F#5
      880.0,  // A5
      987.77, // B5
      1174.66, // D6
      1318.51, // E6
      1479.98, // F#6
    ];

    const notesCount = Math.max(1, Math.min(8, Math.max(points, chainLength)));
    for (let i = 0; i < notesCount; i++) {
      const noteTime = now + 0.08 + i * 0.055;
      const freq = scaleFreqs[i % scaleFreqs.length];

      // Fundamental marimba/celesta tone
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Harmonic overtone (4x for marimba/celesta sparkle)
      const overtone = ctx.createOscillator();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, noteTime);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.001, noteTime);
      noteGain.gain.linearRampToValueAtTime(0.2, noteTime + 0.006);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, noteTime + 0.28);

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.001, noteTime);
      overtoneGain.gain.linearRampToValueAtTime(0.06, noteTime + 0.004);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0005, noteTime + 0.12);

      osc.connect(noteGain);
      overtone.connect(overtoneGain);
      noteGain.connect(ctx.destination);
      overtoneGain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.3);
      overtone.start(noteTime);
      overtone.stop(noteTime + 0.14);
    }
  }

  /**
   * Low resonant wooden thud + muted ceramic clatter for floor line penalties.
   */
  public playFloorPenalty(): void {
    const ctx = this.getContext();
    this.vibrate([30, 40, 45]);
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Low resonant wooden thud
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(165, now);
    thudOsc.frequency.exponentialRampToValueAtTime(68, now + 0.18);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.linearRampToValueAtTime(0.32, now + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.21);

    // 2. Muted ceramic clatter (two dissonant low-Q ceramic taps)
    const clatterFreqs = [1240, 1110];
    clatterFreqs.forEach((freq, idx) => {
      const t = now + 0.025 + idx * 0.045;
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.05);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq, t);
      filter.Q.setValueAtTime(9, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.048);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.05);
    });
  }

  /**
   * Soft linen fabric rustle + cascading multi-tile ceramic clatter when refilling factories.
   */
  public playBagRefill(): void {
    const ctx = this.getContext();
    this.vibrate([10, 20, 10, 20, 15]);
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Soft embroidered linen bag rustle (bandpass filtered pink-like noise)
    const rustleBuf = this.createNoiseBuffer(ctx, 0.28);
    const rustleSrc = ctx.createBufferSource();
    rustleSrc.buffer = rustleBuf;

    const rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = 'bandpass';
    rustleFilter.frequency.setValueAtTime(1100, now);
    rustleFilter.frequency.linearRampToValueAtTime(1600, now + 0.14);
    rustleFilter.frequency.linearRampToValueAtTime(950, now + 0.28);
    rustleFilter.Q.setValueAtTime(2.2, now);

    const rustleGain = ctx.createGain();
    rustleGain.gain.setValueAtTime(0.001, now);
    rustleGain.gain.linearRampToValueAtTime(0.14, now + 0.06);
    rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    rustleSrc.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(ctx.destination);
    rustleSrc.start(now);
    rustleSrc.stop(now + 0.28);

    // 2. Cascading multi-tile ceramic clatter (6 micro-clacks)
    for (let i = 0; i < 6; i++) {
      const clackTime = now + 0.05 + i * 0.038 + Math.random() * 0.012;
      const freq = 1950 + (i % 3) * 420 + (Math.random() - 0.5) * 180;

      const clackNoise = ctx.createBufferSource();
      clackNoise.buffer = this.createNoiseBuffer(ctx, 0.03);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, clackTime);
      bp.Q.setValueAtTime(20, clackTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, clackTime);
      gain.gain.linearRampToValueAtTime(0.16, clackTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0008, clackTime + 0.028);

      clackNoise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      clackNoise.start(clackTime);
      clackNoise.stop(clackTime + 0.03);
    }
  }

  /**
   * Regal Iberian acoustic chord arpeggio for end-of-game celebration.
   */
  public playVictoryFanfare(): void {
    const ctx = this.getContext();
    this.vibrate([25, 40, 25, 40, 60]);
    if (!ctx) return;

    const now = ctx.currentTime;
    // Regal D Major 9th Iberian Guitar / Harp Arpeggio
    const notes = [
      293.66, // D4
      369.99, // F#4
      440.0,  // A4
      587.33, // D5
      659.25, // E5
      739.99, // F#5
      880.0,  // A5
      1174.66 // D6
    ];

    notes.forEach((freq, idx) => {
      const t = now + idx * 0.075;

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, t);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.85);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.setValueAtTime(0.001, t);
      harmonicGain.gain.linearRampToValueAtTime(0.07, t + 0.005);
      harmonicGain.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);

      osc1.connect(gain);
      osc2.connect(harmonicGain);
      gain.connect(ctx.destination);
      harmonicGain.connect(ctx.destination);

      osc1.start(t);
      osc1.stop(t + 0.88);
      osc2.start(t);
      osc2.stop(t + 0.38);
    });
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem('azulejo_muted', String(muted));
    } catch {
      // Ignore storage error
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
    try {
      localStorage.setItem('azulejo_haptics', String(enabled));
    } catch {
      // Ignore storage error
    }
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }
}

export const soundManager = new SoundManager();

export const playTilePickup = (count: number = 1) =>
  soundManager.playTilePickup(count);
export const playTilePlace = (index?: number) =>
  soundManager.playTilePlace(index);
export const playWallSlideScore = (points: number, chainLength: number) =>
  soundManager.playWallSlideScore(points, chainLength);
export const playFloorPenalty = () => soundManager.playFloorPenalty();
export const playBagRefill = () => soundManager.playBagRefill();
export const playVictoryFanfare = () => soundManager.playVictoryFanfare();
export const setMuted = (muted: boolean) => soundManager.setMuted(muted);
export const isMuted = () => soundManager.isMuted();
export const setHapticsEnabled = (enabled: boolean) =>
  soundManager.setHapticsEnabled(enabled);
export const isHapticsEnabled = () => soundManager.isHapticsEnabled();
