import React from 'react';
import { Sparkles, Crown, ExternalLink, Heart, ShoppingBag } from 'lucide-react';
import { SponsorCard } from '../data/catSponsors';

interface CatSponsorCardProps {
  sponsor: SponsorCard;
  onOpenProModal: () => void;
}

export const CatSponsorCard: React.FC<CatSponsorCardProps> = ({
  sponsor,
  onOpenProModal
}) => {
  return (
    <div className="group rounded-2xl overflow-hidden bg-gradient-to-b from-[#140c2e] via-[#0d1238] to-[#0a0720] border-2 border-yellow-400/70 transition-all duration-300 flex flex-col justify-between shadow-[0_0_20px_rgba(255,183,3,0.15)] hover:shadow-[0_0_30px_rgba(255,183,3,0.3)] hover:border-yellow-300 relative">
      {/* Top Media Container */}
      <div className="relative overflow-hidden aspect-square bg-[#050718]">
        <img
          src={sponsor.imageUrl}
          alt={sponsor.brandName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95 group-hover:brightness-105"
        />

        {/* Sponsor Banner Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400 text-slate-950 font-cyber font-bold text-[10px] uppercase tracking-wider shadow-lg border border-yellow-200">
          <Sparkles className="w-3 h-3 text-slate-950 fill-current" />
          <span>Спонсор музея</span>
        </div>

        {/* PRO badge action */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenProModal();
          }}
          className="cyber-btn-gold absolute top-2 right-2 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition"
          title="Отключить рекламу в PRO версии"
        >
          <Crown className="w-3 h-3 text-slate-950" />
          <span>PRO</span>
        </button>

        {/* Style & Flavor Overlay bottom */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0a0720] via-[#0a0720]/80 to-transparent p-3 pt-8">
          <span className="text-[10px] text-cyan-300 font-cyber block">
            Стиль: {sponsor.styleName}
          </span>
          <h4 className="text-sm font-bold text-yellow-200 font-gaudi leading-tight mt-0.5 truncate">
            {sponsor.brandName}
          </h4>
        </div>
      </div>

      {/* Info Body */}
      <div className="p-3.5 flex flex-col justify-between flex-grow space-y-3">
        <div>
          <p className="text-xs font-semibold text-yellow-300/90 line-clamp-1 font-cyber">
            {sponsor.slogan}
          </p>
          <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {sponsor.description}
          </p>
          <p className="text-[10px] text-cyan-200/80 italic mt-2 border-l-2 border-yellow-400/70 pl-2">
            {sponsor.catQuote}
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="pt-2 border-t border-indigo-900/60 flex items-center justify-between gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-cyber font-medium">
            {sponsor.offerBadge}
          </span>
          <button
            onClick={onOpenProModal}
            className="text-[11px] font-bold text-cyan-300 hover:text-yellow-300 flex items-center gap-1 transition cursor-pointer"
          >
            <span>Скрыть в PRO</span>
            <Crown className="w-3 h-3 text-yellow-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
