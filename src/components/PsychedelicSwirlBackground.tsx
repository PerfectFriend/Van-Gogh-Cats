import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Eye, Wind } from 'lucide-react';

export type PsychedelicTheme = 'starry_vortex' | 'gaudi_mosaic' | 'neon_arles';

interface SwirlPoint {
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  armCount: number;
  colorType: 'gold' | 'cyan' | 'magenta' | 'azure';
}

interface MosaicShard {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  driftX: number;
  driftY: number;
  points: number[];
  color: string;
  opacity: number;
}

export const PsychedelicSwirlBackground: React.FC<{
  theme?: PsychedelicTheme;
  onThemeChange?: (theme: PsychedelicTheme) => void;
}> = ({ theme = 'starry_vortex', onThemeChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentTheme, setCurrentTheme] = useState<PsychedelicTheme>(theme);
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initElements();
    };
    window.addEventListener('resize', handleResize);

    // Initialize swirling vortexes and mosaic shards
    let swirls: SwirlPoint[] = [];
    let shards: MosaicShard[] = [];
    let time = 0;

    const initElements = () => {
      swirls = [
        // Top right major Van Gogh celestial vortex
        { x: width * 0.82, y: height * 0.22, radius: Math.min(width, height) * 0.38, angle: 0, speed: 0.0018, armCount: 5, colorType: 'gold' },
        // Upper left cobalt-cyan terrace swirl
        { x: width * 0.18, y: height * 0.35, radius: Math.min(width, height) * 0.32, angle: 1.2, speed: -0.0015, armCount: 4, colorType: 'azure' },
        // Lower center-right Gaudi mosaic nexus
        { x: width * 0.65, y: height * 0.78, radius: Math.min(width, height) * 0.35, angle: 2.4, speed: 0.002, armCount: 6, colorType: 'magenta' },
        // Bottom left electric cyan stream
        { x: width * 0.28, y: height * 0.88, radius: Math.min(width, height) * 0.28, angle: 3.6, speed: -0.0018, armCount: 3, colorType: 'cyan' },
      ];

      // Gaudí Trencadís Mosaic Shards (broken glazed ceramic shards that float and shimmer)
      shards = [];
      const shardColors = currentTheme === 'gaudi_mosaic'
        ? ['#ffb703', '#00f5d4', '#f72585', '#4361ee', '#ffd166', '#7209b7']
        : currentTheme === 'neon_arles'
        ? ['#00f5d4', '#06d6a0', '#f72585', '#b5179e', '#ffd166']
        : ['#ffd166', '#ffb703', '#fb8500', '#00f5d4', '#4361ee'];

      const shardCount = Math.floor(Math.min(width, 1600) / 45);
      for (let i = 0; i < shardCount; i++) {
        // irregular 3-to-5-sided polygon
        const sides = Math.floor(Math.random() * 3) + 3;
        const pts: number[] = [];
        for (let s = 0; s < sides; s++) {
          const a = (s / sides) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const r = 0.5 + Math.random() * 0.6;
          pts.push(Math.cos(a) * r, Math.sin(a) * r);
        }

        shards.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 16 + 8,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.006,
          driftX: (Math.random() - 0.5) * 0.25,
          driftY: -Math.random() * 0.35 - 0.05,
          points: pts,
          color: shardColors[Math.floor(Math.random() * shardColors.length)],
          opacity: Math.random() * 0.45 + 0.25,
        });
      }
    };

    initElements();

    // Render loop
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Deep celestial gradient base
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (currentTheme === 'gaudi_mosaic') {
        bgGrad.addColorStop(0, '#0a0824');
        bgGrad.addColorStop(0.5, '#070f2a');
        bgGrad.addColorStop(1, '#050716');
      } else if (currentTheme === 'neon_arles') {
        bgGrad.addColorStop(0, '#060c22');
        bgGrad.addColorStop(0.5, '#120726');
        bgGrad.addColorStop(1, '#040614');
      } else {
        bgGrad.addColorStop(0, '#060818');
        bgGrad.addColorStop(0.4, '#090d28');
        bgGrad.addColorStop(0.8, '#0b0f32');
        bgGrad.addColorStop(1, '#050716');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw swirling Van Gogh strokes
      swirls.forEach((swirl, sIdx) => {
        swirl.angle += swirl.speed;

        ctx.save();
        ctx.translate(swirl.x, swirl.y);

        // Multiple concentric arms with thick impressionist dashes
        const totalRings = 7;
        for (let ring = 1; ring <= totalRings; ring++) {
          const r = (ring / totalRings) * swirl.radius;
          const strokeCount = ring * 8;

          for (let i = 0; i < strokeCount; i++) {
            const baseAngle = (i / strokeCount) * Math.PI * 2 + swirl.angle * (1 + ring * 0.2);
            // Archimedean spiral offset
            const spiralR = r + Math.sin(baseAngle * 3 + time * 0.8) * 8;
            const x = Math.cos(baseAngle) * spiralR;
            const y = Math.sin(baseAngle) * spiralR;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(baseAngle + Math.PI / 2 + 0.2);

            // Palette selection based on theme and swirl
            let strokeColor = 'rgba(255, 183, 3, 0.15)';
            if (swirl.colorType === 'gold') {
              strokeColor = i % 2 === 0 ? 'rgba(255, 209, 102, 0.22)' : 'rgba(251, 133, 0, 0.16)';
            } else if (swirl.colorType === 'cyan') {
              strokeColor = i % 2 === 0 ? 'rgba(0, 245, 212, 0.2)' : 'rgba(0, 180, 216, 0.16)';
            } else if (swirl.colorType === 'magenta') {
              strokeColor = i % 2 === 0 ? 'rgba(247, 37, 133, 0.18)' : 'rgba(114, 9, 183, 0.15)';
            } else {
              strokeColor = i % 2 === 0 ? 'rgba(67, 97, 238, 0.22)' : 'rgba(0, 245, 212, 0.14)';
            }

            ctx.fillStyle = strokeColor;
            // Rounded impressionist impasto stroke
            const strokeLength = 12 + Math.sin(i + time) * 6;
            const strokeWidth = 3.5 + Math.cos(ring) * 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, strokeLength, strokeWidth, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        }

        // Radiant star / mosaic core
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, swirl.radius * 0.35);
        if (swirl.colorType === 'gold') {
          coreGrad.addColorStop(0, 'rgba(255, 235, 140, 0.45)');
          coreGrad.addColorStop(0.3, 'rgba(255, 183, 3, 0.25)');
          coreGrad.addColorStop(1, 'transparent');
        } else if (swirl.colorType === 'cyan') {
          coreGrad.addColorStop(0, 'rgba(165, 243, 252, 0.4)');
          coreGrad.addColorStop(0.3, 'rgba(0, 245, 212, 0.2)');
          coreGrad.addColorStop(1, 'transparent');
        } else {
          coreGrad.addColorStop(0, 'rgba(251, 207, 232, 0.35)');
          coreGrad.addColorStop(0.3, 'rgba(247, 37, 133, 0.18)');
          coreGrad.addColorStop(1, 'transparent');
        }
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, swirl.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw floating Gaudí Trencadís Mosaic Shards (Ceramics)
      shards.forEach((shard) => {
        shard.x += shard.driftX;
        shard.y += shard.driftY;
        shard.rotation += shard.rotationSpeed;

        // Wrap around screen
        if (shard.y < -30) shard.y = height + 30;
        if (shard.x < -30) shard.x = width + 30;
        if (shard.x > width + 30) shard.x = -30;

        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rotation);

        // Iridescent reflection highlight
        const pulse = Math.sin(time * 2 + shard.x) * 0.25 + 0.75;
        ctx.fillStyle = shard.color;
        ctx.globalAlpha = shard.opacity * pulse;
        ctx.shadowColor = shard.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        for (let p = 0; p < shard.points.length; p += 2) {
          const px = shard.points[p] * shard.size;
          const py = shard.points[p + 1] * shard.size;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Gilded ceramic grout rim (Gaudi mosaic edge)
        ctx.strokeStyle = 'rgba(255, 235, 160, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentTheme]);

  const handleSelectTheme = (newTheme: PsychedelicTheme) => {
    setCurrentTheme(newTheme);
    onThemeChange?.(newTheme);
  };

  return (
    <>
      {/* Fixed Psychedelic Living Canvas in Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 select-none opacity-85"
        style={{ filter: 'contrast(1.08) saturate(1.15)' }}
      />

      {/* Floating Theme Control Pill */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="relative">
          {isControlsOpen && (
            <div className="absolute bottom-12 right-0 bg-[#080d28]/95 border-2 border-cyan-400/60 rounded-2xl p-3 shadow-[0_0_30px_rgba(0,245,212,0.3)] backdrop-blur-xl w-64 space-y-2 mb-2 animate-fade-in text-xs font-sans">
              <div className="flex items-center justify-between pb-1.5 border-b border-indigo-900/60">
                <span className="font-gaudi font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  Психоделический фон
                </span>
                <button
                  onClick={() => setIsControlsOpen(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer font-bold px-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => handleSelectTheme('starry_vortex')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-between ${
                    currentTheme === 'starry_vortex'
                      ? 'bg-amber-500/20 text-yellow-300 border border-amber-400/50 font-bold'
                      : 'hover:bg-[#121946] text-slate-300'
                  }`}
                >
                  <span>🌌 Звёздный вихрь Ван Гога</span>
                  {currentTheme === 'starry_vortex' && <span className="text-[10px]">●</span>}
                </button>

                <button
                  onClick={() => handleSelectTheme('gaudi_mosaic')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-between ${
                    currentTheme === 'gaudi_mosaic'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold'
                      : 'hover:bg-[#121946] text-slate-300'
                  }`}
                >
                  <span>🦎 Калейдоскоп Гауди (Тренкандис)</span>
                  {currentTheme === 'gaudi_mosaic' && <span className="text-[10px]">●</span>}
                </button>

                <button
                  onClick={() => handleSelectTheme('neon_arles')}
                  className={`w-full text-left px-2.5 py-2 rounded-xl transition cursor-pointer flex items-center justify-between ${
                    currentTheme === 'neon_arles'
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/50 font-bold'
                      : 'hover:bg-[#121946] text-slate-300'
                  }`}
                >
                  <span>🌸 Неоновый сад ночного Арля</span>
                  {currentTheme === 'neon_arles' && <span className="text-[10px]">●</span>}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsControlsOpen(prev => !prev)}
            className="cyber-btn-gold px-3.5 py-2 rounded-full text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(255,183,3,0.4)] cursor-pointer active:scale-95 transition-all font-gaudi"
            title="Переключить психоделическую ауру фона"
          >
            <Wind className="w-3.5 h-3.5 text-slate-950 animate-spin" style={{ animationDuration: '9s' }} />
            <span className="font-bold hidden sm:inline">Фон: Ван Гог & Гауди</span>
          </button>
        </div>
      </div>
    </>
  );
};
