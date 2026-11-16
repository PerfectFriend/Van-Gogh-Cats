import React, { useState } from 'react';
import { Plus, Palette, Sparkles, Wand2, Award } from 'lucide-react';
import { Artwork, ArtistProfile } from '../../types';
import { useThemeStyle } from '../../context/ThemeStyleContext';
import { useLongPress } from '../../hooks/useLongPress';
import { ActionMenuSheet, ActionMenuItem } from './ActionMenuSheet';

interface StoriesStripProps {
  artistProfile: ArtistProfile;
  artworks: Artwork[];
  onOpenStory: (artwork: Artwork, themeId?: string) => void;
  onOpenStudio: (styleId?: string) => void;
  onOpenCatPassport: () => void;
  onOpenThemeDrawer: () => void;
}

interface StoryCircleProps {
  id: string;
  label: string;
  imageUrl: string;
  isOwn?: boolean;
  isActiveTheme?: boolean;
  symbol?: string;
  onTap: () => void;
  onLongPress: () => void;
}

const StoryCircle: React.FC<StoryCircleProps> = ({
  label,
  imageUrl,
  isOwn,
  isActiveTheme,
  symbol,
  onTap,
  onLongPress,
}) => {
  const { isPressing, handlers } = useLongPress({
    onLongPress,
    onClick: onTap,
  });

  return (
    <button
      type="button"
      {...handlers}
      className={`flex flex-col items-center gap-1.5 w-[72px] shrink-0 cursor-pointer select-none transition-transform duration-150 ${
        isPressing ? 'scale-95' : 'active:scale-95'
      }`}
    >
      <div
        className={`relative w-16 h-16 rounded-full p-[2.5px] ${
          isActiveTheme
            ? 'bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-cyan-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
            : isOwn
            ? 'bg-slate-700'
            : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600'
        }`}
      >
        <div className="w-full h-full rounded-full p-[2px] bg-[#070a18]">
          <img
            src={imageUrl}
            alt={label}
            referrerPolicy="no-referrer"
            className="w-full h-full rounded-full object-cover"
          />
        </div>

        {isOwn && (
          <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-cyan-500 border-2 border-[#070a18] flex items-center justify-center text-slate-950 shadow">
            <Plus className="w-3 h-3 stroke-[3]" />
          </span>
        )}

        {symbol && !isOwn && (
          <span className="absolute -bottom-0.5 -right-0.5 text-[11px] bg-[#070a18]/90 rounded-full w-5 h-5 flex items-center justify-center border border-white/15">
            {symbol}
          </span>
        )}
      </div>

      <span className="text-[11px] text-slate-200 truncate w-full text-center font-medium">
        {label}
      </span>
    </button>
  );
};

export const StoriesStrip: React.FC<StoriesStripProps> = ({
  artistProfile,
  artworks,
  onOpenStory,
  onOpenStudio,
  onOpenCatPassport,
  onOpenThemeDrawer,
}) => {
  const { allThemes, activeStyleId, setActiveStyleId } = useThemeStyle();
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    title: string;
    subtitle: string;
    imageUrl: string;
    themeId?: string;
    artwork?: Artwork;
    isOwn?: boolean;
  } | null>(null);

  const ownAvatar = artworks[0]?.imageUrl || allThemes[0]?.bgImageUrl;

  const menuItems: ActionMenuItem[] = contextMenuTarget
    ? contextMenuTarget.isOwn
      ? [
          {
            id: 'create-art',
            label: 'Создать полотно в AI-Студии',
            sublabel: 'Нарисовать нового кота в стиле Ван Гога',
            icon: <Wand2 className="w-5 h-5 text-amber-400" />,
            onClick: () => onOpenStudio(),
          },
          {
            id: 'cat-passport',
            label: 'Открыть паспорта котиков',
            sublabel: 'Выбрать питомца и приметы для холста',
            icon: <Award className="w-5 h-5 text-cyan-400" />,
            onClick: onOpenCatPassport,
          },
          {
            id: 'themes',
            label: 'Выбрать тему оформления',
            sublabel: '11 растровых тем (Ван Гог, Климт, Моне, Хокусай)',
            icon: <Palette className="w-5 h-5 text-fuchsia-400" />,
            onClick: onOpenThemeDrawer,
          },
        ]
      : [
          ...(contextMenuTarget.themeId
            ? [
                {
                  id: 'apply-theme',
                  label: 'Применить как тему галереи',
                  sublabel: 'Изменить фон и палитру всего интерфейса',
                  icon: <Palette className="w-5 h-5 text-amber-400" />,
                  onClick: () => setActiveStyleId(contextMenuTarget.themeId!),
                  highlight: true,
                },
                {
                  id: 'paint-in-style',
                  label: 'Нарисовать кота в этом стиле',
                  sublabel: 'Открыть Арт-Студию с выбранным направлением',
                  icon: <Wand2 className="w-5 h-5 text-cyan-400" />,
                  onClick: () => {
                    setActiveStyleId(contextMenuTarget.themeId!);
                    onOpenStudio(contextMenuTarget.themeId);
                  },
                },
              ]
            : []),
          ...(contextMenuTarget.artwork
            ? [
                {
                  id: 'view-story',
                  label: 'Смотреть в полноэкранном Story',
                  icon: <Sparkles className="w-5 h-5 text-fuchsia-400" />,
                  onClick: () => onOpenStory(contextMenuTarget.artwork!, contextMenuTarget.themeId),
                },
              ]
            : []),
        ]
    : [];

  return (
    <div className="w-full border-b border-white/10 pb-3.5 pt-1">
      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar px-3 sm:px-1">
        {/* Own Story / Create Quick Circle */}
        <StoryCircle
          id="own-story"
          label="Создать"
          imageUrl={ownAvatar}
          isOwn={true}
          onTap={() => onOpenStudio()}
          onLongPress={() =>
            setContextMenuTarget({
              title: artistProfile.name,
              subtitle: 'Быстрые действия студии',
              imageUrl: ownAvatar,
              isOwn: true,
            })
          }
        />

        {/* Artistic Themes & Exhibition Stories */}
        {allThemes.slice(0, 10).map((theme, idx) => {
          const matchingArt = artworks.length > 0 ? artworks[idx % artworks.length] : undefined;
          const shortName = theme.name.split(' (')[0];
          return (
            <StoryCircle
              key={theme.id}
              id={theme.id}
              label={shortName}
              imageUrl={theme.bgImageUrl}
              symbol={theme.themeSymbol}
              isActiveTheme={activeStyleId === theme.id}
              onTap={() => {
                if (matchingArt) onOpenStory(matchingArt, theme.id);
              }}
              onLongPress={() =>
                setContextMenuTarget({
                  title: theme.name,
                  subtitle: theme.artist,
                  imageUrl: theme.bgImageUrl,
                  themeId: theme.id,
                  artwork: matchingArt,
                })
              }
            />
          );
        })}
      </div>

      {/* Long-Press Context Menu for Stories */}
      <ActionMenuSheet
        isOpen={!!contextMenuTarget}
        onClose={() => setContextMenuTarget(null)}
        title={contextMenuTarget?.title}
        subtitle={contextMenuTarget?.subtitle}
        previewImageUrl={contextMenuTarget?.imageUrl}
        items={menuItems}
      />
    </div>
  );
};
