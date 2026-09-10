import React from 'react';
import { PlayerState, GameMode, TeamId, HeroId } from '../types/game';
import { HERO_DEFINITIONS } from '../game/constants';
import { CharacterAvatar } from './CharacterAvatar';
import {
  Users,
  X,
  Swords,
  Flame,
  Shield,
  Eye,
  Bot,
  Skull,
  Award,
  Zap,
} from 'lucide-react';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Record<string, PlayerState>;
  localPlayerId: string;
  gameMode: GameMode;
  teamScores?: { alpha: number; bravo: number };
  roomId: string;
  maxCapacity?: number;
  spectatorCount?: number;
  isSpectator?: boolean;
  onSelectSpectatePlayer?: (playerId: string) => void;
  spectatedPlayerId?: string | null;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  players,
  localPlayerId,
  gameMode,
  teamScores,
  roomId,
  maxCapacity = 10,
  spectatorCount = 0,
  isSpectator = false,
  onSelectSpectatePlayer,
  spectatedPlayerId,
}) => {
  if (!isOpen) return null;

  const playerList = Object.values(players) as PlayerState[];
  const humanCount = playerList.filter((p) => !p.isBot).length;
  const totalCount = playerList.length;

  const alphaPlayers = playerList
    .filter((p) => p.team === 'alpha')
    .sort((a, b) => b.score - a.score || b.kills - a.kills);

  const bravoPlayers = playerList
    .filter((p) => p.team === 'bravo')
    .sort((a, b) => b.score - a.score || b.kills - a.kills);

  const rankedPlayers = [...playerList].sort(
    (a, b) => b.score - a.score || b.kills - a.kills
  );

  const renderPlayerRow = (p: PlayerState, index: number) => {
    const isLocal = p.id === localPlayerId;
    const isBeingSpectated = p.id === spectatedPlayerId;
    const hero = HERO_DEFINITIONS[p.heroId] || HERO_DEFINITIONS.assault;
    const hpRatio = Math.max(0, Math.min(1, p.hp / p.maxHp));

    return (
      <tr
        key={p.id}
        className={`border-b border-slate-800/80 transition-colors ${
          isLocal
            ? 'bg-amber-500/15 text-white font-semibold'
            : isBeingSpectated
            ? 'bg-sky-500/15 text-sky-200'
            : 'hover:bg-slate-900/60 text-slate-300'
        }`}
      >
        {/* Rank */}
        <td className="py-2.5 px-3 text-center text-xs font-mono text-slate-400">
          #{index + 1}
        </td>

        {/* Operative & Callsign */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2.5">
            <CharacterAvatar heroId={p.heroId} size="sm" callsign={p.name} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`text-xs font-bold truncate ${isLocal ? 'text-amber-300' : 'text-slate-100'}`}>
                  {p.name}
                </span>
                {isLocal && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[9px] font-black tracking-wider uppercase shrink-0">
                    YOU
                  </span>
                )}
                {p.isBot && (
                  <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px] font-mono shrink-0 flex items-center gap-0.5">
                    <Bot className="w-2.5 h-2.5" /> BOT
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {hero.name} • {hero.role}
              </span>
            </div>
          </div>
        </td>

        {/* Status / Health */}
        <td className="py-2.5 px-3">
          {p.isAlive ? (
            <div className="flex flex-col gap-1 w-24">
              <div className="flex justify-between items-center text-[9px] font-mono text-emerald-400">
                <span>ALIVE</span>
                <span>{Math.round(p.hp)} HP</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    hpRatio > 0.5 ? 'bg-emerald-500' : hpRatio > 0.25 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpRatio * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/40 text-rose-400 text-[10px] font-mono font-bold">
              <Skull className="w-3 h-3" /> ELIMINATED
            </span>
          )}
        </td>

        {/* Combat Stats: Kills, Deaths, Assists, Streak, Score */}
        <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-slate-100">
          {p.kills}
        </td>
        <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">
          {p.deaths}
        </td>
        <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-400">
          {p.assists || 0}
        </td>
        <td className="py-2.5 px-3 text-center font-mono text-xs">
          {(p.killStreak || 0) >= 2 ? (
            <span className="inline-flex items-center gap-1 text-amber-400 font-black animate-pulse">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>{p.killStreak}</span>
            </span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>
        <td className="py-2.5 px-3 text-right font-mono text-xs font-black text-amber-400">
          {p.score.toLocaleString()}
        </td>

        {/* Spectate Action if spectator or dead */}
        {(isSpectator || !isLocal) && (
          <td className="py-2.5 px-3 text-right">
            {p.isAlive && onSelectSpectatePlayer ? (
              <button
                onClick={() => onSelectSpectatePlayer(p.id)}
                className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors flex items-center gap-1 ml-auto ${
                  isBeingSpectated
                    ? 'bg-sky-500 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Follow camera on this operative"
              >
                <Eye className="w-3 h-3" />
                <span>{isBeingSpectated ? 'VIEWING' : 'WATCH'}</span>
              </button>
            ) : null}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none pointer-events-auto animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#090e1b] border border-slate-700/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900/95 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
                  <span>TACTICAL SCOREBOARD</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                    {roomId.toUpperCase()}
                  </span>
                </h2>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-3">
                <span className="text-emerald-400 font-bold">
                  ● {humanCount} Human / {totalCount} Active (Capacity: {maxCapacity})
                </span>
                {spectatorCount > 0 && (
                  <span className="text-sky-400">
                    👁️ {spectatorCount} Spectators
                  </span>
                )}
                <span className="text-slate-500 uppercase">
                  MODE: {gameMode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
              [TAB] to toggle
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {gameMode === 'tdm' ? (
            /* TEAM DEATHMATCH DUAL-SQUAD VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Squad Alpha (Blue) */}
              <div className="bg-slate-950/70 border border-sky-900/50 rounded-xl overflow-hidden">
                <div className="bg-sky-950/60 border-b border-sky-800/40 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                    <span className="font-black text-sky-300 text-sm tracking-wide">
                      SQUAD ALPHA
                    </span>
                  </div>
                  <div className="font-mono font-black text-lg text-sky-400">
                    {teamScores?.alpha ?? 0} PTS
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-900/40">
                        <th className="py-2 px-3 text-center">#</th>
                        <th className="py-2 px-3">Operative</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-center">K</th>
                        <th className="py-2 px-3 text-center">D</th>
                        <th className="py-2 px-3 text-center">A</th>
                        <th className="py-2 px-3 text-center">Streak</th>
                        <th className="py-2 px-3 text-right">Score</th>
                        {(isSpectator || playerList.some(p => p.id === localPlayerId && !p.isAlive)) && (
                          <th className="py-2 px-3 text-right">View</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {alphaPlayers.length > 0 ? (
                        alphaPlayers.map((p, i) => renderPlayerRow(p, i))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-xs font-mono text-slate-500">
                            No operatives currently in Squad Alpha
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Squad Bravo (Red) */}
              <div className="bg-slate-950/70 border border-rose-900/50 rounded-xl overflow-hidden">
                <div className="bg-rose-950/60 border-b border-rose-800/40 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                    <span className="font-black text-rose-300 text-sm tracking-wide">
                      SQUAD BRAVO
                    </span>
                  </div>
                  <div className="font-mono font-black text-lg text-rose-400">
                    {teamScores?.bravo ?? 0} PTS
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-900/40">
                        <th className="py-2 px-3 text-center">#</th>
                        <th className="py-2 px-3">Operative</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-center">K</th>
                        <th className="py-2 px-3 text-center">D</th>
                        <th className="py-2 px-3 text-center">A</th>
                        <th className="py-2 px-3 text-center">Streak</th>
                        <th className="py-2 px-3 text-right">Score</th>
                        {(isSpectator || playerList.some(p => p.id === localPlayerId && !p.isAlive)) && (
                          <th className="py-2 px-3 text-right">View</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {bravoPlayers.length > 0 ? (
                        bravoPlayers.map((p, i) => renderPlayerRow(p, i))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-xs font-mono text-slate-500">
                            No operatives currently in Squad Bravo
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* FFA / BATTLE ROYALE / TRAINING RANKED TABLE */
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400 bg-slate-900/50">
                      <th className="py-2.5 px-3 text-center">Rank</th>
                      <th className="py-2.5 px-3">Operative</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Kills</th>
                      <th className="py-2.5 px-3 text-center">Deaths</th>
                      <th className="py-2.5 px-3 text-center">Assists</th>
                      <th className="py-2.5 px-3 text-center">Killstreak</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                      {(isSpectator || playerList.some(p => p.id === localPlayerId && !p.isAlive)) && (
                        <th className="py-2.5 px-3 text-right">Spectate</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rankedPlayers.length > 0 ? (
                      rankedPlayers.map((p, i) => renderPlayerRow(p, i))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs font-mono text-slate-500">
                          Waiting for operatives to enter combat arena...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-slate-400 text-xs font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Dedicated Server Sharding: 10 Players per Server with Auto-Overflow</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Press [TAB] or click anywhere outside to return to combat
          </div>
        </div>
      </div>
    </div>
  );
};
