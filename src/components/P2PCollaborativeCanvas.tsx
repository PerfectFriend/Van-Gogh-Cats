import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Palette, 
  Users, 
  RotateCcw, 
  Trash2, 
  Download, 
  Sparkles, 
  Paintbrush, 
  Feather, 
  Sun, 
  Moon, 
  Share2,
  Eye,
  Check
} from 'lucide-react';
import { ArtistProfile, BrushTextureStyle, CanvasStroke, PeerCanvasCursor, StrokePoint, Artwork } from '../types';
import { collabCanvasManager, renderStrokeOnCanvas } from '../utils/p2pCollaborativeCanvas';

interface P2PCollaborativeCanvasProps {
  artistProfile: ArtistProfile;
  onSaveToGallery: (artwork: Artwork) => void;
}

const PALETTE_COLORS = [
  { name: 'Золотой кадмий', hex: '#facc15' },
  { name: 'Арльская охра', hex: '#d97706' },
  { name: 'Синий ультрамарин', hex: '#1d4ed8' },
  { name: 'Ночной индиго', hex: '#1e1b4b' },
  { name: 'Бирюзовый миндаль', hex: '#06b6d4' },
  { name: 'Виридиановая зелень', hex: '#059669' },
  { name: 'Звёздный крем', hex: '#fef9c3' },
  { name: 'Грозовой кипарис', hex: '#1c1917' },
  { name: 'Винный краплак', hex: '#dc2626' },
];

const BRUSH_STYLES: { id: BrushTextureStyle; name: string; icon: any; desc: string }[] = [
  { id: 'impasto', name: 'Густой импасто', icon: Paintbrush, desc: 'Объёмный мазок маслом с теневым срезом' },
  { id: 'starry_swirl', name: 'Звёздный вихрь', icon: Moon, desc: 'Динамичная спираль со светящимся ореолом' },
  { id: 'sunflower_dab', name: 'Подсолнечный тычок', icon: Sun, desc: 'Точечный рельефный тычок охрой' },
  { id: 'palette_knife', name: 'Мастихин', icon: Feather, desc: 'Широкий плоский срез лезвия ножа' },
  { id: 'almond_branch', name: 'Ветка миндаля', icon: Sparkles, desc: 'Тонкая японская графичная линия' },
];

