import React, { useState } from 'react';
import { Sparkles, Brush, Wand2, AlertTriangle, ChevronDown, Check, Loader2, Image as ImageIcon, RefreshCw, ShieldCheck } from 'lucide-react';
import { VAN_GOGH_STYLE_PRESETS, MODEL_OPTIONS } from '../data/stylePresets';
import { AspectRatioType, StylePreset } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedPresets } from '../utils/i18n';
import { GaudiCornerOrnament, ButtonOrnamentFlourish, GaudiMedallionCrest } from './GaudiOrnaments';
import { useThemeStyle } from '../context/ThemeStyleContext';

interface ArtStudioGeneratorProps {
  onGenerate: (prompt: string, model: string, aspectRatio: AspectRatioType, stylePresetId: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  onClearError: () => void;
  onSelectRandomCurated: () => void;
  activeModel: string;
  onModelChange: (model: string) => void;
  isBannedReadOnly?: boolean;
  externalPrompt?: string;
  activeCat?: { name: string; breed: string; distinctiveMarks: string } | null;
}

export const ArtStudioGenerator: React.FC<ArtStudioGeneratorProps> = ({
  onGenerate,
  isGenerating,
  error,
  onClearError,
  onSelectRandomCurated,
  activeModel,
  onModelChange,
  isBannedReadOnly,
  externalPrompt,
  activeCat
}) => {
  const { t } = useTranslation();
  const { activeStyleId, setActiveStyleId, activeTheme } = useThemeStyle();
  const [prompt, setPrompt] = useState(t.quickPrompts?.[0] || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(activeStyleId || 'starry_night');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('1:1');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Synchronize with active theme if changed elsewhere
  React.useEffect(() => {
    if (activeStyleId && activeStyleId !== selectedPresetId) {
      setSelectedPresetId(activeStyleId);
    }
  }, [activeStyleId]);

  // Update prompt if injected externally (e.g. from Cat Passport)
  React.useEffect(() => {
    if (externalPrompt) {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt]);

  const localizedPresets = getLocalizedPresets(VAN_GOGH_STYLE_PRESETS, t);
  const selectedPreset = localizedPresets.find(p => p.id === selectedPresetId) || localizedPresets[0];

  const aspectRatios: { id: AspectRatioType; label: string; icon: string }[] = [
    { id: '1:1', label: t.ratioSquare, icon: '⬛' },
    { id: '16:9', label: t.ratioLandscape, icon: '🎞️' },
    { id: '4:3', label: t.ratioClassic, icon: '🖼️' },
    { id: '3:4', label: t.ratioPortrait, icon: '📜' },
    { id: '9:16', label: t.ratioStory, icon: '📱' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBannedReadOnly) {
      alert(t.bannedReadOnlyAlert);
      return;
    }
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt, activeModel, aspectRatio, selectedPresetId);
  };

  const handleQuickPrompt = (p: string) => {
    setPrompt(p);
  };

  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    setActiveStyleId(id);
  };

  const currentModelInfo = MODEL_OPTIONS.find(m => m.id === activeModel) || MODEL_OPTIONS[0];

  const getLocalizedModelBadge = (id: string) => {
    if (id === 'gemini-2.5-flash') return t.modelRecommendedBadge;
    if (id === 'gemini-2.5-pro') return t.modelHdBadge;
    return t.modelSpeedBadge;
  };

  const getLocalizedModelDesc = (id: string) => {
    if (id === 'gemini-2.5-flash') return t.modelDescRecommended;
    if (id === 'gemini-2.5-pro') return t.modelDescHd;
    return t.modelDescSpeed;
  };

  return (
    <section
      style={{
        background: activeTheme.plateBg,
        borderColor: activeTheme.plateBorder,
        boxShadow: activeTheme.plateGlow
      }}
      className="p-4 sm:p-6 lg:p-8 rounded-3xl border shadow-2xl relative overflow-hidden group transition-all duration-500 backdrop-blur-xl"
    >
      {/* Radiant Top Stained-Glass Rim matching artist's palette */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10 transition-all duration-500"
        style={{ background: activeTheme.plateRim }}
      />

      {/* Subtle Painterly Canvas Texture Watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${activeTheme.bgImageUrl})` }}
      />

      {/* Authentic Gaudi Catalan Wrought Iron Corner Vignettes */}
      <GaudiCornerOrnament position="top-left" />
      <GaudiCornerOrnament position="top-right" />
      <GaudiCornerOrnament position="bottom-left" />
      <GaudiCornerOrnament position="bottom-right" />

      {/* Background celestial swirls */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-900/50">
        <div>
          <div className="cyber-badge-gold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-cyber font-bold uppercase tracking-wider">
            <Brush className="w-4 h-4 text-amber-400" />
            <span>{t.aiStudioBadge}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-300 mt-1.5">
            {t.studioTitle}
          </h3>
          <p className="text-xs sm:text-sm text-cyan-200/70 mt-0.5">
            {t.studioSubtitle}
          </p>
        </div>

        {/* Model Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0e1338]/90 hover:bg-[#161d50] border border-cyan-500/50 text-xs font-cyber font-medium text-cyan-200 transition-all shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="truncate max-w-[170px]">{currentModelInfo.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-cyan-300 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showModelDropdown && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#090d26] border-2 border-cyan-500/60 shadow-2xl z-50 p-2 space-y-1 backdrop-blur-xl">
              <div className="px-2 py-1 text-[11px] font-cyber font-bold text-cyan-300 uppercase tracking-wider">
                {t.modelSelectTitle}
              </div>
              {MODEL_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onModelChange(opt.id);
                    setShowModelDropdown(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-0.5 cursor-pointer ${
                    activeModel === opt.id
                      ? 'bg-cyan-950/80 border border-cyan-400/80 text-cyan-100 shadow-[0_0_15px_rgba(0,245,212,0.25)]'
                      : 'hover:bg-[#121842] text-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{opt.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#162054] text-cyan-300 border border-cyan-500/40">
                      {getLocalizedModelBadge(opt.id)}
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-200/60 leading-snug">{getLocalizedModelDesc(opt.id)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Studio Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Prompt Input & Quick Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-cyber font-bold uppercase tracking-wider text-cyan-300">
                {t.promptLabel}
              </label>
              {activeCat && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-medium border border-amber-400/50 shadow-[0_0_10px_rgba(255,183,3,0.2)]">
                  🐾 Кот: <strong>{activeCat.name}</strong> ({activeCat.breed})
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.p2pTabCatGuardian}
            </span>
          </div>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              rows={3}
              disabled={isGenerating}
              className="w-full rounded-2xl bg-[#06091c]/90 border-2 border-indigo-700/60 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 text-slate-100 placeholder-slate-400/50 p-4 text-sm sm:text-base transition-all shadow-inner resize-none font-sans"
            />
            <div className="absolute bottom-3 right-3 text-xs text-cyan-400/70 font-mono">
              {prompt.length}
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-amber-300/90 font-cyber font-medium self-center mr-1">{t.quickPromptsTitle}</span>
            {t.quickPrompts.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQuickPrompt(item)}
                className="px-2.5 py-1 rounded-xl bg-[#0f143a]/90 hover:bg-[#17205c] border border-cyan-500/30 hover:border-cyan-400 text-xs text-cyan-200 transition-all hover:scale-[1.02] cursor-pointer shadow-sm"
              >
                {item}
              </button>
            ))}
            {/* Dynamic Preset Sample Prompt Button */}
            {selectedPreset && selectedPreset.samplePrompt && (
              <button
                type="button"
                onClick={() => handleQuickPrompt(selectedPreset.samplePrompt)}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-cyan-500/20 hover:from-amber-500/40 hover:to-cyan-500/40 border border-yellow-400/60 text-xs text-yellow-300 font-medium transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1 shadow-sm"
                title="Сюжет для выбранного стиля живописи"
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Сюжет: «{selectedPreset.name}»</span>
              </button>
            )}
          </div>
        </div>

        {/* Style Presets Selector */}
        <div>
          <label className="block text-xs font-cyber font-bold uppercase tracking-wider text-cyan-300 mb-2.5">
            {t.chooseStyleLabel}
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {localizedPresets.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  style={
                    isSelected
                      ? {
                          background: activeTheme.plateBg,
                          borderColor: activeTheme.plateBorder,
                          boxShadow: activeTheme.plateGlow
                        }
                      : undefined
                  }
                  className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border-2 transition-all duration-300 text-left cursor-pointer ${
                    isSelected
                      ? 'scale-[1.03] ring-1 ring-white/20'
                      : 'bg-[#080c26]/75 border-indigo-900/60 hover:border-cyan-500/50 hover:bg-[#0f1540]/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-gaudi font-bold text-slate-100 truncate">
                        {preset.name}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-cyan-200/60 line-clamp-2 leading-snug">
                      {preset.description}
                    </p>
                  </div>

                  {/* Color Swatch Bar */}
                  <div className="mt-3 flex h-2 rounded-full overflow-hidden border border-cyan-500/30 shadow-inner">
                    {preset.colors.map((color, i) => (
                      <div
                        key={i}
                        className="flex-1 h-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio Selector & Generate Button row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <label className="block text-xs font-cyber font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
              {t.chooseRatioLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              {aspectRatios.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAspectRatio(item.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    aspectRatio === item.id
                      ? 'cyber-btn-cyan text-slate-950 font-bold shadow-md'
                      : 'bg-[#090d28]/80 border-indigo-800 text-slate-300 hover:border-cyan-500/50 hover:bg-[#121845]'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-3">
            {isBannedReadOnly ? (
              <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/80 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <span>
                  <strong>{t.bannedReadOnlyAlert}</strong>
                </span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                style={
                  !isGenerating && prompt.trim()
                    ? {
                        background: activeTheme.buttonPrimaryBg,
                        borderColor: activeTheme.buttonPrimaryBorder,
                        color: activeTheme.buttonPrimaryText,
                        boxShadow: activeTheme.buttonPrimaryGlow
                      }
                    : undefined
                }
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-gaudi font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer group border ${
                  isGenerating || !prompt.trim()
                    ? 'bg-slate-800/60 text-slate-400 border-slate-700/50 cursor-not-allowed'
                    : 'hover:scale-[1.02]'
                }`}
              >
                {!isGenerating && <ButtonOrnamentFlourish side="left" />}
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.generatingBtn}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>{t.generateBtn}</span>
                  </>
                )}
                {!isGenerating && <ButtonOrnamentFlourish side="right" />}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Error / Quota Notice Banner */}
      {error && (
        <div className="mt-5 p-4 rounded-2xl bg-[#1e0d1d]/95 border-2 border-fuchsia-500/80 text-slate-100 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-fuchsia-950/90 border border-fuchsia-500/50">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-yellow-300">
                {t.errorGenerate}:
              </p>
              <p className="text-xs text-slate-200 mt-0.5">
                {error}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClearError();
                onSelectRandomCurated();
              }}
              className="cyber-btn-cyan px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.randomCuratedBtn}</span>
            </button>
            <button
              type="button"
              onClick={onClearError}
              className="px-3 py-2 rounded-xl bg-[#26173b] hover:bg-[#382258] text-slate-300 text-xs cursor-pointer border border-fuchsia-500/30"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
