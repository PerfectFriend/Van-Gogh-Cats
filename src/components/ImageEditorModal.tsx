import React, { useState } from 'react';
import { X, Sparkles, Upload, Wand2, Loader2, ArrowRight, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Artwork } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface ImageEditorModalProps {
  artwork: Artwork | null;
  isOpen: boolean;
  onClose: () => void;
  onImageEdited: (newArtwork: Artwork) => void;
  activeModel: string;
  isBannedReadOnly?: boolean;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  artwork,
  isOpen,
  onClose,
  onImageEdited,
  activeModel,
  isBannedReadOnly
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customBase64, setCustomBase64] = useState<string | null>(null);

  if (!isOpen || !artwork) return null;

  const currentImageSrc = customBase64 || artwork.imageUrl;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isBannedReadOnly) {
      alert(t.editorBannedAlert);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCustomBase64(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBannedReadOnly) {
      alert(t.editorBannedAlert);
      return;
    }
    if (!prompt.trim() || isEditing) return;

    setIsEditing(true);
    setError(null);

    try {
      // Convert current image url to base64 if it's a relative asset or external link
      let base64Data = currentImageSrc;
      if (!currentImageSrc.startsWith('data:image/')) {
        const res = await fetch(currentImageSrc);
        const blob = await res.blob();
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const response = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: 'image/jpeg',
          prompt: prompt,
          model: activeModel
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || t.editorError);
      }

      onImageEdited(data.artwork);
      onClose();
      setPrompt('');
      setCustomBase64(null);

    } catch (err: any) {
      console.error('Edit image error:', err);
      setError(err.message || t.editorError);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl w-full max-w-4xl shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden flex flex-col max-h-[90vh] relative">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-900/60 flex items-center justify-between bg-[#080d2c]/90 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-sm">
              <Wand2 className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300">
                {t.editorModalHeader}
              </h3>
              <p className="text-xs text-cyan-200/70 font-sans">
                {t.editorModalSub} ({activeModel.replace('gemini-', '')})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121946] hover:bg-[#1a256a] text-cyan-200 flex items-center justify-center transition cursor-pointer border border-cyan-500/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          {/* Left: Current Image Preview & Upload Option */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-[#05071a]/90 p-4 rounded-2xl border border-indigo-900/60 relative">
            <div className="text-xs font-cyber text-cyan-300 mb-2 uppercase tracking-wider">
              {t.editorSourceCanvas}
            </div>
            <div className="relative max-h-[340px] overflow-hidden rounded-xl border border-indigo-700/60 shadow-lg bg-black/60">
              <img
                src={currentImageSrc}
                alt="Source canvas"
                referrerPolicy="no-referrer"
                className="w-full h-auto max-h-[320px] object-contain rounded-lg"
              />
            </div>

            {/* Custom File Upload Input */}
            <div className="mt-4 w-full">
              <label className="cyber-btn-cobalt flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-200 cursor-pointer transition-all shadow-sm">
                <Upload className="w-4 h-4 text-cyan-300" />
                <span>{t.editorUploadBtn}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Right: Text Prompt Controls */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-cyber uppercase tracking-wider text-cyan-300 mb-2">
                  {t.editorPromptLabel}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.editorPromptPlaceholder}
                  rows={4}
                  disabled={isEditing}
                  className="w-full rounded-2xl bg-[#06081c] border-2 border-indigo-700/60 focus:border-cyan-400 text-slate-100 placeholder-indigo-300/40 p-3.5 text-sm transition-all shadow-inner resize-none font-sans"
                />
              </div>

              {/* Ideas */}
              <div>
                <span className="text-xs font-cyber text-yellow-300 block mb-1.5">
                  {t.editorIdeasTitle}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {t.editorIdeas.map((idea, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPrompt(idea)}
                      className="px-2.5 py-1 rounded-xl bg-[#080d2c] hover:bg-[#121946] border border-indigo-800/80 text-xs text-cyan-200/90 text-left transition-all cursor-pointer font-sans"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/80 text-xs text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                {isBannedReadOnly ? (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{t.editorBannedAlert}</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isEditing || !prompt.trim()}
                    className={`w-full py-3.5 rounded-2xl font-cyber font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                      isEditing || !prompt.trim()
                        ? 'bg-indigo-950/60 text-slate-500 border border-indigo-900/60 cursor-not-allowed'
                        : 'cyber-btn-gold text-slate-950 shadow-lg'
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                        <span>{t.editorApplyingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 text-slate-950" />
                        <span>{t.editorApplyBtn}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            <div className="p-3.5 rounded-2xl bg-[#080d2c]/80 border border-indigo-900/60 text-xs text-cyan-200/80 font-sans">
              💡 {t.editorTip}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
