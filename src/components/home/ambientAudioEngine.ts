export type AmbientTrackId = 'nature' | 'melody' | 'relaxing';

type StopFn = () => void;

export class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private stopCurrent: StopFn | null = null;
  private timers: Array<ReturnType<typeof setInterval>> = [];

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
  }

  setVolume(level: number, muted: boolean): void {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(
      muted ? 0 : Math.min(0.55, Math.max(0.08, level)),
      this.master.context.currentTime,
      0.05
    );
  }

  isPlaying(): boolean {
    return this.stopCurrent !== null;
  }

  stop(): void {
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.stopCurrent?.();
    this.stopCurrent = null;
  }

  async play(track: AmbientTrackId): Promise<void> {
    await this.resume();
    this.stop();
    const ctx = this.ensureContext();

    switch (track) {
      case 'nature':
        this.stopCurrent = this.startNature(ctx);
        break;
      case 'melody':
        this.stopCurrent = this.startMelody(ctx);
        break;
      case 'relaxing':
        this.stopCurrent = this.startRelaxing(ctx);
        break;
    }
  }

  private chain(node: AudioNode, ctx: AudioContext, gainValue: number): GainNode {
    const g = ctx.createGain();
    g.gain.value = gainValue;
    node.connect(g);
    g.connect(this.master!);
    return g;
  }

  private noiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer {
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let last = 0;
    for (let i = 0; i < len; i += 1) {
      const white = Math.random() * 2 - 1;
      if (type === 'white') {
        data[i] = white * 0.4;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        data[i] = (b0 + b1 + b2 + white * 0.3104856) * 0.11;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buffer;
  }

  private startNature(ctx: AudioContext): StopFn {
    const sources: AudioBufferSourceNode[] = [];
    const gains: GainNode[] = [];

    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer(ctx, 'brown');
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 500;
    wind.connect(windFilter);
    gains.push(this.chain(windFilter, ctx, 0.55));
    wind.start();
    sources.push(wind);

    const rustle = ctx.createBufferSource();
    rustle.buffer = this.noiseBuffer(ctx, 'pink');
    rustle.loop = true;
    const rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = 'bandpass';
    rustleFilter.frequency.value = 1400;
    rustleFilter.Q.value = 0.5;
    rustle.connect(rustleFilter);
    gains.push(this.chain(rustleFilter, ctx, 0.18));
    rustle.start();
    sources.push(rustle);

    const chirp = () => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1600 + Math.random() * 1400;
      osc.connect(env);
      gains.push(this.chain(env, ctx, 0.35));
      const t = ctx.currentTime;
      env.gain.setValueAtTime(0.001, t);
      env.gain.exponentialRampToValueAtTime(0.6, t + 0.03);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.25);
    };

    chirp();
    const chirpTimer = setInterval(chirp, 2500 + Math.random() * 3500);
    this.timers.push(chirpTimer);

    return () => {
      clearInterval(chirpTimer);
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* ignore */
        }
      });
      gains.forEach((g) => {
        try {
          g.disconnect();
        } catch {
          /* ignore */
        }
      });
    };
  }

  private startMelody(ctx: AudioContext): StopFn {
    const notes = [261.63, 293.66, 329.63, 392, 440, 523.25];
    const active: OscillatorNode[] = [];

    const playNote = () => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      osc.connect(env);
      this.chain(env, ctx, 0.45);
      const t = ctx.currentTime;
      env.gain.setValueAtTime(0.001, t);
      env.gain.exponentialRampToValueAtTime(0.7, t + 0.2);
      env.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
      osc.start(t);
      osc.stop(t + 2.6);
      active.push(osc);
    };

    playNote();
    const timer = setInterval(playNote, 2800);
    this.timers.push(timer);

    return () => {
      clearInterval(timer);
      active.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* ignore */
        }
      });
    };
  }

  private startRelaxing(ctx: AudioContext): StopFn {
    const freqs = [110, 164.81, 220, 329.63];
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gains.push(this.chain(osc, ctx, 0.2 + i * 0.04));
      osc.start();
      oscillators.push(osc);
    });

    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoDepth.gain.value = 0.03;
    lfo.connect(lfoDepth);
    if (this.master) lfoDepth.connect(this.master.gain);
    lfo.start();

    return () => {
      oscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* ignore */
        }
      });
      gains.forEach((g) => {
        try {
          g.disconnect();
        } catch {
          /* ignore */
        }
      });
      try {
        lfo.stop();
        lfoDepth.disconnect();
      } catch {
        /* ignore */
      }
    };
  }
}

export const ambientEngine = new AmbientAudioEngine();