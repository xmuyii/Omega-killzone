import React from 'react';
import { HeroId } from '../types/game';
import { HERO_DEFINITIONS } from '../game/constants';
import { Shield, Zap, Crosshair, Heart, Gauge, Flame, Radio, Bomb, Ghost, ShieldAlert, X } from 'lucide-react';

interface HeroSelectModalProps {
  currentHeroId: HeroId;
  onSelectHero: (heroId: HeroId) => void;
  onClose: () => void;
}

export const HeroSelectModal: React.FC<HeroSelectModalProps> = ({ currentHeroId, onSelectHero, onClose }) => {
  const [selectedId, setSelectedId] = React.useState<HeroId>(() => {
    if (currentHeroId === 'titan' || currentHeroId === 'stalker') return 'assault';
    if (currentHeroId === 'valkyrie' || currentHeroId === 'mirage') return 'sniper';
    if (currentHeroId === 'bastion') return 'marksman';
    if (['sniper', 'shotgun', 'assault', 'marksman'].includes(currentHeroId)) return currentHeroId;
    return 'assault';
  });
  
  // The 4 balanced fixed classes
  const heroes = [
    HERO_DEFINITIONS.sniper,
    HERO_DEFINITIONS.shotgun,
    HERO_DEFINITIONS.assault,
    HERO_DEFINITIONS.marksman,
  ];
  const activeHero = HERO_DEFINITIONS[selectedId] || HERO_DEFINITIONS.assault;

  const handleConfirm = () => {
    onSelectHero(selectedId);
    onClose();
  };

  const getAbilityIcon = (id: HeroId) => {
    switch (id) {
      case 'sniper':
        return <Zap className="w-5 h-5 text-black" />;
      case 'shotgun':
        return <Bomb className="w-5 h-5 text-black" />;
      case 'assault':
        return <Ghost className="w-5 h-5 text-black" />;
      case 'marksman':
        return <ShieldAlert className="w-5 h-5 text-black" />;
      default:
        return <Shield className="w-5 h-5 text-black" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050506]/90 backdrop-blur-md flex items-center justify-center p-4"
      style={{
        backgroundImage: 'radial-gradient(#1a1a2e 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in font-sans backdrop-blur-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#050506]/70">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-0.5">
              Tactical Operative Registry
            </div>
            <h2 className="text-xl font-black italic tracking-tight text-white flex items-center gap-2">
              <span>SELECT COMBAT OPERATIVE</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Hero Selection Grid (Left Side) */}
          <div className="md:col-span-7 grid grid-cols-2 gap-3">
            {heroes.map((h) => {
              const isSelected = h.id === selectedId;
              const isCurrent = h.id === currentHeroId;

              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedId(h.id)}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.02]'
                      : 'bg-[#050506]/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  {/* Color Accent Indicator */}
                  <div
                    className="w-full h-1.5 rounded-full mb-2.5"
                    style={{ backgroundColor: h.color }}
                  />

                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-sm text-white tracking-wide">{h.name}</span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: `${h.color}20`,
                        color: h.color,
                        border: `1px solid ${h.color}40`,
                      }}
                    >
                      {h.role}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 truncate mb-2">{h.title}</span>

                  <div className="mt-auto flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1.5 border-t border-slate-800/80">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Heart className="w-3 h-3" /> {h.maxHp}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Crosshair className="w-3 h-3" /> {h.fireRange}px
                    </span>
                  </div>

                  {isCurrent && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Detailed Hero Dossier (Right Side) */}
          <div className="md:col-span-5 flex flex-col justify-between bg-[#050506]/90 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span
                    className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded uppercase"
                    style={{ backgroundColor: `${activeHero.color}25`, color: activeHero.color }}
                  >
                    {activeHero.role} CLASS
                  </span>
                  <h3 className="text-2xl font-black italic tracking-tight text-white mt-1">
                    {activeHero.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{activeHero.title}</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4 mt-2 font-sans">
                {activeHero.description}
              </p>

              {/* Combat Attributes */}
              <div className="space-y-2.5 mb-5 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Heart className="w-3.5 h-3.5 text-emerald-400" /> Health Rating
                    </span>
                    <span className="text-white font-bold">{activeHero.maxHp} HP</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                      style={{ width: `${(activeHero.maxHp / 1650) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-blue-400" /> Armor Plate
                    </span>
                    <span className="text-white font-bold">{activeHero.maxArmor}</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                      style={{ width: `${(activeHero.maxArmor / 850) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Crosshair className="w-3.5 h-3.5 text-amber-400" /> Auto-Fire Range
                    </span>
                    <span className="text-white font-bold">{activeHero.fireRange}px</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                      style={{ width: `${(activeHero.fireRange / 580) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" /> Projectile Velocity
                    </span>
                    <span className="text-white font-bold">{activeHero.bulletSpeed} px/s</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"
                      style={{ width: `${(activeHero.bulletSpeed / 1400) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Gauge className="w-3.5 h-3.5 text-purple-400" /> Movement Velocity
                    </span>
                    <span className="text-white font-bold">{activeHero.speed}</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(activeHero.speed / 230) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Weapon & Special Ability Section */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 mb-4 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 text-[10px] uppercase tracking-widest font-mono">
                    Primary Weapon:
                  </span>
                  <span className="font-bold text-white">{activeHero.weaponName}</span>
                </div>
                <div className="flex items-start gap-2.5 pt-1">
                  <div className="p-1.5 bg-amber-500 rounded text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    {getAbilityIcon(activeHero.id)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400">{activeHero.abilityName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({activeHero.abilityCooldown}s CD)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {activeHero.abilityDescription}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Select / Deploy Button */}
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 border border-amber-400 text-black font-black text-sm tracking-wider rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>DEPLOY AS {activeHero.name.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
