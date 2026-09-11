import React, { useState, useEffect } from 'react';
import { LeaderboardData, LeaderboardTab, LeaderboardEntry } from '../types/game';
import { Trophy, X, Flame, Clock, Award, Play, Database, Copy, Check, ShieldAlert } from 'lucide-react';
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
  const [selectedGroup, setSelectedGroup] = useState<'sector8' | 'global'>('sector8');
  const [sector8Data, setSector8Data] = useState<LeaderboardData | null>(null);
  const [isLoadingS8, setIsLoadingS8] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [sqlMigrationText, setSqlMigrationText] = useState<string>('');

  // Fetch Sector 8 Leaderboard from dedicated API
  useEffect(() => {
    setIsLoadingS8(true);
    fetch('/api/sector8/leaderboard')
      .then((res) => res.json())
      .then((res) => {
        if (res && res.leaderboard) {
          setSector8Data(res.leaderboard);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingS8(false));

    // Also fetch migration text
    fetch('/api/sector8/migration')
      .then((res) => res.text())
      .then((text) => setSqlMigrationText(text))
      .catch(() => {});
  }, []);

  const tabs: { id: LeaderboardTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: 'daily', label: 'DAILY', icon: <Clock className="w-3.5 h-3.5" />, desc: '24-hour tactical combat cycle' },
    { id: 'thisWeek', label: 'THIS WEEK', icon: <Flame className="w-3.5 h-3.5" />, desc: 'Current active tournament round' },
    { id: 'lastWeek', label: 'LAST WEEK', icon: <Award className="w-3.5 h-3.5" />, desc: 'Official certified tournament winners' },
    { id: 'allTime', label: 'ALL-TIME', icon: <Trophy className="w-3.5 h-3.5" />, desc: 'Historical Killzone Legends' },
  ];

  const currentDataSource = selectedGroup === 'sector8' ? (sector8Data || data) : data;
  const currentList: LeaderboardEntry[] = currentDataSource[activeTab] || [];

  const handleCopySql = () => {
    if (sqlMigrationText) {
      navigator.clipboard.writeText(sqlMigrationText);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

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
              <h2 className="text-lg sm:text-xl font-black italic tracking-wide uppercase font-mono text-white flex items-center gap-2">
                <span>{selectedGroup === 'sector8' ? 'SECTOR 8 LEADERBOARD' : 'GLOBAL ARENA LEADERBOARD'}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlModal(true)}
              className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="View & Copy SQL Migration for Supabase SQL Editor"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SQL MIGRATIONS</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sector 8 vs Global Group Switcher */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">GROUP:</span>
            <button
              onClick={() => setSelectedGroup('sector8')}
              className={`px-3 py-1 rounded text-xs font-mono font-black transition-all cursor-pointer ${
                selectedGroup === 'sector8'
                  ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              ★ SECTOR 8 OUTPOST CRUCIBLE
            </button>
            <button
              onClick={() => setSelectedGroup('global')}
              className={`px-3 py-1 rounded text-xs font-mono font-black transition-all cursor-pointer ${
                selectedGroup === 'global'
                  ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              GLOBAL ARENA
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-emerald-400" />
            <span>Bots strictly excluded from leaderboards (user_id = username)</span>
          </div>
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
          {isLoadingS8 && selectedGroup === 'sector8' && !sector8Data ? (
            <div className="py-12 text-center font-mono text-sm text-slate-400 animate-pulse">
              SYNCHRONIZING SECTOR 8 TOURNAMENT INTEL...
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-12 text-center font-mono text-sm text-slate-500">
              No tournament records found for this period. Deploy into Sector 8 to claim the top rank!
            </div>
          ) : (
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
                    const rankBadgeColor =
                      entry.rank === 1
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/40'
                        : entry.rank === 2
                        ? 'text-slate-300 bg-slate-400/10 border-slate-400/40'
                        : entry.rank === 3
                        ? 'text-amber-600 bg-amber-700/10 border-amber-700/40'
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
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-400">
            {selectedGroup === 'sector8' ? 'SECTOR 8 TOURNAMENT MATRIX' : 'GLOBAL COMBAT ARENA'} // LIVE SYNCED
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

      {/* SQL Migration Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-[#0b101c] border border-amber-500/60 rounded-xl max-w-2xl w-full flex flex-col max-h-[85vh] shadow-[0_0_60px_rgba(245,158,11,0.3)] text-white overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono font-bold text-sm uppercase text-amber-400">
                  SECTOR 8 SUPABASE SQL MIGRATION
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-3">
              <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded text-[11px] text-amber-200">
                Execute this SQL in your <strong>Supabase SQL Editor</strong> to provision the dedicated Sector 8 leaderboard tables (Daily, Weekly, All-Time, and Last Week Winners). Bots are excluded automatically, and <code>user_id</code> maps directly to the player username across all sectors.
              </div>

              <div className="relative">
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-300 overflow-x-auto max-h-[50vh] leading-relaxed select-text">
                  {sqlMigrationText || '-- Loading migration script...'}
                </pre>

                <button
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                  <span>{copiedSql ? 'COPIED!' : 'COPY SQL'}</span>
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs uppercase cursor-pointer"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
