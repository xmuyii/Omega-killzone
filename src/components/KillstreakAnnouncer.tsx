import React, { useEffect, useState, useRef } from 'react';
import { StreakEvent } from '../types/game';
import { sounds } from '../game/audio';
import { Skull, Flame, Zap, Crown, ShieldAlert, Swords, Trophy, Sparkles } from 'lucide-react';

interface KillstreakAnnouncerProps {
  streak: StreakEvent | null;
  localPlayerId: string;
}

export const KillstreakAnnouncer: React.FC<KillstreakAnnouncerProps> = ({ streak, localPlayerId }) => {
  const [currentStreak, setCurrentStreak] = useState<StreakEvent | null>(null);
  const [screenFlashColor, setScreenFlashColor] = useState<string | null>(null);
  const queueRef = useRef<StreakEvent[]>([]);
  const isProcessingRef = useRef<boolean>(false);
  const lastProcessedIdRef = useRef<string>('');

  // Queue incoming streak events
  useEffect(() => {
    if (!streak || streak.id === lastProcessedIdRef.current) return;
    lastProcessedIdRef.current = streak.id;
    queueRef.current.push(streak);

    if (!isProcessingRef.current) {
      processNextInQueue();
    }
  }, [streak]);

  const processNextInQueue = () => {
    if (queueRef.current.length === 0) {
      isProcessingRef.current = false;
      setCurrentStreak(null);
      setScreenFlashColor(null);
      return;
    }

    isProcessingRef.current = true;
    const next = queueRef.current.shift()!;
    setCurrentStreak(next);

    const isLocal = next.killerId === localPlayerId;

    // Trigger visual vignette flash
    const flashCol = getTierColor(next.streakType);
    setScreenFlashColor(flashCol);
    setTimeout(() => {
      setScreenFlashColor(null);
    }, 450);

    // Audio SFX & Voice Announcer
    sounds.playStreak(next.streakType);

    // Announcer Speech Callout
    let speechPhrase = next.title.replace(/!/g, '');
    if (!isLocal) {
      if (next.streakType === 'rampage' || next.streakType === 'dominating' || next.streakType === 'unstoppable') {
        speechPhrase = `Enemy on a ${speechPhrase}`;
      } else if (next.streakType === 'shutdown') {
        speechPhrase = `Enemy shut down`;
      } else {
        speechPhrase = `${next.killerName} scored a ${speechPhrase}`;
      }
    }
    sounds.speakAnnouncer(speechPhrase);

    // Hold visual banner on screen for 2.6 seconds
    setTimeout(() => {
      processNextInQueue();
    }, 2600);
  };

  if (!currentStreak) {
    return screenFlashColor ? (
      <div
        className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 100px 20px ${screenFlashColor}`,
          opacity: 0.85,
        }}
      />
    ) : null;
  }

  const isLocal = currentStreak.killerId === localPlayerId;
  const tierColor = getTierColor(currentStreak.streakType);
  const theme = getTierTheme(currentStreak.streakType);

  return (
    <>
      {/* Screen-Edge Adrenaline Vignette Flash */}
      <div
        className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 120px 30px ${tierColor}`,
          opacity: screenFlashColor ? 0.9 : 0.25,
        }}
      />

      {/* Main Killstreak Emblem Banner */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center select-none animate-in zoom-in-90 fade-in duration-200">
        {/* Animated Glow Halo */}
        <div
          className="absolute -inset-4 rounded-3xl blur-xl opacity-60 transition-all duration-500 animate-pulse"
          style={{ background: tierColor }}
        />

        {/* Central Metal Chassis */}
        <div
          className={`relative px-6 py-3 rounded-2xl border-2 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-white font-mono transition-all ${theme.bg} ${theme.border} ${theme.shadow}`}
        >
          {/* Left Emblem Medal */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg relative overflow-hidden ${theme.iconBg} ${theme.iconBorder}`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            {getStreakIcon(currentStreak.streakType, theme.iconColor)}
          </div>

          {/* Text Content */}
          <div className="flex flex-col items-start pr-2">
            {/* Stencil Sub-header */}
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black">
              <span className={theme.accentText}>
                {isLocal ? '✦ TACTICAL ACHIEVEMENT ✦' : '⚠️ ARENA COMBAT ALERT'}
              </span>
              <span className="text-slate-400 font-normal">
                {isLocal ? 'LOCAL OPERATIVE' : currentStreak.killerName}
              </span>
            </div>

            {/* Main Bold Title */}
            <div
              className={`text-xl sm:text-2xl font-black italic tracking-wider uppercase drop-shadow-md flex items-center gap-2 ${theme.titleColor}`}
            >
              <span>{currentStreak.title}</span>
              {currentStreak.count > 1 && (
                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-black/50 border border-white/20 not-italic">
                  x{currentStreak.count}
                </span>
              )}
            </div>

            {/* Subtitle Details & Bonus XP */}
            <div className="text-xs text-slate-300 font-medium flex items-center gap-2 mt-0.5">
              <span>{currentStreak.subtitle}</span>
              {isLocal && currentStreak.bonusPoints > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                  +{currentStreak.bonusPoints} PTS
                </span>
              )}
            </div>
          </div>

          {/* Right Chevron / Medal Stamp */}
          <div className="hidden sm:flex flex-col items-center justify-center pl-2 border-l border-white/15 text-slate-400">
            <Trophy className="w-5 h-5 text-amber-400 mb-0.5" />
            <span className="text-[9px] tracking-tighter uppercase font-bold text-slate-400">STREAK</span>
          </div>
        </div>

        {/* Animated Underline Spark */}
        <div
          className="h-1 rounded-full mt-1.5 transition-all duration-300 animate-pulse"
          style={{
            width: '60%',
            background: `linear-gradient(90deg, transparent, ${tierColor}, transparent)`,
          }}
        />
      </div>
    </>
  );
};

// Helper to choose the signature tier color
function getTierColor(type: string): string {
  switch (type) {
    case 'double_kill':
      return '#f59e0b'; // Amber / Gold
    case 'triple_kill':
    case 'killing_spree':
      return '#f97316'; // Vivid Orange
    case 'quad_kill':
    case 'rampage':
      return '#ef4444'; // Crimson Blood
    case 'mega_kill':
    case 'unstoppable':
    case 'godlike':
      return '#a855f7'; // Neon Violet / Purple
    case 'shutdown':
      return '#06b6d4'; // Cyan Ice / EMP
    case 'first_blood':
    default:
      return '#e11d48'; // Rose
  }
}

// Styling Theme presets
function getTierTheme(type: string) {
  switch (type) {
    case 'double_kill':
      return {
        bg: 'bg-amber-950/90',
        border: 'border-amber-400',
        shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]',
        iconBg: 'bg-amber-600',
        iconBorder: 'border-amber-300',
        iconColor: 'text-amber-100',
        accentText: 'text-amber-400',
        titleColor: 'text-amber-300',
      };
    case 'triple_kill':
    case 'killing_spree':
      return {
        bg: 'bg-orange-950/90',
        border: 'border-orange-500',
        shadow: 'shadow-[0_0_35px_rgba(249,115,22,0.6)]',
        iconBg: 'bg-orange-600',
        iconBorder: 'border-orange-300',
        iconColor: 'text-orange-100',
        accentText: 'text-orange-400',
        titleColor: 'text-orange-300',
      };
    case 'quad_kill':
    case 'rampage':
      return {
        bg: 'bg-red-950/95',
        border: 'border-red-500',
        shadow: 'shadow-[0_0_40px_rgba(239,68,68,0.7)]',
        iconBg: 'bg-red-600',
        iconBorder: 'border-red-300',
        iconColor: 'text-red-100',
        accentText: 'text-red-400',
        titleColor: 'text-red-400',
      };
    case 'mega_kill':
    case 'unstoppable':
    case 'godlike':
      return {
        bg: 'bg-purple-950/95',
        border: 'border-purple-400',
        shadow: 'shadow-[0_0_45px_rgba(168,85,247,0.8)]',
        iconBg: 'bg-purple-600',
        iconBorder: 'border-purple-300',
        iconColor: 'text-purple-100',
        accentText: 'text-purple-300',
        titleColor: 'text-purple-200',
      };
    case 'shutdown':
      return {
        bg: 'bg-cyan-950/95',
        border: 'border-cyan-400',
        shadow: 'shadow-[0_0_35px_rgba(6,182,212,0.6)]',
        iconBg: 'bg-cyan-600',
        iconBorder: 'border-cyan-200',
        iconColor: 'text-cyan-100',
        accentText: 'text-cyan-400',
        titleColor: 'text-cyan-300',
      };
    case 'first_blood':
    default:
      return {
        bg: 'bg-rose-950/90',
        border: 'border-rose-500',
        shadow: 'shadow-[0_0_30px_rgba(244,63,94,0.5)]',
        iconBg: 'bg-rose-600',
        iconBorder: 'border-rose-300',
        iconColor: 'text-rose-100',
        accentText: 'text-rose-400',
        titleColor: 'text-rose-300',
      };
  }
}

// Icon by streak type
function getStreakIcon(type: string, colorClass: string) {
  switch (type) {
    case 'double_kill':
      return <Swords className={`w-6 h-6 ${colorClass}`} />;
    case 'triple_kill':
    case 'killing_spree':
      return <Flame className={`w-6 h-6 ${colorClass} animate-bounce`} />;
    case 'quad_kill':
    case 'rampage':
      return <Zap className={`w-6 h-6 ${colorClass} animate-pulse`} />;
    case 'mega_kill':
    case 'godlike':
      return <Crown className={`w-6 h-6 ${colorClass} animate-pulse`} />;
    case 'shutdown':
      return <ShieldAlert className={`w-6 h-6 ${colorClass}`} />;
    case 'first_blood':
    default:
      return <Skull className={`w-6 h-6 ${colorClass}`} />;
  }
}
