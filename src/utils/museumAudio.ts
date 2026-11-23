// Voicebox Neural Audio Guide Engine & Web Audio Cat Purr Synthesizer
// Integrates state-of-the-art Neural TTS (Microsoft Neural Studio + Gemini Flash TTS)
// with real-time Web Audio DSP (Museum Hall Reverb, Warmth Equalizer, Frequency Analyser)

export interface AudioGuideVoice {
  id: string;
  name: string;
  subtitle: string;
  category: 'neural' | 'gemini' | 'english';
  gender: 'male' | 'female';
  icon: string;
}

export const AUDIO_GUIDE_VOICES: AudioGuideVoice[] = [
  {
    id: 'ru-RU-DmitryNeural',
    name: 'Куратор Дмитрий',
    subtitle: 'Voicebox Studio • Глубокий мужской баритон',
    category: 'neural',
    gender: 'male',
    icon: '🎙️'
  },
  {
    id: 'ru-RU-SvetlanaNeural',
    name: 'Искусствовед Светлана',
    subtitle: 'Voicebox Studio • Мелодичный женский тембр',
    category: 'neural',
    gender: 'female',
    icon: '✨'
  },
  {
    id: 'gemini-charon',
    name: 'Винсент ван Гог',
    subtitle: 'Gemini 3.1 Flash Neural • Экспрессивный монолог',
    category: 'gemini',
    gender: 'male',
    icon: '🌻'
  },
  {
    id: 'gemini-aoede',
    name: 'Муза Аэда',
    subtitle: 'Gemini 3.1 Flash Neural • Поэтическая интонация',
    category: 'gemini',
    gender: 'female',
    icon: '🎨'
  },
  {
    id: 'en-US-ChristopherNeural',
    name: 'Historian Christopher',
    subtitle: 'Voicebox Neural • English Curator (USA/UK)',
    category: 'english',
    gender: 'male',
    icon: '🇬🇧'
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Curator Jenny',
    subtitle: 'Voicebox Neural • English Storyteller',
    category: 'english',
    gender: 'female',
    icon: '🇺🇸'
  }
];

export interface AudioPlayerState {
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  voice: string;
  speed: number;
  reverbEnabled: boolean;
  purrBackgroundEnabled: boolean;
  error: string | null;
}

type AudioStateListener = (state: AudioPlayerState) => void;

class MuseumAudioEngine {
  private ctx: AudioContext | null = null;
  private purrOsc: OscillatorNode | null = null;
  private purrModulator: OscillatorNode | null = null;
  private purrGain: GainNode | null = null;
  private isPurring = false;

  // Voicebox Media & DSP Nodes
  private audioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Cache of synthesized audio base64 data URLs: key -> dataUrl
  private audioCache = new Map<string, string>();

