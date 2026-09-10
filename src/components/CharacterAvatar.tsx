import React from 'react';
import { HeroId } from '../types/game';

interface CharacterAvatarProps {
  heroId?: HeroId | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  callsign?: string;
  className?: string;
  showBadge?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  heroId = 'assault',
  size = 'md',
  callsign,
  className = '',
  showBadge = false,
}) => {
  const normalizedId = (heroId || 'assault').toLowerCase();

  // Distinct operative styling & SVG vectors for tactical in-game characters
  const getOperativeVisual = () => {
    switch (normalizedId) {
      case 'sniper':
        return {
          title: 'Ghost Recon',
          role: 'Long Range Scout',
          accentColor: '#38bdf8', // Sky blue
          bgGradient: 'from-sky-950 via-slate-900 to-[#050b14]',
          borderColor: 'border-sky-500/50',
          glow: 'rgba(56, 189, 248, 0.4)',
          svg: (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
              {/* Tactical Hood / Cowl */}
              <path
                d="M16 60 C16 42 22 28 32 12 C42 28 48 42 48 60 Z"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              <path
                d="M20 58 C22 46 26 30 32 20 C38 30 42 46 44 58 Z"
                fill="#1e293b"
              />
              {/* Balaclava / Face Mask */}
              <ellipse cx="32" cy="38" rx="10" ry="12" fill="#090d16" />
              {/* Cybernetic Sniper Visor / Lens */}
              <rect x="24" y="32" width="16" height="6" rx="3" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Optical Monocle Crosshair on Right Eye */}
              <circle cx="37" cy="35" r="4.5" fill="#38bdf8" fillOpacity="0.8" stroke="#ffffff" strokeWidth="1" />
              <line x1="37" y1="29" x2="37" y2="41" stroke="#0369a1" strokeWidth="1" />
              <line x1="31" y1="35" x2="43" y2="35" stroke="#0369a1" strokeWidth="1" />
              {/* Tactical Headset Antenna */}
              <line x1="22" y1="34" x2="16" y2="18" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="16" cy="18" r="1.5" fill="#38bdf8" />
              {/* Respirator Vent Lines */}
              <line x1="30" y1="44" x2="34" y2="44" stroke="#475569" strokeWidth="1" />
              <line x1="29" y1="46" x2="35" y2="46" stroke="#475569" strokeWidth="1" />
            </svg>
          ),
        };

      case 'shotgun':
        return {
          title: 'Breacher Juggernaut',
          role: 'Heavy CQB',
          accentColor: '#f97316', // Orange
          bgGradient: 'from-amber-950 via-slate-900 to-[#140a05]',
          borderColor: 'border-orange-500/50',
          glow: 'rgba(249, 115, 22, 0.4)',
          svg: (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
              {/* Heavy Ballistic Shoulder Armor */}
              <path
                d="M12 60 L18 42 L32 38 L46 42 L52 60 Z"
                fill="#1c1917"
                stroke="#292524"
                strokeWidth="1.5"
              />
              {/* Reinforced Blast Helmet */}
              <path
                d="M18 36 C18 18 24 10 32 10 C40 10 46 18 46 36 Z"
                fill="#292524"
                stroke="#ea580c"
                strokeWidth="1.5"
              />
              {/* Face Guard Blast Shield */}
              <polygon points="22,30 42,30 39,46 25,46" fill="#0c0a09" stroke="#78716c" strokeWidth="1" />
              {/* Amber Heavy Visor Slit */}
              <rect x="25" y="32" width="14" height="4" rx="2" fill="#f97316" stroke="#fbbf24" strokeWidth="1" />
              {/* Heavy Dual Respirator Canisters */}
              <circle cx="23" cy="46" r="4.5" fill="#44403c" stroke="#f97316" strokeWidth="1" />
              <circle cx="41" cy="46" r="4.5" fill="#44403c" stroke="#f97316" strokeWidth="1" />
              <circle cx="23" cy="46" r="2" fill="#1c1917" />
              <circle cx="41" cy="46" r="2" fill="#1c1917" />
              {/* Hazard Stripes on Helmet Crest */}
              <line x1="30" y1="14" x2="34" y2="14" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="29" y1="18" x2="35" y2="18" stroke="#fbbf24" strokeWidth="1.5" />
            </svg>
          ),
        };

      case 'marksman':
        return {
          title: 'Deadeye Elite',
          role: 'Precision Skirmisher',
          accentColor: '#ec4899', // Fuchsia / Rose
          bgGradient: 'from-pink-950 via-slate-900 to-[#14060e]',
          borderColor: 'border-pink-500/50',
          glow: 'rgba(236, 72, 153, 0.4)',
          svg: (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
              {/* Stealth Cowl & Shoulders */}
              <path
                d="M14 60 C16 44 24 32 32 20 C40 32 48 44 50 60 Z"
                fill="#18181b"
                stroke="#27272a"
                strokeWidth="1.5"
              />
              {/* Cybernetic Face Mask */}
              <ellipse cx="32" cy="37" rx="11" ry="13" fill="#09090b" stroke="#3f3f46" strokeWidth="1" />
              {/* High-Tech Dual Optical Goggles */}
              <circle cx="27" cy="33" r="4.5" fill="#be185d" stroke="#f43f5e" strokeWidth="1.5" />
              <circle cx="37" cy="33" r="4.5" fill="#be185d" stroke="#f43f5e" strokeWidth="1.5" />
              <circle cx="27" cy="33" r="2" fill="#fda4af" />
              <circle cx="37" cy="33" r="2" fill="#fda4af" />
              <line x1="31.5" y1="33" x2="32.5" y2="33" stroke="#f43f5e" strokeWidth="1.5" />
              {/* Neural Interface Temple Circuits */}
              <path d="M19 28 L23 30 L21 34" stroke="#ec4899" strokeWidth="1" strokeLinecap="round" />
              <path d="M45 28 L41 30 L43 34" stroke="#ec4899" strokeWidth="1" strokeLinecap="round" />
              {/* Stealth Mouth Guard */}
              <path d="M28 43 L32 45 L36 43" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ),
        };

      case 'assault':
      default:
        return {
          title: 'Vanguard Commando',
          role: 'Tactical Assault',
          accentColor: '#10b981', // Emerald green
          bgGradient: 'from-emerald-950 via-slate-900 to-[#05140b]',
          borderColor: 'border-emerald-500/50',
          glow: 'rgba(16, 185, 129, 0.4)',
          svg: (
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
              {/* Tactical Combat Vest */}
              <path
                d="M14 60 L20 40 L32 36 L44 40 L50 60 Z"
                fill="#064e3b"
                stroke="#047857"
                strokeWidth="1.5"
              />
              {/* Ballistic Fast Helmet */}
              <path
                d="M18 34 C18 16 24 10 32 10 C40 10 46 16 46 34 Z"
                fill="#022c22"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              {/* Helmet NVG Shroud Bracket */}
              <rect x="29" y="12" width="6" height="6" rx="1" fill="#047857" stroke="#34d399" strokeWidth="0.8" />
              {/* Tactical Tinted Combat Visor */}
              <polygon points="22,28 42,28 40,36 24,36" fill="#059669" stroke="#34d399" strokeWidth="1.5" />
              {/* Specular Visor Reflection Highlight */}
              <line x1="25" y1="30" x2="31" y2="30" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
              {/* Tactical Half-Mask Comms Respirator */}
              <polygon points="24,37 40,37 36,48 28,48" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
              <circle cx="32" cy="43" r="2" fill="#059669" />
              {/* Boom Microphone */}
              <path d="M22 36 L21 44 L25 45" stroke="#34d399" strokeWidth="1" strokeLinecap="round" />
            </svg>
          ),
        };
    }
  };

  const operative = getOperativeVisual();
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative rounded-xl border bg-gradient-to-b ${operative.bgGradient} ${operative.borderColor} overflow-hidden shrink-0 flex items-center justify-center select-none shadow-md ${sizeClass} ${className}`}
      style={{
        boxShadow: `0 0 10px ${operative.glow}`,
      }}
      title={callsign ? `${callsign} (${operative.title})` : operative.title}
    >
      {/* Background Micro-Hex Texture */}
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:6px_6px] pointer-events-none" />

      {/* Operative Vector Avatar */}
      <div className="relative z-10 w-full h-full p-0.5 flex items-center justify-center">
        {operative.svg}
      </div>

      {/* Role / Class Color Indicator Corner Pip */}
      {showBadge && (
        <span
          className="absolute bottom-0 right-0 w-2 h-2 rounded-tl border-t border-l border-slate-900"
          style={{ backgroundColor: operative.accentColor }}
        />
      )}
    </div>
  );
};
