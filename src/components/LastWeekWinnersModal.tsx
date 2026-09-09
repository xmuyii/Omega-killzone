import React from 'react';
import { LeaderboardEntry } from '../types/game';
import { Trophy, Award, Medal, X, ShieldAlert, Target, Crosshair, Check } from 'lucide-react';
import { HERO_DEFINITIONS } from '../game/constants';

interface LastWeekWinnersModalProps {
  winners: LeaderboardEntry[];
  onClose: () => void;
}

export const LastWeekWinnersModal: React.FC<LastWeekWinnersModalProps> = ({ winners, onClose }) => {
  const top10 = winners.slice(0, 10);
  const top3 = top10.slice(0, 3);
  const ranks4to10 = top10.slice(3);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#090d16] border border-amber-500/40 rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative text-white animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-2">
              <span>TOURNAMENT ARCHIVE // CLASSIFIED</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[9px] border border-amber-500/30">
                TOP 10 ACES
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wide uppercase text-white font-mono">
              LAST WEEK'S TOP 10 CHAMPIONS
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4 font-mono leading-relaxed">
          The previous weekly combat circuit concluded with elite honours awarded. Review the reigning top 10 champions of the Killzone arena before deploying.
        </p>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {top3.map((winner, idx) => {
              const hero = HERO_DEFINITIONS[winner.heroId] || HERO_DEFINITIONS.sniper;
              const rankMedal =
                idx === 0 ? { label: '1ST PLACE', color: 'text-amber-400 border-amber-500/50 bg-amber-500/10' }
                : idx === 1 ? { label: '2ND PLACE', color: 'text-slate-300 border-slate-400/40 bg-slate-400/10' }
                : { label: '3RD PLACE', color: 'text-amber-600 border-amber-700/40 bg-amber-700/10' };

              return (
                <div
                  key={winner.id}
                  className={`p-3 rounded-lg border flex flex-col items-center text-center transition-transform ${rankMedal.color}`}
                >
                  <div className="text-[10px] font-mono font-black tracking-widest mb-1 flex items-center gap-1">
                    <Medal className="w-3.5 h-3.5" />
                    <span>{rankMedal.label}</span>
                  </div>
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-black text-black text-base my-1.5 shadow-lg"
                    style={{ backgroundColor: hero.color }}
                  >
                    {winner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs font-black font-mono text-white truncate max-w-[130px] uppercase">
                    {winner.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{hero.name} // {hero.role}</div>
                  <div className="mt-2.5 pt-2 border-t border-white/10 w-full flex justify-around text-[9px] font-mono">
                    <div>
                      <span className="text-slate-500 block">KILLS</span>
                      <span className="font-bold text-amber-400">{winner.kills}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">K/D</span>
                      <span className="font-bold text-emerald-400">{winner.kd}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">SCORE</span>
                      <span className="font-bold text-sky-400">{winner.score.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ranks 4 to 10 Extended Tactical Standings */}
          {ranks4to10.length > 0 && (
            <div className="border border-slate-800 rounded-lg bg-slate-950/70 overflow-hidden font-mono text-xs">
              <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400 flex items-center justify-between">
                <span>RANKS 4 - 10 HONOR ROLL</span>
                <span className="text-slate-500 text-[9px]">OFFICIAL VERIFIED SCORES</span>
              </div>
              <div className="divide-y divide-slate-850">
                {ranks4to10.map((entry, idx) => {
                  const hero = HERO_DEFINITIONS[entry.heroId] || HERO_DEFINITIONS.sniper;
                  const rank = idx + 4;
                  return (
                    <div
                      key={entry.id}
                      className="px-3 py-2 flex items-center justify-between hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center font-bold text-slate-400 text-[11px]">
                          #{rank}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: hero.color }}
                        />
                        <div className="truncate">
                          <span className="font-bold text-white uppercase text-xs">{entry.name}</span>
                          {entry.title && (
                            <span className="text-[9px] text-slate-400 ml-2 hidden sm:inline">
                              [{entry.title}]
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-shrink-0">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border hidden sm:inline"
                          style={{
                            borderColor: `${hero.color}40`,
                            backgroundColor: `${hero.color}15`,
                            color: hero.color,
                          }}
                        >
                          {hero.role}
                        </span>
                        <span>
                          <span className="text-slate-500">K:</span>{' '}
                          <strong className="text-amber-400">{entry.kills}</strong>
                        </span>
                        <span>
                          <span className="text-slate-500">K/D:</span>{' '}
                          <strong className="text-emerald-400">{entry.kd}</strong>
                        </span>
                        <span className="w-16 text-right font-bold text-sky-400">
                          {entry.score.toLocaleString()} PTS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-3 mt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black uppercase font-mono tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>ACKNOWLEDGE & ENTER ARENA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
