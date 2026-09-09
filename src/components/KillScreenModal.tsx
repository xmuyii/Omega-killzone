import React, { useEffect, useState } from 'react';
import { PlayerState, KillEvent, HeroId, GameMode } from '../types/game';
import { HERO_DEFINITIONS } from '../game/constants';
import { Skull, Crosshair, Shield, Heart, ArrowRight, Swords, Sparkles, RefreshCw, RotateCw } from 'lucide-react';

interface KillScreenModalProps {
  player: PlayerState | null;
  lastKillEvent: KillEvent | null;
  selectedHeroId: HeroId;
  onSelectHero: (heroId: HeroId) => void;
  gameMode?: GameMode;
  onReturnToMenu?: () => void;
}

export const KillScreenModal: React.FC<KillScreenModalProps> = ({
  player,
  lastKillEvent,
  selectedHeroId,
  onSelectHero,
  gameMode,
  onReturnToMenu,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(4.5);

  useEffect(() => {
    if (!player || player.isAlive) return;

    if (gameMode === 'br') {
      // In Battle Royale, countdown to return to main menu or allow manual click
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.2) {
            clearInterval(interval);
            onReturnToMenu?.();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(interval);
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, (player.respawnAt - Date.now()) / 1000);
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [player, gameMode, onReturnToMenu]);

  if (!player || player.isAlive) return null;

  // Identify who eliminated the player
  const isKilledBySomeone = lastKillEvent && lastKillEvent.victimId === player.id;
  const killerName = isKilledBySomeone ? lastKillEvent.killerName : 'Combat Hazard';
  const killerHeroId = isKilledBySomeone ? lastKillEvent.killerHero : 'assault';
  const killerHero = HERO_DEFINITIONS[killerHeroId] || HERO_DEFINITIONS.assault;
  const killerWeapon = isKilledBySomeone && lastKillEvent.killerWeapon ? lastKillEvent.killerWeapon : killerHero.weaponName;
  const killerDist = isKilledBySomeone && lastKillEvent.distance ? lastKillEvent.distance : 180;
  const killerHp = isKilledBySomeone && lastKillEvent.killerHp !== undefined ? lastKillEvent.killerHp : 0;
  const killerMaxHp = isKilledBySomeone && lastKillEvent.killerMaxHp ? lastKillEvent.killerMaxHp : killerHero.maxHp;
  const killerArmor = isKilledBySomeone && lastKillEvent.killerArmor !== undefined ? lastKillEvent.killerArmor : 0;
  const killerMaxArmor = isKilledBySomeone && lastKillEvent.killerMaxArmor ? lastKillEvent.killerMaxArmor : killerHero.maxArmor;

  const playableHeroes = [
    HERO_DEFINITIONS.sniper,
    HERO_DEFINITIONS.shotgun,
    HERO_DEFINITIONS.assault,
    HERO_DEFINITIONS.marksman,
  ];

  const totalRespawnSec = 4.5;
  const progressRatio = Math.max(0, Math.min(1, 1 - timeLeft / totalRespawnSec));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in font-sans">
      <div className="bg-slate-950/95 border border-red-500/40 rounded-2xl w-full max-w-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(239,68,68,0.25)] relative overflow-hidden backdrop-blur-xl">
        {/* Top Danger Glow Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]" />

        {/* Header Alert */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-700/80 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <Skull className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase font-bold block">
                Combat Critical Status
              </span>
              <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-white flex items-center gap-2">
                <span>OPERATOR</span>
                <span className="text-red-500 not-italic">NEUTRALIZED</span>
              </h2>
            </div>
          </div>

          {/* Respawn / Main Menu Countdown */}
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5 font-bold">
              {gameMode === 'br' ? 'Main Menu In' : 'Redeployment In'}
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tabular-nums">
              {timeLeft.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Respawn Progress Bar */}
        <div className="w-full bg-slate-900 border border-slate-800 h-2 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            style={{ width: `${progressRatio * 100}%` }}
          />
        </div>

        {gameMode === 'br' && (
          <div className="mb-4">
            <button
              onClick={onReturnToMenu}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 active:scale-98"
            >
              <RotateCw className="w-4 h-4" />
              <span>RETURN TO MAIN MENU NOW ({timeLeft.toFixed(1)}s)</span>
            </button>
          </div>
        )}

        {/* Killer Dossier Card */}
        <div className="bg-[#080b14] border border-slate-800/90 rounded-xl p-4 mb-6 shadow-inner relative">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-400">
              <Crosshair className="w-3.5 h-3.5" /> ELIMINATED BY
            </span>
            {gameMode === 'tdm' && lastKillEvent?.killerTeam && (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-amber-300">
                SQUAD {lastKillEvent.killerTeam.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Killer Operative Color Avatar */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shrink-0 border border-white/20"
                style={{ backgroundColor: killerHero.color }}
              >
                {killerHero.name.charAt(0)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base sm:text-lg text-white tracking-wide">
                    {killerName}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono"
                    style={{
                      backgroundColor: `${killerHero.color}20`,
                      color: killerHero.color,
                      border: `1px solid ${killerHero.color}40`,
                    }}
                  >
                    {killerHero.name} • {killerHero.role}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                  <span>Weapon: <strong className="text-slate-200">{killerWeapon}</strong></span>
                  <span>•</span>
                  <span>Range: <strong className="text-amber-400">{killerDist}m</strong></span>
                </div>
              </div>
            </div>

            {/* Killer Remaining Health & Armor */}
            <div className="w-full sm:w-44 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5 shrink-0 text-[10px] font-mono">
              <span className="text-slate-400 text-[9px] uppercase tracking-wider block font-bold">
                Killer Surviving Vitals
              </span>
              <div>
                <div className="flex justify-between text-slate-300 mb-0.5">
                  <span className="flex items-center gap-1 text-emerald-400"><Heart className="w-3 h-3" /> HP</span>
                  <span className="font-bold">{killerHp} / {killerMaxHp}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full"
                    style={{ width: `${Math.min(100, (killerHp / (killerMaxHp || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-0.5">
                  <span className="flex items-center gap-1 text-sky-400"><Shield className="w-3 h-3" /> Armor</span>
                  <span className="font-bold">{killerArmor} / {killerMaxArmor}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-400 h-full"
                    style={{ width: `${Math.min(100, (killerArmor / (killerMaxArmor || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Operative for Next Respawn */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              Select Next Deployment Operative (Keys 1, 2, 3, 4)
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              Instantly deploys upon respawn
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {playableHeroes.map((h, idx) => {
              const isSelected = h.id === selectedHeroId;
              return (
                <button
                  key={h.id}
                  onClick={() => onSelectHero(h.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/95 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-xs sm:text-sm text-white">{h.name}</span>
                    <span className="text-[9px] font-mono px-1 bg-black/40 border border-white/10 rounded text-slate-400">
                      [{idx + 1}]
                    </span>
                  </div>

                  <div
                    className="w-full h-1 rounded-full mb-1.5"
                    style={{ backgroundColor: h.color }}
                  />

                  <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                    <div>HP: <span className="text-emerald-400 font-bold">{h.maxHp}</span></div>
                    <div>Range: <span className="text-amber-400 font-bold">{h.fireRange}px</span></div>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-black font-black text-[9px] flex items-center justify-center shadow">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Your Performance: <strong className="text-emerald-400">{player.kills} Kills</strong> • <strong className="text-amber-400">{player.score} Score</strong></span>
          <span className="text-slate-500">Auto-respawning sequence active...</span>
        </div>
      </div>
    </div>
  );
};