export const P2PCollaborativeCanvas: React.FC<P2PCollaborativeCanvasProps> = ({
  artistProfile,
  onSaveToGallery,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE_COLORS[0].hex);
  const [brushWidth, setBrushWidth] = useState<number>(14);
  const [brushStyle, setBrushStyle] = useState<BrushTextureStyle>('impasto');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<StrokePoint[]>([]);
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<PeerCanvasCursor[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [activePeersInRoom, setActivePeersInRoom] = useState<{ id: string; name: string; color: string }[]>([
    { id: 'peer_theo', name: 'Тео Ван Гог', color: 'bg-blue-600' },
    { id: 'peer_arles', name: 'Арльский Мурлыка', color: 'bg-emerald-600' },
    { id: artistProfile.id, name: `${artistProfile.name} (Вы)`, color: 'bg-amber-500' },
  ]);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill subtle canvas texture (warm primed linen)
    ctx.fillStyle = '#1c140e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid linen grain
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Render historical strokes
    for (const stroke of strokes) {
      renderStrokeOnCanvas(ctx, stroke);
    }
  }, [strokes]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle incoming P2P collaborative events
  useEffect(() => {
    const unsubscribe = collabCanvasManager.subscribe((event) => {
      if (event.type === 'stroke') {
        setStrokes((prev) => [...prev, event.payload]);
      } else if (event.type === 'cursor') {
        setRemoteCursors((prev) => {
          const filtered = prev.filter((c) => c.peerId !== event.payload.peerId);
          return [...filtered, event.payload];
        });
      } else if (event.type === 'clear') {
        setStrokes([]);
      }
    });

    // Send presence sync
    collabCanvasManager.requestSync(artistProfile.id);

    return () => {
      unsubscribe();
    };
  }, [artistProfile.id]);

  // Mouse / Touch handlers for drawing
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = ('touches' in e && e.touches && e.touches.length > 0) 
      ? e.touches[0] 
      : (('changedTouches' in e && (e as any).changedTouches && (e as any).changedTouches.length > 0) 
        ? (e as any).changedTouches[0] 
        : null);
    const clientX = touch ? touch.clientX : ('clientX' in e ? e.clientX : 0);
    const clientY = touch ? touch.clientY : ('clientY' in e ? e.clientY : 0);
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setCurrentStrokePoints([coords]);

    // Broadcast cursor position
    collabCanvasManager.broadcastCursor({
      peerId: artistProfile.id,
      peerName: artistProfile.name,
      peerAvatarColor: artistProfile.avatarColor,
      x: coords.x,
      y: coords.y,
      isDrawing: true,
      activeColor: selectedColor,
      lastActive: Date.now(),
    });
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    // Broadcast cursor even when not drawing (to see friend pointers)
    collabCanvasManager.broadcastCursor({
      peerId: artistProfile.id,
      peerName: artistProfile.name,
      peerAvatarColor: artistProfile.avatarColor,
      x: coords.x,
      y: coords.y,
      isDrawing,
      activeColor: selectedColor,
      lastActive: Date.now(),
    });

    if (!isDrawing) return;

    setCurrentStrokePoints((prev) => [...prev, coords]);

    // Draw live stroke segment
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx && currentStrokePoints.length > 0) {
        const lastPt = currentStrokePoints[currentStrokePoints.length - 1];
        renderStrokeOnCanvas(ctx, {
          id: 'temp',
          peerId: artistProfile.id,
          peerName: artistProfile.name,
          peerAvatarColor: artistProfile.avatarColor,
          color: selectedColor,
          width: brushWidth,
          brushStyle,
          points: [lastPt, coords],
          timestamp: Date.now(),
        });
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || currentStrokePoints.length === 0) {
      setIsDrawing(false);
      return;
    }

    const newStroke: CanvasStroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      peerId: artistProfile.id,
      peerName: artistProfile.name,
      peerAvatarColor: artistProfile.avatarColor,
      color: selectedColor,
      width: brushWidth,
      brushStyle,
      points: currentStrokePoints,
      timestamp: Date.now(),
    };

    setStrokes((prev) => [...prev, newStroke]);
    collabCanvasManager.broadcastStroke(newStroke);

    setIsDrawing(false);
    setCurrentStrokePoints([]);
  };

  const handleClear = () => {
    if (window.confirm('Очистить общий холст мастерской для всех подключённых друзей?')) {
      setStrokes([]);
      collabCanvasManager.broadcastClear(artistProfile.id);
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleSaveToGallery = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const newArtwork: Artwork = {
      id: `collab_${Date.now()}`,
      title: `Совместное полотно артели: «${artistProfile.name} и друзья»`,
      titleEn: `Guild Collaborative Canvas: ${artistProfile.name} & Friends`,
      description: 'Коллективный холст, созданный в реальном времени через синхронизированную P2P мастерскую с живыми курсорами.',
      imageUrl: dataUrl,
      prompt: 'Collaborative live canvas painted by Van Gogh guild peers with impasto brushes',
      style: 'Синхронный постимпрессионизм',
      year: '2026',
      brushstrokeNote: 'Фактурные мазки маслом, нанесённые в реальном времени несколькими мастерами артели.',
      aspectRatio: '16:9',
      createdAt: Date.now(),
      likes: 12,
      palette: [
        { hex: selectedColor, name: 'Ведущий цвет палитры' },
        { hex: '#facc15', name: 'Золотой кадмий' },
        { hex: '#1d4ed8', name: 'Синий ультрамарин' },
        { hex: '#1c140e', name: 'Грунтованный лён' },
      ],
      isUserCreated: true,
      authorId: artistProfile.id,
      authorName: artistProfile.name,
      source: 'my-local',
      isBackedUpLocally: true,
    };

    onSaveToGallery(newArtwork);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Header with live room status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-800/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Paintbrush className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-serif font-bold text-amber-100">
              Совместный живой холст (P2P Collaborative Studio)
            </h3>
          </div>
          <p className="text-sm text-amber-300/80 mt-1">
            Синхронная живопись в реальном времени с отображением курсоров друзей и импасто-текстурами Ван Гога
          </p>
        </div>

        {/* Live connected artists pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-900/40 border border-amber-700/50 text-xs text-amber-200">
            <Users className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>В студии:</span>
            <span className="font-bold text-amber-100">{activePeersInRoom.length} мастера</span>
          </div>

          <button
            onClick={handleSaveToGallery}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-amber-950 font-bold text-xs shadow-lg transition-all active:scale-95"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Сохранено в галерею!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Сохранить шедевр</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toolbar: Colors, Brushes, Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-black/30 p-3 rounded-xl border border-amber-800/30">
        {/* Color Palette */}
        <div className="lg:col-span-4 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-amber-300/70 mr-1 font-medium">Палитра:</span>
          {PALETTE_COLORS.map((col) => (
            <button
              key={col.hex}
              onClick={() => setSelectedColor(col.hex)}
              title={col.name}
              className={`w-7 h-7 rounded-full transition-transform active:scale-90 border-2 ${
                selectedColor === col.hex ? 'border-white scale-110 shadow-md ring-2 ring-amber-400' : 'border-black/50 hover:scale-105'
              }`}
              style={{ backgroundColor: col.hex }}
            />
          ))}
        </div>

        {/* Brush Styles */}
        <div className="lg:col-span-5 flex items-center gap-1 flex-wrap">
          <span className="text-xs text-amber-300/70 mr-1 font-medium">Кисть:</span>
          {BRUSH_STYLES.map((b) => {
            const Icon = b.icon;
            const isSelected = brushStyle === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBrushStyle(b.id)}
                title={b.desc}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-amber-950 font-bold shadow'
                    : 'bg-amber-950/60 text-amber-200 hover:bg-amber-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* Brush Size & Controls */}
        <div className="lg:col-span-3 flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-300/70">Толщина:</span>
            <input
              type="range"
              min={4}
              max={36}
              value={brushWidth}
              onChange={(e) => setBrushWidth(Number(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-amber-200 w-5">{brushWidth}px</span>
          </div>

          <button
            onClick={handleUndo}
            title="Отменить последний мазок"
            className="p-1.5 rounded-lg bg-amber-900/40 hover:bg-amber-800/60 text-amber-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title="Очистить весь холст"
            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area with Live Cursors */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-amber-700/50 shadow-inner bg-[#1c140e] select-none touch-none">
        <canvas
          ref={canvasRef}
          width={1024}
          height={576}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full h-auto cursor-crosshair block"
        />

        {/* Remote Cursors floating overlay */}
        {remoteCursors.map((cursor) => (
          <div
            key={cursor.peerId}
            className="absolute pointer-events-none transition-all duration-75 flex flex-col items-start z-20"
            style={{
              left: `${(cursor.x / 1024) * 100}%`,
              top: `${(cursor.y / 576) * 100}%`,
              transform: 'translate(4px, 4px)',
            }}
          >
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/80 border border-amber-400 text-[10px] text-amber-100 shadow-md">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cursor.activeColor }} />
              <span className="font-bold">{cursor.peerName}</span>
              {cursor.isDrawing && <span className="text-amber-400 font-serif italic text-[9px]">(пишет...)</span>}
            </div>
            {/* Artistic cursor tip */}
            <div
              className="w-3 h-3 rounded-full border border-white -mt-1 -ml-1 opacity-70"
              style={{ backgroundColor: cursor.activeColor }}
            />
          </div>
        ))}
      </div>

      {/* Studio Info Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-400/80 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Все мазки синхронизируются через бессерверные P2P Data Channels и BroadcastChannel с сохранением рельефа импасто.</span>
        </div>
        <div className="text-amber-300/60">
          Всего нанесено мазков: <span className="font-bold text-amber-200">{strokes.length}</span>
        </div>
      </div>
    </div>
  );
};
