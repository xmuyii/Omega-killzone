import React, { useState } from 'react';
import { LeaderboardData, LeaderboardTab, LeaderboardEntry } from '../types/game';
import { HERO_DEFINITIONS } from '../game/constants';
import { Trophy, Medal, X, Flame, Calendar, Clock, Award, Shield, User, Play } from 'lucide-react';
import { CharacterAvatar } from './CharacterAvatar';

interface LeaderboardModalProps {
  data: LeaderboardData;
  initialTab?: LeaderboardTab;
  onClose: () => void;
  isPreRoundBrief?: boolean;
  onStartRound?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  data,
  initialTab = 'daily',
  onClose,
  isPreRoundBrief = false,
  onStartRound,
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>(initialTab);

  const tabs: { id: LeaderboardTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'daily', label: 'DAILY', icon: <Clock className="w-3.5 h-3.5" />, desc: '24-hour tactical combat cycle' },
    { id: 'thisWeek', label: 'THIS WEEK', icon: <Flame className="w-3.5 h-3.5" />, desc: 'Current active tournament round' },
    { id: 'lastWeek', label: 'LAST WEEK', icon: <Award className="w-3.5 h-3.5" />, desc: 'Official certified tournament results' },
    { id: 'allTime', label: 'ALL-TIME', icon: <Trophy className="w-3.5 h-3.5" />, desc: 'Historical Killzone Legends' },
  ];

  const currentList: LeaderboardEntry[] = data[activeTab] || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#090e18] border border-slate-700/80 rounded-xl max-w-3xl w-full flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
                <span>OPERATIONAL INTEL</span>
                {isPreRoundBrief && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px]">
                    PRE-ROUND BRIEF
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black italic tracking-wide uppercase font-mono text-white">
                TACTICAL LEADERBOARDS
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800 pb-2">
                  <th className="py-2 px-2">RANK</th>
                  <th className="py-2 px-3">OPERATOR</th>
                  <th className="py-2 px-3 text-center">KILLS</th>
                  <th className="py-2 px-3 text-center">DEATHS</th>
                  <th className="py-2 px-3 text-center">K/D</th>
                  <th className="py-2 px-3 text-center">WINS</th>
                  <th className="py-2 px-3 text-right">COMBAT SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {currentList.map((entry) => {
                  const hero = HERO_DEFINITIONS[entry.heroId] || HERO_DEFINITIONS.sniper;
                  const isTop3 = entry.rank <= 3;
                  const rankBadgeColor =
                    entry.rank === 1 ? 'text-amber-400 bg-amber-500/10 border-amber-500/40'
                    : entry.rank === 2 ? 'text-slate-300 bg-slate-400/10 border-slate-400/40'
                    : entry.rank === 3 ? 'text-amber-600 bg-amber-700/10 border-amber-700/40'
                    : 'text-slate-400 bg-slate-800/40 border-slate-700/40';

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-2.5 px-2">
                        <span
                          className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[11px] border ${rankBadgeColor}`}
                        >
                          {entry.rank}
                        </span>
                      </td>

                      {/* Name & Badge */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <CharacterAvatar heroId={entry.heroId} size="xs" callsign={entry.name} />
                          <span className="font-bold text-white uppercase group-hover:text-amber-400 transition-colors">
                            {entry.name}
                          </span>
                          {entry.badge && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] text-amber-300 font-bold">
                              {entry.badge}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kills */}
                      <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                        {entry.kills}
                      </td>

                      {/* Deaths */}
                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {entry.deaths}
                      </td>

                      {/* KD */}
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                        {entry.kd}
                      </td>

                      {/* Wins */}
                      <td className="py-2.5 px-3 text-center text-sky-400">
                        {entry.wins}
                      </td>

                      {/* Combat Score */}
                      <td className="py-2.5 px-3 text-right font-black text-white">
                        {entry.score.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-500">
            SHOWING 8 TOP SQUADRAN OPERATIVES // SECURE SYNCED
          </div>
          <div className="flex items-center gap-2">
            {isPreRoundBrief && onStartRound && (
              <button
                onClick={onStartRound}
                className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black text-xs uppercase flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>DEPLOY TO ROUND</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs uppercase transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
