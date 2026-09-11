// Tactical Sound Synthesizer using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.35, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Play gunshot based on hero type
  public playGunshot(heroId: string = 'assault', isLocalPlayer: boolean = true) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const vol = isLocalPlayer ? 0.7 : 0.3;

    if (heroId === 'mirage') {
      // Sniper rifle: high pitch snap + deep sub boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.35);

      gain.gain.setValueAtTime(vol * 1.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.4);

      // White noise snap
      this.playNoise(0.15, 1200, 300, vol * 0.8);
    } else if (heroId === 'sparkle') {
      // Shotgun: heavy dual punch + noise blast
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);

      gain.gain.setValueAtTime(vol * 1.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.28);

      this.playNoise(0.2, 800, 150, vol);
    } else if (heroId === 'bastion') {
      // Chaingun: metallic low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.08);

      gain.gain.setValueAtTime(vol * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
    } else if (heroId === 'firefly') {
      // Plasma cannon: sci-fi sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.22);

      gain.gain.setValueAtTime(vol * 0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.24);
    } else {
      // Assault rifle / SMG (Stalker / Raven)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);

      gain.gain.setValueAtTime(vol * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.11);

      this.playNoise(0.06, 1800, 600, vol * 0.4);
    }
  }

  private playNoise(duration: number, startFreq: number, endFreq: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(50, endFreq), this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  // Hit impact
  public playHit(isArmor: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isArmor ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isArmor ? 650 : 220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Reload sound
  public playReload() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Click 1 (mag out)
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(900, t);
    osc1.frequency.exponentialRampToValueAtTime(400, t + 0.06);
    g1.gain.setValueAtTime(0.3, t);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    osc1.connect(g1);
    g1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.06);

    // Click 2 (mag in)
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(500, t + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(1100, t + 0.32);
    g2.gain.setValueAtTime(0.35, t + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.32);
    osc2.connect(g2);
    g2.connect(this.masterGain);
    osc2.start(t + 0.25);
    osc2.stop(t + 0.32);
  }

  // Footstep scuff
  public playFootstep(isSprint: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);

    gain.gain.setValueAtTime(isSprint ? 0.15 : 0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Pickup acquired
  public playPickup() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.06); // E5
    osc.frequency.setValueAtTime(783.99, t + 0.12); // G5

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Ability activated
  public playAbility() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Kill notification
  public playKill() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.4, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.14);
    });
  }

  // Tactical Announcer Voice Synthesizer
  public speakAnnouncer(phrase: string) {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop prior callout
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.pitch = 0.82; // Deep authoritative combat announcer voice
      utterance.rate = 1.08;  // Fast, punchy cadence
      utterance.volume = 0.95;

      // Select suitable English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('David') ||
            v.name.includes('Mark') ||
            v.name.includes('George') ||
            v.name.includes('Male') ||
            v.name.includes('Natural'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (preferred) {
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors gracefully
    }
  }

  // Epic Killstreak Fanfare Synthesizer
  public playStreak(streakType: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // Helper to play a punchy sub bass impact
    const playSubImpact = (freq = 80, decay = 0.45) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + decay);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + decay);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + decay);
    };

    if (streakType === 'double_kill') {
      playSubImpact(90, 0.35);
      const notes = [293.66, 440, 587.33]; // D4, A4, D5
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.08);
        gain.gain.setValueAtTime(0.45, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.22);
      });
    } else if (streakType === 'triple_kill') {
      playSubImpact(100, 0.45);
      const notes = [329.63, 440, 554.37, 659.25]; // E4, A4, C#5, E5
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.07);
        gain.gain.setValueAtTime(0.5, t + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.07);
        osc.stop(t + i * 0.07 + 0.3);
      });
    } else if (streakType === 'quad_kill') {
      playSubImpact(110, 0.5);
      const notes = [369.99, 440, 554.37, 739.99, 880];
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, t + i * 0.06);
        gain.gain.setValueAtTime(0.55, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.35);
      });
      this.playNoise(0.2, 1400, 400, 0.6);
    } else if (streakType === 'mega_kill' || streakType === 'godlike') {
      playSubImpact(130, 0.7);
      const notes = [293.66, 369.99, 440, 587.33, 739.99, 880, 1174.66];
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.05);
        gain.gain.setValueAtTime(0.5, t + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.4);
      });
      this.playNoise(0.25, 2000, 200, 0.7);
    } else if (streakType === 'rampage' || streakType === 'unstoppable') {
      playSubImpact(120, 0.6);
      // Dual oscillating heavy siren horn
      [220, 277.18, 329.63, 440].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + i * 0.08);
        osc.frequency.linearRampToValueAtTime(f * 1.5, t + i * 0.08 + 0.35);
        gain.gain.setValueAtTime(0.45, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.4);
      });
    } else if (streakType === 'killing_spree' || streakType === 'dominating') {
      playSubImpact(100, 0.45);
      [196, 246.94, 293.66, 392].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.09);
        gain.gain.setValueAtTime(0.5, t + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.09);
        osc.stop(t + i * 0.09 + 0.35);
      });
    } else if (streakType === 'shutdown') {
      // EMP disruption drop: high frequency snap down to deep bass
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.45);
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.5);
      this.playNoise(0.2, 2500, 100, 0.5);
    } else {
      // First blood or standard
      playSubImpact(85, 0.4);
      const notes = [330, 392, 493.88];
      notes.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.08);
        gain.gain.setValueAtTime(0.4, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.25);
      });
    }
  }

  // Audio cue when a bounty target appears in Sector 8
  public playBountyAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Two rapid alarm siren pulses
    [0, 0.22, 0.44].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(587.33, t + offset); // D5
      osc.frequency.exponentialRampToValueAtTime(880, t + offset + 0.16); // A5
      gain.gain.setValueAtTime(0.45, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.2);
    });
  }

  // Audio cue when a bounty is successfully claimed
  public playBountyClaimed() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Triumphant golden fanfare + gold coin chimes
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio up to high C
    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);
      gain.gain.setValueAtTime(0.5, t + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.6);
    });
  }

  // Audio cue when a commander teleports to Sector 8
  public playTeleport() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Sci-fi warp vortex: rising sine pitch sweep + filtered resonance burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.55);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.7);

    // Deep sub bass pulse at arrival
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(160, t + 0.35);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.75);

    subGain.gain.setValueAtTime(0.6, t + 0.35);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t + 0.35);
    sub.stop(t + 0.85);
  }

  // Hostile intruder alert when non-resident warps into Sector 8
  public playIntruderAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Red alert klaxon dual tone
    [0, 0.3, 0.6].forEach((offset) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t + offset);
      osc.frequency.exponentialRampToValueAtTime(330, t + offset + 0.22);

      gain.gain.setValueAtTime(0.55, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.26);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + offset);
      osc.stop(t + offset + 0.26);
    });
  }

  // Player death / elimination sound
  public playDeath() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.45);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }
}

export const sounds = new SoundManager();
