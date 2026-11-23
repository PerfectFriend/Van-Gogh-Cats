import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Award,
  Cpu,
  ImagePlus,
  X,
  Palette,
  Layers,
  LogIn,
} from 'lucide-react';
import { VAN_GOGH_STYLE_PRESETS, MODEL_OPTIONS } from '../data/stylePresets';
import { AspectRatioType, ImageSizeType, ReferenceCatPhoto } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedPresets } from '../utils/i18n';
import { useThemeStyle } from '../context/ThemeStyleContext';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { useLongPress } from '../hooks/useLongPress';
import { ActionMenuSheet, ActionMenuItem } from './instagram/ActionMenuSheet';

export interface StudioGenerateParams {
  prompt: string;
  model: string;
  aspectRatio: AspectRatioType;
  imageSize: ImageSizeType;
  stylePresetId: string;
  customStylePrompt: string;
  referenceImages: ReferenceCatPhoto[];
  batchCount: 1 | 3;
}

interface ArtStudioGeneratorProps {
  onGenerate: (params: StudioGenerateParams) => Promise<void>;
  isGenerating: boolean;
  generationProgress?: { current: number; total: number } | null;
  error: string | null;
  onClearError: () => void;
  onSelectRandomCurated: () => void;
  activeModel: string;
  onModelChange: (model: string) => void;
  isBannedReadOnly?: boolean;
  externalPrompt?: string;
  activeCat?: { name: string; breed: string; distinctiveMarks: string } | null;
  onOpenCatPassport?: () => void;
}

async function resizePhotoToDataUrl(file: File): Promise<ReferenceCatPhoto> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  if (typeof document === 'undefined') {
    return {
      id: `cat_ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      dataUrl: rawUrl,
      mimeType: file.type || 'image/jpeg',
      name: file.name,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1024;
      let width = img.naturalWidth || maxDim;
      let height = img.naturalHeight || maxDim;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          id: `cat_ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          dataUrl: rawUrl,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
        });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
      resolve({
        id: `cat_ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        dataUrl,
        mimeType: 'image/jpeg',
        name: file.name,
      });
    };
    img.onerror = () =>
      resolve({
        id: `cat_ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        dataUrl: rawUrl,
        mimeType: file.type || 'image/jpeg',
        name: file.name,
      });
    img.src = rawUrl;
  });
}

