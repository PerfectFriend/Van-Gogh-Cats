import React from 'react';
import { useThemeStyle } from '../../context/ThemeStyleContext';
import { ButtonOrnamentFlourish } from '../GaudiOrnaments';

interface ThemedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'badge' | 'chip';
  showFlourish?: boolean;
  className?: string;
  isActiveChip?: boolean;
  id?: string;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  children,
  variant = 'primary',
  showFlourish = false,
  className = '',
  isActiveChip = false,
  id,
  style,
  disabled,
  ...props
}) => {
  const { activeTheme } = useThemeStyle();

  let dynamicStyle: React.CSSProperties = { ...style };

  if (variant === 'primary') {
    dynamicStyle = {
      background: disabled ? 'rgba(70, 70, 90, 0.4)' : activeTheme.buttonPrimaryBg,
      borderColor: disabled ? 'rgba(100, 100, 120, 0.3)' : activeTheme.buttonPrimaryBorder,
      color: disabled ? '#888899' : activeTheme.buttonPrimaryText,
      boxShadow: disabled ? 'none' : activeTheme.buttonPrimaryGlow,
      ...dynamicStyle
    };
  } else if (variant === 'secondary') {
    dynamicStyle = {
      background: activeTheme.buttonSecondaryBg,
      borderColor: activeTheme.buttonSecondaryBorder,
      color: activeTheme.buttonSecondaryText,
      ...dynamicStyle
    };
  } else if (variant === 'chip') {
    if (isActiveChip) {
      dynamicStyle = {
        background: activeTheme.activeChipBg,
        borderColor: activeTheme.activeChipBorder,
        color: activeTheme.activeChipText,
        boxShadow: `0 0 15px ${activeTheme.plateBorder}`,
        ...dynamicStyle
      };
    } else {
      dynamicStyle = {
        background: activeTheme.buttonSecondaryBg,
        borderColor: activeTheme.buttonSecondaryBorder,
        color: activeTheme.buttonSecondaryText,
        ...dynamicStyle
      };
    }
  } else if (variant === 'badge') {
    dynamicStyle = {
      background: activeTheme.accentBadgeBg,
      borderColor: activeTheme.accentBadgeBorder,
      color: activeTheme.accentBadgeText,
      ...dynamicStyle
    };
  }

  return (
    <button
      id={id}
      disabled={disabled}
      style={dynamicStyle}
      className={`relative inline-flex items-center justify-center gap-2 rounded-2xl border transition-all duration-300 font-medium cursor-pointer select-none ${
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'hover:scale-[1.02] active:scale-[0.98]'
      } ${
        variant === 'primary'
          ? 'px-6 py-3 font-gaudi font-bold text-sm sm:text-base'
          : variant === 'secondary'
          ? 'px-4 py-2 text-xs sm:text-sm font-cyber'
          : variant === 'chip'
          ? 'px-3 py-1.5 text-xs font-cyber'
          : 'px-2.5 py-1 text-xs font-cyber'
      } ${className}`}
      {...props}
    >
      {showFlourish && variant === 'primary' && !disabled && (
        <ButtonOrnamentFlourish side="left" />
      )}
      {children}
      {showFlourish && variant === 'primary' && !disabled && (
        <ButtonOrnamentFlourish side="right" />
      )}
    </button>
  );
};
