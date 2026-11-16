import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Download,
  Loader2,
  Volume2,
  VolumeX,
  Gauge,
  Sliders,
  Check
} from 'lucide-react';
import {
  museumAudio,
  AUDIO_GUIDE_VOICES,
  AudioGuideVoice,
  AudioPlayerState
} from '../utils/museumAudio';
import { useThemeStyle } from '../context/ThemeStyleContext';
import { Artwork } from '../types';

interface VoiceboxAudioGuidePlayerProps {
  artwork: Artwork;
  onClose?: () => void;
  className?: string;
}

export const VoiceboxAudioGuidePlayer: React.FC<VoiceboxAudioGuidePlayerProps> = ({
  artwork,
  onClose,
  className = ''
}) => {
  const { activeTheme } = useThemeStyle();
  const [playerState, setPlayerState] = useState<AudioPlayerState>({
    isPlaying: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    voice: 'ru-RU-DmitryNeural',
    speed: 1.0,
    reverbEnabled: true,
    purrBackgroundEnabled: true,
    error: null
  });

  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [isEffectsOpen, setIsEffectsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to audio engine updates
  useEffect(() => {
    const unsubscribe = museumAudio.subscribe((state) => {
      setPlayerState({ ...state });
    });
    return () => {
      unsubscribe();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Visualizer render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isSubscribed = true;

    const renderWaveform = () => {
      if (!isSubscribed) return;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const data = museumAudio.getVisualizerData();
      const numBars = 28;
      const barWidth = Math.max(2, (width / numBars) - 2.5);

      for (let i = 0; i < numBars; i++) {
        // Sample frequency values or simulate gentle ambient waves if idle
        const val = playerState.isPlaying
          ? (data[i % data.length] || 20) / 255
          : playerState.isBuffering
          ? (Math.sin(Date.now() / 150 + i * 0.4) * 0.4 + 0.5)
          : (Math.sin(Date.now() / 500 + i * 0.3) * 0.15 + 0.2);

        const barHeight = Math.max(3, val * (height * 0.88));
        const x = i * (barWidth + 2.5);
        const y = (height - barHeight) / 2;

        // Gradient colored by active theme
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#f9d423');
        gradient.addColorStop(0.5, '#ff4e50');
        gradient.addColorStop(1, '#6a11cb');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 2) : ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(renderWaveform);
    };

    renderWaveform();

    return () => {
      isSubscribed = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerState.isPlaying, playerState.isBuffering]);

  // Construct narration text for current masterpiece
  const getFullNarrationText = () => {
    return `${artwork.title}. Полотно создано в стиле ${artwork.style}. ${artwork.description}. Обратите внимание на технику мазка: ${artwork.brushstrokeNote || 'пастозный экспрессивный импасто в духе Ван Гога'}.`;
  };

  const handlePlayToggle = async () => {
    if (playerState.isPlaying) {
      museumAudio.pause();
    } else if (playerState.currentTime > 0 && playerState.currentTime < playerState.duration) {
      museumAudio.resume();
    } else {
      await museumAudio.playNeuralNarration(
        getFullNarrationText(),
        artwork.id,
        playerState.voice
      );
    }
  };

  const handleReplay = async () => {
    museumAudio.seek(0);
    if (!playerState.isPlaying) {
      await museumAudio.playNeuralNarration(
        getFullNarrationText(),
        artwork.id,
        playerState.voice
      );
    }
  };

  const handleSelectVoice = async (voice: AudioGuideVoice) => {
    museumAudio.setVoice(voice.id);
    setIsVoiceMenuOpen(false);
    // If playing, re-synthesize with new voice
    if (playerState.isPlaying) {
      await museumAudio.playNeuralNarration(
        getFullNarrationText(),
        artwork.id,
        voice.id
      );
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    museumAudio.seek(val);
  };

  const handleSpeedCycle = () => {
    const speeds = [0.85, 1.0, 1.15, 1.25];
    const nextIdx = (speeds.indexOf(playerState.speed) + 1) % speeds.length;
    museumAudio.setSpeed(speeds[nextIdx]);
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeVoiceObj = AUDIO_GUIDE_VOICES.find(v => v.id === playerState.voice) || AUDIO_GUIDE_VOICES[0];

  return (
    <div
      id="voicebox-audioguide-player"
      style={{
        background: activeTheme.plateBg,
        borderColor: activeTheme.plateBorder,
        boxShadow: activeTheme.plateGlow
      }}
      className={`p-4 sm:p-5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 relative overflow-hidden ${className}`}
    >
      {/* Radiant Top Glow Edge */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 opacity-80" />

      {/* Header bar: Title & Engine Badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-bold shadow-md text-xs">
            🎙️
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-amber-200 font-gaudi">
                Voicebox Studio HD
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono font-medium">
                {activeVoiceObj.category === 'gemini' ? 'Gemini 3.1 Flash' : 'Neural 24kHz'}
              </span>
            </div>
            <p className="text-[11px] text-cyan-200/80 line-clamp-1">
              {artwork.title}
            </p>
          </div>
        </div>

        {/* Right actions: Reverb & Purr status toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => museumAudio.toggleReverb()}
            className={`p-1.5 rounded-xl text-xs transition border cursor-pointer ${
              playerState.reverbEnabled
                ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                : 'bg-slate-900/40 border-slate-700/50 text-slate-400'
            }`}
            title={playerState.reverbEnabled ? 'Эхо зала музея: Включено' : 'Эхо зала музея: Выключено'}
          >
            🏛️
          </button>

          <button
            onClick={() => museumAudio.togglePurrBackground()}
            className={`p-1.5 rounded-xl text-xs transition border cursor-pointer ${
              playerState.purrBackgroundEnabled
                ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                : 'bg-slate-900/40 border-slate-700/50 text-slate-400'
            }`}
            title={playerState.purrBackgroundEnabled ? 'Фоновое мурчание: Включено' : 'Фоновое мурчание: Выключено'}
          >
            🐱
          </button>

          <button
            onClick={() => setIsEffectsOpen(!isEffectsOpen)}
            className={`p-1.5 rounded-xl text-xs transition border cursor-pointer ${
              isEffectsOpen
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:text-cyan-200'
            }`}
            title="Настройки студии звукозаписи"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={() => {
                museumAudio.stopSpeech();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer text-xs ml-1"
              title="Скрыть плеер"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Visualizer & Waveform Bar */}
      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-indigo-950/80 mb-3 flex items-center gap-3">
        <canvas
          ref={canvasRef}
          width={180}
          height={32}
          className="h-8 w-32 sm:w-44 shrink-0 rounded"
        />

        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={playerState.duration || 100}
            step={0.1}
            value={playerState.currentTime}
            onChange={handleSeek}
            disabled={!playerState.duration}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer transition-all"
          />
          <div className="flex justify-between items-center text-[10px] text-cyan-300/70 font-mono mt-1">
            <span>{formatTime(playerState.currentTime)}</span>
            <span>
              {playerState.isBuffering
                ? 'Генерация нейрозвука...'
                : playerState.duration > 0
                ? formatTime(playerState.duration)
                : 'Готов к воспроизведению'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Play / Pause / Voice Switcher / Speed / Download */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Main Play / Pause Button */}
          <button
            onClick={handlePlayToggle}
            disabled={playerState.isBuffering}
            style={{
              background: activeTheme.buttonPrimaryBg,
              borderColor: activeTheme.buttonPrimaryBorder,
              color: activeTheme.buttonPrimaryText,
              boxShadow: activeTheme.buttonPrimaryGlow
            }}
            className="px-4 py-2 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg hover:brightness-110"
          >
            {playerState.isBuffering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Генерация...</span>
              </>
            ) : playerState.isPlaying ? (
              <>
                <Pause className="w-4 h-4 shrink-0" />
                <span>Пауза</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>Слушать гид</span>
              </>
            )}
          </button>

          {/* Replay Button */}
          <button
            onClick={handleReplay}
            className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-cyan-200 border border-cyan-500/30 text-xs transition cursor-pointer"
            title="Начать сначала"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Toggle */}
          <button
            onClick={handleSpeedCycle}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-cyan-200 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer"
            title="Темп речи экскурсовода"
          >
            <Gauge className="w-3 h-3 text-amber-400" />
            <span>{playerState.speed}x</span>
          </button>
        </div>

        {/* Voice Selector Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
            className="px-3 py-1.5 rounded-xl bg-[#0d143a]/90 hover:bg-[#141f59] text-amber-200 border border-amber-400/50 text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <span>{activeVoiceObj.icon}</span>
            <span className="font-bold">{activeVoiceObj.name}</span>
            <span className="text-[10px] text-cyan-300/70">▾</span>
          </button>

          {/* Voice Menu Dropdown */}
          {isVoiceMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#090d29] border border-amber-400/50 rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
              <div className="text-[11px] font-bold text-amber-300/90 px-2 py-1 uppercase tracking-wider font-mono">
                Выберите голос аудиогида
              </div>
              <div className="space-y-1 mt-1 max-h-60 overflow-y-auto pr-1">
                {AUDIO_GUIDE_VOICES.map((v) => {
                  const isSelected = v.id === playerState.voice;
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVoice(v)}
                      className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-400/20 border border-amber-400/60 text-amber-200'
                          : 'hover:bg-indigo-950/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{v.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight truncate">
                            {v.name}
                          </div>
                          <div className="text-[10px] text-cyan-300/70 leading-tight truncate">
                            {v.subtitle}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Download Audio Guide Button */}
        <button
          onClick={() => museumAudio.downloadCurrentAudio(artwork.title)}
          className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-cyan-200 border border-cyan-500/30 text-xs transition cursor-pointer"
          title="Скачать запись экскурсии (MP3 / WAV)"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded Studio DSP Effects Panel */}
      {isEffectsOpen && (
        <div className="mt-3 pt-3 border-t border-indigo-950/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="bg-[#070b24]/90 p-2.5 rounded-xl border border-indigo-900/60 flex items-center justify-between">
            <div>
              <div className="font-bold text-amber-200 flex items-center gap-1.5">
                <span>🏛️</span>
                <span>Эхо залов Лувра</span>
              </div>
              <p className="text-[10px] text-cyan-300/70">
                Конволюционная реверберация музейной галереи
              </p>
            </div>
            <button
              onClick={() => museumAudio.toggleReverb()}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                playerState.reverbEnabled
                  ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {playerState.reverbEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>

          <div className="bg-[#070b24]/90 p-2.5 rounded-xl border border-indigo-900/60 flex items-center justify-between">
            <div>
              <div className="font-bold text-amber-200 flex items-center gap-1.5">
                <span>🐱</span>
                <span>Мурчание кота на фоне</span>
              </div>
              <p className="text-[10px] text-cyan-300/70">
                Успокаивающая низкочастотная акустика (~25 Гц)
              </p>
            </div>
            <button
              onClick={() => museumAudio.togglePurrBackground()}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                playerState.purrBackgroundEnabled
                  ? 'bg-amber-400/20 border-amber-400/60 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              {playerState.purrBackgroundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