export const ArtStudioGenerator: React.FC<ArtStudioGeneratorProps> = ({
  onGenerate,
  isGenerating,
  generationProgress,
  error,
  onClearError,
  onSelectRandomCurated,
  activeModel,
  onModelChange,
  isBannedReadOnly,
  externalPrompt,
  activeCat,
  onOpenCatPassport,
}) => {
  const { t } = useTranslation();
  const { activeStyleId, setActiveStyleId, allThemes } = useThemeStyle();
  const {
    googleUser,
    signInWithGoogle,
    isSigningIn,
    cloudCustomStylePrompt,
    updateCloudStylePreferences,
  } = useFirebaseAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState(t.quickPrompts?.[0] || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(activeStyleId || 'starry_night');
  const [useCustomStyle, setUseCustomStyle] = useState<boolean>(false);
  const [customStylePrompt, setCustomStylePrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('1:1');
  const [imageSize, setImageSize] = useState<ImageSizeType>('1K');
  const [batchCount, setBatchCount] = useState<1 | 3>(1);
  const [referenceImages, setReferenceImages] = useState<ReferenceCatPhoto[]>([]);
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (activeStyleId && activeStyleId !== selectedPresetId) {
      setSelectedPresetId(activeStyleId);
    }
  }, [activeStyleId]);

  useEffect(() => {
    if (cloudCustomStylePrompt && !customStylePrompt) {
      setCustomStylePrompt(cloudCustomStylePrompt);
    }
  }, [cloudCustomStylePrompt]);

  useEffect(() => {
    if (externalPrompt) {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  const localizedPresets = getLocalizedPresets(VAN_GOGH_STYLE_PRESETS, t);
  const selectedPreset = localizedPresets.find((p) => p.id === selectedPresetId) || localizedPresets[0];
  const currentModelInfo = MODEL_OPTIONS.find((m) => m.id === activeModel) || MODEL_OPTIONS[0];
  const supports4K =
    activeModel === 'gemini-nano-banana-2.1' || activeModel === 'gemini-3-pro-image';

  const aspectRatios: { id: AspectRatioType; label: string }[] = [
    { id: '1:1', label: '1:1' },
    { id: '4:3', label: '4:3' },
    { id: '3:4', label: '3:4' },
    { id: '16:9', label: '16:9' },
    { id: '9:16', label: '9:16' },
    ...(supports4K
      ? [
          { id: '4:1' as AspectRatioType, label: '4:1' },
          { id: '1:4' as AspectRatioType, label: '1:4' },
        ]
      : []),
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 4 - referenceImages.length);
    const chosen = files.slice(0, remainingSlots);
    const processed = await Promise.all(chosen.map((f: File) => resizePhotoToDataUrl(f)));
    setReferenceImages((prev) => [...prev, ...processed].slice(0, 4));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveRefPhoto = (id: string) => {
    setReferenceImages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (isBannedReadOnly) {
      setLocalError(t.bannedReadOnlyAlert);
      return;
    }
    if (!googleUser) {
      setLocalError('Для генерации новых картин с ИИ сначала войдите через Google.');
      return;
    }
    if ((!prompt.trim() && referenceImages.length === 0) || isGenerating) return;

    const effectivePrompt =
      prompt.trim() ||
      'Мои любимые котики с фотографий в выразительной художественной композиции';

    if (googleUser && useCustomStyle && customStylePrompt.trim()) {
      updateCloudStylePreferences(selectedPresetId, customStylePrompt.trim()).catch(() => {});
    }

    await onGenerate({
      prompt: effectivePrompt,
      model: activeModel,
      aspectRatio,
      imageSize: supports4K ? imageSize : '1K',
      stylePresetId: selectedPresetId,
      customStylePrompt: useCustomStyle ? customStylePrompt.trim() : '',
      referenceImages,
      batchCount,
    });
  };

  const handleSelectPreset = (id: string) => {
    setUseCustomStyle(false);
    setSelectedPresetId(id);
    setActiveStyleId(id);
  };

  const generateBtnLongPress = useLongPress({
    onLongPress: () => setIsOptionsSheetOpen(true),
    delay: 420,
  });

  const optionsItems: ActionMenuItem[] = [
    ...MODEL_OPTIONS.map((opt) => ({
      id: `model-${opt.id}`,
      label: `Модель: ${opt.name}`,
      sublabel: opt.description,
      icon: <Cpu className={`w-5 h-5 ${opt.id === activeModel ? 'text-amber-400' : 'text-slate-400'}`} />,
      badgeText: opt.id === activeModel ? 'Активна' : opt.badge,
      highlight: opt.id === activeModel,
      onClick: () => onModelChange(opt.id),
    })),
    ...(supports4K
      ? (['1K', '2K', '4K'] as ImageSizeType[]).map((sz) => ({
          id: `size-${sz}`,
          label: `Разрешение холста: ${sz}`,
          sublabel: sz === '4K' ? 'Сверхвысокая детализация мазков' : 'Стандартная скорость',
          icon: <Sparkles className={`w-5 h-5 ${imageSize === sz ? 'text-cyan-300' : 'text-slate-400'}`} />,
          badgeText: imageSize === sz ? 'Выбрано' : undefined,
          onClick: () => setImageSize(sz),
        }))
      : []),
    ...(onOpenCatPassport
      ? [
          {
            id: 'opt-passport',
            label: 'Выбрать кота из Паспорта',
            sublabel: 'Подставить породу и особые приметы в описание',
            icon: <Award className="w-5 h-5 text-cyan-400" />,
            onClick: onOpenCatPassport,
          },
        ]
      : []),
    {
      id: 'opt-sample',
      label: `Подставить сюжет «${selectedPreset.name.split(' (')[0]}»`,
      sublabel: 'Готовое описание для выбранного стиля',
      icon: <Sparkles className="w-5 h-5 text-amber-300" />,
      onClick: () => {
        if (selectedPreset.samplePrompt) setPrompt(selectedPreset.samplePrompt);
      },
    },
  ];

  return (
    <section className="max-w-2xl mx-auto px-3 sm:px-0 py-2 sm:py-6 space-y-5">
      {/* Studio Header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>Арт-Студия</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-[11px] font-semibold text-amber-300">
              {currentModelInfo.name}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {supports4K ? `${imageSize} · ` : ''}Формат {aspectRatio}
            {referenceImages.length > 0 ? ` · Фото котов: ${referenceImages.length}/4` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!googleUser && (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={isSigningIn}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-cyan-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Войти через Google для сохранения галереи в облако"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Google</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOptionsSheetOpen(true)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
            title="Выбор модели Nano Banana 2, разрешения 1K/2K/4K и паспорта кота"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-300" />
            <span>Параметры</span>
          </button>
        </div>
      </div>

      {/* Main Composer Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#090c1a]/90 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-5 backdrop-blur-md"
      >
        {/* Multi-Photo Cat Upload Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-200 flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4 text-cyan-300" />
              <span>Фото ваших котиков (до 4 шт.)</span>
            </span>
            <span className="text-slate-400">
              {referenceImages.length > 0
                ? `${referenceImages.length}/4 загружено`
                : 'Опционально'}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {referenceImages.length < 4 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-cyan-400/40 hover:border-cyan-300 bg-cyan-950/20 flex flex-col items-center justify-center gap-1 text-[11px] text-cyan-200 shrink-0 cursor-pointer transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-cyan-300" />
                <span>+ Фото</span>
              </button>
            )}

            {referenceImages.map((img, idx) => (
              <div
                key={img.id}
                className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/20 shrink-0 bg-black"
              >
                <img
                  src={img.dataUrl}
                  alt={img.name || `Кот #${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRefPhoto(img.id)}
                  aria-label="Удалить фото"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white flex items-center justify-center hover:bg-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Prompt Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Сюжет или сцена с котиками</span>
            {activeCat && (
              <span className="text-amber-300 font-medium truncate max-w-[200px]">
                Кот: {activeCat.name}
              </span>
            )}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              referenceImages.length > 0
                ? 'Например: Мои котики сидят вместе на веранде ночного кафе под звёздным небом...'
                : t.promptPlaceholder
            }
            rows={3}
            disabled={isGenerating}
            className="w-full rounded-xl bg-black/50 border border-white/10 focus:border-white/30 focus:outline-none text-slate-100 placeholder-slate-500 p-3.5 text-sm leading-relaxed resize-none"
          />
        </div>

        {/* Style Carousel + Custom Style Mode */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Стиль вашей галереи</span>
            <button
              type="button"
              onClick={() => setUseCustomStyle((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                useCustomStyle
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-white/10 text-amber-300 hover:bg-white/15'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>{useCustomStyle ? 'Свой стиль (вкл)' : 'Написать свой стиль'}</span>
            </button>
          </div>

          {useCustomStyle ? (
            <textarea
              value={customStylePrompt}
              onChange={(e) => setCustomStylePrompt(e.target.value)}
              placeholder="Опишите ваш фирменный стиль: например, витражная мозаика Гауди с тёплым золотым сиянием, густыми мазками масла и глубоким кобальтом..."
              rows={2}
              disabled={isGenerating}
              className="w-full rounded-xl bg-black/50 border border-amber-400/50 focus:border-amber-300 focus:outline-none text-amber-100 placeholder-slate-500 p-3 text-xs leading-relaxed resize-none"
            />
          ) : (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {localizedPresets.map((preset) => {
                const isSelected = !useCustomStyle && selectedPresetId === preset.id;
                const matchingTheme = allThemes.find((th) => th.id === preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className="flex flex-col items-center gap-1.5 w-20 shrink-0 cursor-pointer group"
                  >
                    <div
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-amber-400 scale-[1.02]'
                          : 'border-white/10 opacity-75 group-hover:opacity-100'
                      }`}
                    >
                      {matchingTheme ? (
                        <img
                          src={matchingTheme.bgImageUrl}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1] || preset.colors[0]})`,
                          }}
                        />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] truncate w-full text-center ${
                        isSelected ? 'text-white font-semibold' : 'text-slate-400'
                      }`}
                    >
                      {preset.name.split(' (')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Aspect Ratio + Gallery Batch Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {aspectRatios.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAspectRatio(item.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  aspectRatio === item.id
                    ? 'bg-white text-slate-950'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setBatchCount(1)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                batchCount === 1 ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              1 картина
            </button>
            <button
              type="button"
              onClick={() => setBatchCount(3)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                batchCount === 3 ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
              title="Создать сразу серию из 3 картин в едином стиле"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Серия ×3</span>
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        {isBannedReadOnly ? (
          <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{t.bannedReadOnlyAlert}</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isGenerating || (!prompt.trim() && referenceImages.length === 0)}
            {...generateBtnLongPress.handlers}
            className={`w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isGenerating || (!prompt.trim() && referenceImages.length === 0)
                ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-105 active:scale-[0.99]'
            }`}
            title="Нажмите для создания · Удерживайте для настроек Nano Banana 2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {generationProgress
                    ? `Создаём ${generationProgress.current} из ${generationProgress.total}...`
                    : t.generatingBtn}
                </span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>
                  {batchCount === 3 ? 'Создать серию из 3 картин' : t.generateBtn}
                </span>
              </>
            )}
          </button>
        )}
      </form>

      {/* Error Notice */}
      {(error || localError) && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-amber-300">{t.errorGenerate}</p>
              <p className="text-slate-200 mt-0.5 leading-relaxed">{localError || error}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClearError();
                onSelectRandomCurated();
              }}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Шедевр музея</span>
            </button>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  onClearError();
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-200 text-xs cursor-pointer"
              >
                {t.close}
              </button>
          </div>
        </div>
      )}

      {/* Additional Studio Options Sheet (Nano Banana 2 Model, 1K/2K/4K, Cat Passport) */}
      <ActionMenuSheet
        isOpen={isOptionsSheetOpen}
        onClose={() => setIsOptionsSheetOpen(false)}
        title="Параметры Nano Banana 2"
        subtitle="Выбор нейросети, разрешения 1K/2K/4K и паспорта кота"
        items={optionsItems}
      />
    </section>
  );
};
