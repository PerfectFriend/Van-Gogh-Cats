import React, { useState, useEffect } from 'react';
import { Cat, Plus, Sparkles, Trash2, Camera, Shield, Check, Heart, Edit3 } from 'lucide-react';
import { CatProfile } from '../types';
import { getCatProfiles, saveCatProfile, deleteCatProfile } from '../utils/p2pStorage';
import { useTranslation } from '../context/LanguageContext';

interface CatPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCatForStudio?: (cat: CatProfile) => void;
}

export const CatPassportModal: React.FC<CatPassportModalProps> = ({
  isOpen,
  onClose,
  onSelectCatForStudio
}) => {
  const { t } = useTranslation();
  const [cats, setCats] = useState<CatProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('Европейская короткошёрстная');
  const [coatPattern, setCoatPattern] = useState<CatProfile['coatPattern']>('tuxedo');
  const [eyeColor, setEyeColor] = useState('Изумрудно-зелёный');
  const [distinctiveMarks, setDistinctiveMarks] = useState('Белая манишка на шее и белое пятнышко на животике между задними лапами');
  const [referencePhotoUrl, setReferencePhotoUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    const list = await getCatProfiles();
    if (list.length === 0) {
      // Seed default favorite cat pair (Coal Black & Tuxedo Gentleman)
      const defaultCat1: CatProfile = {
        id: 'cat_tuxedo_gentleman',
        name: 'Смоки (В смокинге)',
        breed: 'Элегантный городской кот',
        coatPattern: 'tuxedo',
        eyeColor: 'Изумрудно-зелёные',
        distinctiveMarks: 'Шёлковая белая манишка на шее внизу и белое пятнышко на животике между задних лап, как будто одет в смокинг',
        createdAt: Date.now() - 100000,
        artworksCount: 10
      };
      const defaultCat2: CatProfile = {
        id: 'cat_coal_black',
        name: 'Уголёк (Полночь)',
        breed: 'Бомбейский угольно-чёрный',
        coatPattern: 'solid-black',
        eyeColor: 'Янтарно-золотые',
        distinctiveMarks: 'Полностью угольно-чёрная бархатная шерсть без единого светлого волоска, сверкающий взгляд',
        createdAt: Date.now() - 200000,
        artworksCount: 10
      };
      await saveCatProfile(defaultCat1);
      await saveCatProfile(defaultCat2);
      setCats([defaultCat1, defaultCat2]);
    } else {
      setCats(list);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setReferencePhotoUrl(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCat: CatProfile = {
      id: `cat_${Date.now()}`,
      name: name.trim(),
      breed: breed.trim() || 'Домашний любимец',
      coatPattern,
      eyeColor: eyeColor.trim(),
      distinctiveMarks: distinctiveMarks.trim(),
      referencePhotoUrl: referencePhotoUrl || undefined,
      createdAt: Date.now(),
      artworksCount: 0
    };

    await saveCatProfile(newCat);
    setCats(prev => [newCat, ...prev]);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setBreed('Европейская короткошёрстная');
    setCoatPattern('tuxedo');
    setEyeColor('Изумрудно-зелёный');
    setDistinctiveMarks('Белая манишка на шее и пятнышко на животике');
    setReferencePhotoUrl('');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Удалить цифровой паспорт котика?')) {
      await deleteCatProfile(id);
      setCats(prev => prev.filter(c => c.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl max-w-2xl w-full p-6 sm:p-7 text-slate-100 shadow-[0_0_50px_rgba(0,245,212,0.25)] relative my-8 overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-indigo-900/60 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl cyber-btn-gold flex items-center justify-center text-slate-950 shadow-md">
              <Cat className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-gaudi flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300">
                <span>Паспорта котиков (Cat Identity)</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-cyber">
                  P2P Node Identity
                </span>
              </h2>
              <p className="text-xs text-cyan-200/70 font-sans">
                Биометрический профиль для генерации шедевров в любом стиле живописи
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121946] hover:bg-[#1a256a] text-cyan-200 flex items-center justify-center transition cursor-pointer border border-cyan-500/30 text-lg"
          >
            ×
          </button>
        </div>

        {/* Action button */}
        {!isCreating && (
          <div className="mb-6 flex justify-between items-center relative z-10">
            <span className="text-sm text-cyan-200/90 font-medium">
              Зарегистрировано питомцев: <strong className="text-yellow-300 font-cyber">{cats.length}</strong>
            </span>
            <button
              onClick={() => setIsCreating(true)}
              className="cyber-btn-gold px-4 py-2 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md font-cyber"
            >
              <Plus className="w-4 h-4" />
              Добавить котика
            </button>
          </div>
        )}

        {/* Creation Form */}
        {isCreating ? (
          <form onSubmit={handleSave} className="bg-[#080d2c]/90 border border-indigo-900/70 rounded-2xl p-5 mb-6 space-y-4 relative z-10">
            <h3 className="font-bold text-yellow-200 text-base flex items-center gap-2 font-gaudi">
              <Edit3 className="w-4 h-4 text-cyan-300" />
              Новый паспорт питомца
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1 font-cyber">
                  Кличка питомца *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Барсик, Смоки, Уголёк..."
                  className="w-full bg-[#06081c] border border-indigo-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-indigo-400/50 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1 font-cyber">
                  Порода / Тип
                </label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="Британский, дворовый, мейн-кун..."
                  className="w-full bg-[#06081c] border border-indigo-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-indigo-400/50 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1 font-cyber">
                  Тип окраса
                </label>
                <select
                  value={coatPattern}
                  onChange={(e) => setCoatPattern(e.target.value as any)}
                  className="w-full bg-[#06081c] border border-indigo-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="tuxedo">В смокинге (чёрный с белой манишкой и пятнышком)</option>
                  <option value="solid-black">Полностью угольно-чёрный</option>
                  <option value="ginger-tabby">Рыжий полосатый</option>
                  <option value="white">Белоснежный</option>
                  <option value="grey-smoke">Дымчато-серый</option>
                  <option value="calico">Трёхцветный (калико)</option>
                  <option value="siamese">Сиамский / Колор-пойнт</option>
                  <option value="other">Другой особый окрас</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1 font-cyber">
                  Цвет глаз
                </label>
                <input
                  type="text"
                  value={eyeColor}
                  onChange={(e) => setEyeColor(e.target.value)}
                  placeholder="Янтарно-жёлтый, изумрудный, сапфировый..."
                  className="w-full bg-[#06081c] border border-indigo-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-300 mb-1 font-cyber">
                Особые приметы (для 100% узнаваемости на картинах)
              </label>
              <textarea
                rows={2}
                value={distinctiveMarks}
                onChange={(e) => setDistinctiveMarks(e.target.value)}
                placeholder="Белое пятнышко на шее, форма ушек, кончик хвоста..."
                className="w-full bg-[#06081c] border border-indigo-700/60 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 font-sans"
              />
            </div>

            {/* Photo reference upload */}
            <div>
              <label className="block text-xs font-semibold text-cyan-300 mb-1 font-cyber">
                Эталонная фотография питомца (для цифрового профиля)
              </label>
              <div className="flex items-center gap-4">
                <label className="cyber-btn-cobalt cursor-pointer px-4 py-2 text-cyan-200 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-300" />
                  Загрузить фото с устройства
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {referencePhotoUrl && (
                  <img
                    src={referencePhotoUrl}
                    alt="Эталон котика"
                    className="w-10 h-10 rounded-xl object-cover border border-cyan-400/50 shadow-md"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="cyber-btn-cobalt px-4 py-2 text-cyan-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="cyber-btn-gold px-5 py-2 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer font-cyber"
              >
                <Check className="w-4 h-4" />
                Сохранить в паспорт
              </button>
            </div>
          </form>
        ) : null}

        {/* Cats Grid List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-1 relative z-10">
          {cats.map((cat) => (
            <div
              key={cat.id}
              onClick={() => {
                if (onSelectCatForStudio) {
                  onSelectCatForStudio(cat);
                  onClose();
                }
              }}
              className="bg-[#080d2c]/80 hover:bg-[#0c1444] border border-indigo-900/60 hover:border-cyan-400/60 rounded-2xl p-4 transition-all cursor-pointer relative group flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3">
                    {cat.referencePhotoUrl ? (
                      <img
                        src={cat.referencePhotoUrl}
                        alt={cat.name}
                        className="w-12 h-12 rounded-xl object-cover border border-cyan-400/40 shadow"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-300 font-bold border border-cyan-400/30">
                        <Cat className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-100 text-base group-hover:text-yellow-300 transition-colors font-gaudi">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-cyan-300/80 font-cyber">{cat.breed}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(cat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-400 transition-all rounded cursor-pointer"
                    title="Удалить паспорт"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-200 bg-[#040616]/70 p-2.5 rounded-xl border border-indigo-900/40">
                  <div className="flex justify-between">
                    <span className="text-cyan-300/80 font-cyber">Глаза:</span>
                    <span className="font-medium text-slate-100">{cat.eyeColor}</span>
                  </div>
                  <p className="text-slate-300/80 pt-1 line-clamp-2 italic font-serif">
                    «{cat.distinctiveMarks}»
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-indigo-900/40 flex items-center justify-between text-[11px] text-cyan-300/80">
                <span className="font-mono">Шедевров: {cat.artworksCount || 0}</span>
                <span className="text-yellow-300 font-semibold group-hover:underline flex items-center gap-1 font-cyber">
                  <Sparkles className="w-3 h-3 text-cyan-300" />
                  Выбрать героем
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
