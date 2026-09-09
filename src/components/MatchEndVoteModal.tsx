import React, { useEffect, useState } from 'react';
import { GameMode, PlayerState, VotingState } from '../types/game';
import { MAP_OPTIONS, addPlayerCoins } from '../game/loadoutData';
import {
  Trophy,
  Swords,
  MapPin,
  Clock,
  Coins,
  Check,
  Award,
  Vote,
  Shield,
  Zap,
} from 'lucide-react';
import { sounds } from '../game/audio';

interface MatchEndVoteModalProps {
  localPlayer: PlayerState | null;
  votingState?: VotingState;
  winner: string | null;
  gameMode: GameMode;
  teamScores?: { alpha: number; bravo: number };
  onCastVote: (mapId: string, gameMode: GameMode) => void;
  coinsEarned?: number;
}

export const MatchEndVoteModal: React.FC<MatchEndVoteModalProps> = ({
  localPlayer,
  votingState,
  winner,
  gameMode,
  teamScores,
  onCastVote,
  coinsEarned,
}) => {
  const [selectedMap, setSelectedMap] = useState<string>('cyber-complex');
  const [selectedMode, setSelectedMode] = useState<GameMode>('ffa');
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(15);
  const [awardedCoins, setAwardedCoins] = useState<number>(0);

  // Compute and credit coins once when match ends
  useEffect(() => {
    if (!localPlayer) return;
    // Calculate coins: kills * 10, assists * 5, plus win bonus
    const killCoins = (localPlayer.kills || 0) * 10;
    const assistCoins = (localPlayer.assists || 0) * 5;
    let winBonus = 0;
    if (gameMode === 'tdm') {
      const isWinner =
        (teamScores && teamScores.alpha > teamScores.bravo && localPlayer.team === 'alpha') ||
        (teamScores && teamScores.bravo > teamScores.alpha && localPlayer.team === 'bravo');
      if (isWinner) winBonus = 50;
    } else if (winner === localPlayer.name || (gameMode === 'br' && localPlayer.brPlacement === 1)) {
      winBonus = 100;
    }
    const totalCoins = coinsEarned !== undefined ? coinsEarned : killCoins + assistCoins + winBonus;
    setAwardedCoins(totalCoins);
    if (totalCoins > 0) {
      addPlayerCoins(totalCoins);
      sounds.playKill();
    }
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!votingState || !votingState.votingEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((votingState.votingEndsAt - Date.now()) / 1000));
      setTimeRemaining(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [votingState?.votingEndsAt]);

  const handleVote = (mapId: string, mode: GameMode) => {
    setSelectedMap(mapId);
    setSelectedMode(mode);
    setHasVoted(true);
    onCastVote(mapId, mode);
    sounds.playAbility();
  };

  // Tally votes from votingState
  const getMapVoteCount = (mapId: string) => {
    if (!votingState?.mapVotes) return 0;
    return Object.values(votingState.mapVotes).filter((v) => v === mapId).length;
  };

  const getModeVoteCount = (mode: GameMode) => {
    if (!votingState?.modeVotes) return 0;
    return Object.values(votingState.modeVotes).filter((v) => v === mode).length;
  };

  const isTdm = gameMode === 'tdm';
  const alphaScore = teamScores?.alpha ?? 0;
  const bravoScore = teamScores?.bravo ?? 0;
  const playerTeam = localPlayer?.team;
  const isPlayerWinner = isTdm
    ? (alphaScore > bravoScore && playerTeam === 'alpha') || (bravoScore > alphaScore && playerTeam === 'bravo')
    : winner === localPlayer?.name;

  return (
    <div
      id="match-end-vote-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans select-none animate-fade-in"
    >
      <div className="bg-slate-950/95 border border-amber-500/50 rounded-2xl w-full max-w-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.3)] relative overflow-hidden backdrop-blur-xl my-auto">
        {/* Top ambient strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 shadow-[0_0_15px_rgba(245,158,11,0.8)]" />

        {/* Header Match Outcome */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Trophy className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold">
                Combat Operation Debrief
              </span>
              <h2 className="text-2xl sm:text-3xl font-black italic tracking-wide text-white flex items-center gap-2">
                <span>MATCH</span>
                <span className={isPlayerWinner ? 'text-emerald-400 not-italic' : 'text-amber-500 not-italic'}>
                  {isPlayerWinner ? 'VICTORY' : 'CONCLUDED'}
                </span>
              </h2>
            </div>
          </div>

          {/* Voting Countdown */}
          <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-inner">
            <Clock className="w-5 h-5 text-amber-400 animate-spin" />
            <div>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                Next Match In
              </span>
              <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                {timeRemaining}s
              </span>
            </div>
          </div>
        </div>

        {/* Coin Rewards Banner */}
        <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/40 rounded-xl p-4 mb-6 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow">
              <Coins className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase text-amber-300 font-bold block">
                Combat Coins Rewarded
              </span>
              <span className="text-[11px] text-slate-400">
                Kills: {localPlayer?.kills || 0} (+{(localPlayer?.kills || 0) * 10}) • Assists: {localPlayer?.assists || 0} (+{(localPlayer?.assists || 0) * 5})
                {isPlayerWinner && ' • Win Bonus (+50)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-500/60 px-4 py-1.5 rounded-lg">
            <span className="text-lg font-black font-mono text-amber-400">+{awardedCoins}</span>
            <span className="text-xs font-bold text-amber-300 font-mono">COINS</span>
          </div>
        </div>

        {/* Section 1: Map Voting */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Vote For Next Tactical Map</span>
            </label>
            <span className="text-[10px] font-mono text-slate-400">Majority vote selects arena</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {MAP_OPTIONS.map((map) => {
              const isSelected = selectedMap === map.id;
              const voteCount = getMapVoteCount(map.id);

              return (
                <button
                  key={map.id}
                  onClick={() => handleVote(map.id, selectedMode)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div
                    className="w-full h-1 rounded-full mb-2"
                    style={{ backgroundColor: map.badgeColor }}
                  />
                  <div>
                    <h4 className="font-black text-xs sm:text-sm text-white">{map.name}</h4>
                    <span className="text-[9px] text-slate-400 block font-mono mt-0.5">{map.theme}</span>
                  </div>

                  {/* Vote count pill */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Votes:</span>
                    <span className="font-bold text-amber-400">{voteCount}</span>
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

        {/* Section 2: Mode Voting */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-sky-400" />
              <span>Vote For Next Game Mode</span>
            </label>
            <span className="text-[10px] font-mono text-slate-400">Choose match objective</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: 'ffa' as GameMode,
                name: 'Free For All (FFA)',
                desc: 'Solo respawn deathmatch up to 10-minute cutoff mark.',
                color: '#f59e0b',
              },
              {
                id: 'tdm' as GameMode,
                name: 'Team Deathmatch (TDM)',
                desc: 'Squad Alpha vs Bravo. 10 pts per kill, 5 pts per assist. No friendly fire.',
                color: '#38bdf8',
              },
              {
                id: 'br' as GameMode,
                name: 'Battle Royale (BR)',
                desc: 'Shrinking electric safe zone. Single life elimination.',
                color: '#10b981',
              },
            ].map((m) => {
              const isSelected = selectedMode === m.id;
              const voteCount = getModeVoteCount(m.id);

              return (
                <button
                  key={m.id}
                  onClick={() => handleVote(selectedMap, m.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-sky-400 ring-2 ring-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white mb-1">{m.name}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{m.desc}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">Votes:</span>
                    <span className="font-bold text-sky-400">{voteCount}</span>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-400 text-black font-black text-[9px] flex items-center justify-center shadow">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            {hasVoted && (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Vote recorded: {selectedMap.toUpperCase()} • {selectedMode.toUpperCase()}</span>
              </>
            )}
          </div>
          <span className="text-slate-500">Auto-starting match when timer expires...</span>
        </div>
      </div>
    </div>
  );
};