  // Configuration & State
  private currentVoiceId = 'ru-RU-DmitryNeural';
  private playbackSpeed = 1.0;
  private isReverbActive = true;
  private isPurrBackgroundActive = true;
  private isBuffering = false;
  private isAudioPlaying = false;
  private stateListeners: Set<AudioStateListener> = new Set();
  private currentAudioUrl: string | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Generates a soft, soothing low-frequency cat purr (~25 Hz with 4 Hz flutter)
  public togglePurr(volume = 0.15): boolean {
    if (this.isPurring) {
      this.stopPurr();
      return false;
    }

    try {
      const ctx = this.initContext();

      // Main purr tone (around 24-28 Hz base resonance of cat larynx)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(26, ctx.currentTime);

      // Fluttering modulator (4-5 Hz respiratory rhythm)
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(4.2, ctx.currentTime);

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(0.5, ctx.currentTime);
      mod.connect(modGain);

      // Modulate amplitude
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(volume, ctx.currentTime);
      modGain.connect(mainGain.gain);

      // Low-pass warm filter to keep it deep and mellow
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, ctx.currentTime);

      osc.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(ctx.destination);

      osc.start();
      mod.start();

      this.purrOsc = osc;
      this.purrModulator = mod;
      this.purrGain = mainGain;
      this.isPurring = true;
      return true;
    } catch (err) {
      console.warn('Audio context purr init failed:', err);
      return false;
    }
  }

  public stopPurr(): void {
    if (!this.isPurring) return;
    try {
      if (this.purrOsc) {
        this.purrOsc.stop();
        this.purrOsc.disconnect();
        this.purrOsc = null;
      }
      if (this.purrModulator) {
        this.purrModulator.stop();
        this.purrModulator.disconnect();
        this.purrModulator = null;
      }
      if (this.purrGain) {
        this.purrGain.disconnect();
        this.purrGain = null;
      }
    } catch {}
    this.isPurring = false;
  }

  public getIsPurring(): boolean {
    return this.isPurring;
  }

  // Create synthetic impulse response simulating a grand museum gallery hall acoustic
  private createGalleryImpulseResponse(ctx: AudioContext, duration = 1.4, decay = 2.2): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = (length - i) / length;
      const envelope = Math.pow(n, decay);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  // Sets up Web Audio DSP chain with Reverb & Analyser
  private setupAudioGraph(): void {
    if (this.audioSourceNode || !this.audioElement) return;

    try {
      const ctx = this.initContext();
      this.audioSourceNode = ctx.createMediaElementSource(this.audioElement);

      // Analyser for soundwave visualization
      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Master Gain
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

      // Dry & Wet Paths for Reverb
      this.dryGain = ctx.createGain();
      this.dryGain.gain.setValueAtTime(1.0, ctx.currentTime);

      this.wetGain = ctx.createGain();
      this.wetGain.gain.setValueAtTime(this.isReverbActive ? 0.35 : 0.0, ctx.currentTime);

      // Gallery Reverb Convolver
      this.convolverNode = ctx.createConvolver();
      this.convolverNode.buffer = this.createGalleryImpulseResponse(ctx, 1.5, 2.3);

      // Connect dry path: Source -> Analyser -> Master -> Dry -> Destination
      this.audioSourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.masterGain);
      this.masterGain.connect(this.dryGain);
      this.dryGain.connect(ctx.destination);

      // Connect wet path: Master -> Convolver -> Wet -> Destination
      this.masterGain.connect(this.convolverNode);
      this.convolverNode.connect(this.wetGain);
      this.wetGain.connect(ctx.destination);
    } catch (err) {
      console.warn('[AudioGraph Setup Notice]:', err);
    }
  }

  public subscribe(listener: AudioStateListener): () => void {
    this.stateListeners.add(listener);
    this.emitState();
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private emitState(errorMsg: string | null = null): void {
    const state: AudioPlayerState = {
      isPlaying: this.isAudioPlaying,
      isBuffering: this.isBuffering,
      currentTime: this.audioElement?.currentTime || 0,
      duration: this.audioElement?.duration || 0,
      voice: this.currentVoiceId,
      speed: this.playbackSpeed,
      reverbEnabled: this.isReverbActive,
      purrBackgroundEnabled: this.isPurrBackgroundActive,
      error: errorMsg
    };
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  // Synthesizes speech using the server-side Voicebox Neural Engine
  public async playNeuralNarration(
    text: string,
    artworkId: string,
    preferredVoice?: string,
    onEnded?: () => void
  ): Promise<boolean> {
    const voiceToUse = preferredVoice || this.currentVoiceId;
    this.currentVoiceId = voiceToUse;

    // If already playing this exact audio, toggle pause/play
    if (this.audioElement && this.currentAudioUrl && !this.audioElement.paused && !this.audioElement.ended) {
      this.audioElement.pause();
      this.isAudioPlaying = false;
      this.emitState();
      return false;
    } else if (this.audioElement && this.currentAudioUrl && this.audioElement.paused && this.audioElement.currentTime > 0) {
      this.audioElement.play();
      this.isAudioPlaying = true;
      this.emitState();
      return true;
    }

    const cacheKey = `${voiceToUse}__${artworkId}__${text.slice(0, 35)}`;
    let audioDataUrl = this.audioCache.get(cacheKey);

    this.isBuffering = true;
    this.emitState();

    try {
      if (!audioDataUrl) {
        let idToken: string | null = null;
        try {
          const { auth } = await import('../firebase');
          idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        } catch {
          idToken = null;
        }

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            text,
            voice: voiceToUse
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success || !data.audioDataUrl) {
          throw new Error(data.message || data.error || 'TTS synthesis failed');
        }

        audioDataUrl = data.audioDataUrl;
        if (audioDataUrl) {
          this.audioCache.set(cacheKey, audioDataUrl);
        }
      }

      if (!audioDataUrl) throw new Error('No audio URL produced');

      this.currentAudioUrl = audioDataUrl;

      // Stop any existing playback
      this.stopSpeech();

      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = audioDataUrl;
      audio.playbackRate = this.playbackSpeed;
      this.audioElement = audio;

      // Wire Web Audio DSP graph
      this.setupAudioGraph();

      audio.onplay = () => {
        this.isAudioPlaying = true;
        this.isBuffering = false;
        // If background purr enabled, soft cat purr starts
        if (this.isPurrBackgroundActive && !this.isPurring) {
          this.togglePurr(0.08); // subtle companion purr
        }
        this.emitState();
      };

      audio.ontimeupdate = () => {
        this.emitState();
      };

      audio.onpause = () => {
        this.isAudioPlaying = false;
        this.emitState();
      };

      audio.onended = () => {
        this.isAudioPlaying = false;
        if (this.isPurrBackgroundActive && this.isPurring) {
          this.stopPurr();
        }
        this.emitState();
        if (onEnded) onEnded();
      };

      audio.onerror = (e) => {
        console.warn('Audio playback error:', e);
        this.isAudioPlaying = false;
        this.isBuffering = false;
        this.emitState('Ошибка воспроизведения аудио');
      };

      await audio.play();
      this.isAudioPlaying = true;
      this.isBuffering = false;
      this.emitState();
      return true;
    } catch (err: any) {
      console.warn('[Voicebox Studio Fallback]:', err?.message);
      this.isBuffering = false;
      this.emitState('Ошибка связи с нейросетью. Переключение на локальный синтез.');

      // Fallback to browser SpeechSynthesis
      return this.speakTourGuideFallback(text, 'ru-RU', onEnded);
    }
  }

  // Graceful browser SpeechSynthesis fallback
  private speakTourGuideFallback(text: string, lang = 'ru-RU', onEnd?: () => void): boolean {
    if (!('speechSynthesis' in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = this.playbackSpeed;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
      if (matched) utterance.voice = matched;

      utterance.onend = () => {
        this.isAudioPlaying = false;
        this.emitState();
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isAudioPlaying = false;
        this.emitState();
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
      this.isAudioPlaying = true;
      this.emitState();
      return true;
    } catch {
      this.isAudioPlaying = false;
      this.emitState();
      return false;
    }
  }

  public pause(): void {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.isAudioPlaying = false;
      this.emitState();
    }
  }

  public resume(): void {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play();
      this.isAudioPlaying = true;
      this.emitState();
    }
  }

  public seek(seconds: number): void {
    if (this.audioElement && Number.isFinite(seconds)) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration || 0));
      this.emitState();
    }
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (this.audioElement) {
      this.audioElement.playbackRate = speed;
    }
    this.emitState();
  }

  public setVoice(voiceId: string): void {
    this.currentVoiceId = voiceId;
    this.emitState();
  }

  public toggleReverb(): boolean {
    this.isReverbActive = !this.isReverbActive;
    if (this.wetGain && this.ctx) {
      this.wetGain.gain.setValueAtTime(this.isReverbActive ? 0.35 : 0.0, this.ctx.currentTime);
    }
    this.emitState();
    return this.isReverbActive;
  }

  public togglePurrBackground(): boolean {
    this.isPurrBackgroundActive = !this.isPurrBackgroundActive;
    if (!this.isPurrBackgroundActive && this.isPurring) {
      this.stopPurr();
    } else if (this.isPurrBackgroundActive && this.isAudioPlaying && !this.isPurring) {
      this.togglePurr(0.08);
    }
    this.emitState();
    return this.isPurrBackgroundActive;
  }

  public stopSpeech(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isAudioPlaying = false;
    this.isBuffering = false;
    if (this.isPurrBackgroundActive && this.isPurring) {
      this.stopPurr();
    }
    this.emitState();
  }

  public getIsSpeaking(): boolean {
    return this.isAudioPlaying || this.isBuffering;
  }

  // Returns current frequency bars data for soundwave visualizer (0-255 array)
  public getVisualizerData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(16);
    }
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  // Downloads currently synthesized MP3/WAV audio track
  public downloadCurrentAudio(title: string): void {
    if (!this.currentAudioUrl) return;
    const a = document.createElement('a');
    a.href = this.currentAudioUrl;
    const ext = this.currentAudioUrl.includes('audio/wav') ? 'wav' : 'mp3';
    const cleanTitle = title.replace(/[^\wа-яА-ЯёЁ\s-]/g, '').trim().replace(/\s+/g, '_') || 'audio_guide';
    a.download = `vangogh_audioguide_${cleanTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export const museumAudio = new MuseumAudioEngine();
