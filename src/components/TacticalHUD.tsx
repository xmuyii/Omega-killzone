import React, { useState, useEffect } from 'react';
import {
  PlayerState,
  HeroDefinition,
  KillEvent,
  HeroId,
  GameMode,
  TeamId,
  SafeZone,
  SectorMmoInfo,
  MmoSectorLiveState,
} from '../types/game';
import {
  Volume2,
  VolumeX,
  Users,
  RotateCw,
  Zap,
  Ghost,
  ShieldAlert,
  Bomb,
  Flame,
  Radio,
  Copy,
  Check,
  Swords,
  Bot,
  UserCheck,
  Shield,
  Coins,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  Eye,
  LogOut,
  Maximize2,
  Globe,
  Database,
  Trophy,
} from 'lucide-react';
import { requestLandscapeMode } from '../utils/orientation';

interface TacticalHUDProps {
  player: PlayerState | undefined;
  hero: HeroDefinition;
  kills: KillEvent[];
  allPlayers: Record<string, PlayerState>;
  ping: number;
  roomId: string;
  isMuted: boolean;
  gameMode?: GameMode;
  teamScores?: { alpha: number; bravo: number };
  enableBots?: boolean;
  turretInventory?: number;
  playerCoins?: number;
  safeZone?: SafeZone;
  connectedPlayerCount?: number;
  maxServerCapacity?: number;
  spectatorCount?: number;
  isSpectator?: boolean;
  spectatedPlayer?: PlayerState | null;
  sectorMmoInfo?: SectorMmoInfo;
  teleportAlert?: {
    playerName: string;
    playerId: string;
    isResident: boolean;
    homeSector: number;
    timestamp: number;
  } | null;
  bountyAlert?: {
    targetName: string;
    targetId: string;
    rewardGold: number;
    reason?: string;
    sectorNumber?: number;
  } | null;
  bountyClaimed?: {
    killerName: string;
    killerId: string;
    victimName: string;
    rewardGold: number;
    sectorNumber?: number;
  } | null;
  onOpenScoreboard?: () => void;
  onNextSpectate?: () => void;
  onPrevSpectate?: () => void;
  onToggleMute: () => void;
  onOpenHeroSelect: () => void;
  onSelectHero?: (heroId: HeroId) => void;
  onUseAbility: () => void;
  onReload: () => void;
  onDeployTurret?: () => void;
  onThrowGrenade?: () => void;
  onToggleWeapon?: () => void;
  onOpenShop?: () => void;
  onToggleBots?: () => void;
  isFreeCam?: boolean;
  onToggleFreeCam?: () => void;
  onReturnToMenu?: () => void;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  player,
  hero,
  kills,
  allPlayers,
  ping,
  roomId,
  isMuted,
  gameMode = 'ffa',
  teamScores,
  enableBots = false,
  turretInventory = 0,
  playerCoins = 0,
  safeZone,
  connectedPlayerCount,
  maxServerCapacity = 10,
  spectatorCount = 0,
  isSpectator = false,
  spectatedPlayer,
  sectorMmoInfo,
  teleportAlert,
  bountyAlert,
  bountyClaimed,
  onOpenScoreboard,
  onNextSpectate,
  onPrevSpectate,
  onToggleMute,
  onOpenHeroSelect,
  onSelectHero,
  onUseAbility,
  onReload,
  onDeployTurret,
  onThrowGrenade,
  onToggleWeapon,
  onOpenShop,
  onToggleBots,
  isFreeCam = false,
  onToggleFreeCam,
  onReturnToMenu,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showSectorDetails, setShowSectorDetails] = useState<boolean>(false);
  const [mmoLiveState, setMmoLiveState] = useState<MmoSectorLiveState | null>(null);
  const [isLoadingMmo, setIsLoadingMmo] = useState<boolean>(false);

  const activeBountyPlayer = React.useMemo(() => {
    return (Object.values(allPlayers) as PlayerState[]).find(
      (p) => p.isAlive && p.hasBounty && (p.bountyReward || 0) > 0
    );
  }, [allPlayers]);

  useEffect(() => {
    if (showSectorDetails && sectorMmoInfo?.sectorNumber) {
      setIsLoadingMmo(true);
      fetch(`/api/mmo/sector/${sectorMmoInfo.sectorNumber}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.liveState) {
            setMmoLiveState(data.liveState);
          }
        })
        .catch((err) => console.warn('Could not fetch MMO sector state:', err))
        .finally(() => setIsLoadingMmo(false));
    }
  }, [showSectorDetails, sectorMmoInfo?.sectorNumber]);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hpPercent = player ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  const armorPercent =
    player && player.maxArmor > 0
      ? Math.max(0, Math.min(100, (player.armor / player.maxArmor) * 100))
      : 0;

  const now = Date.now();
  const abilityRemainingMs = player ? Math.max(0, player.abilityReadyAt - now) : 0;
  const abilityReady = abilityRemainingMs === 0;
  const abilityCooldownProgress =
    player && !abilityReady ? (abilityRemainingMs / (hero.abilityCooldown * 1000)) * 100 : 0;

  // Icon mapping for ability
  const renderAbilityIcon = () => {
    switch (hero.id) {
      case 'sniper':
      case 'valkyrie':
      case 'mirage':
      case 'raven':
        return <Zap className="w-5 h-5 text-black" />;
      case 'shotgun':
      case 'sparkle':
        return <Bomb className="w-5 h-5 text-black" />;
      case 'assault':
      case 'stalker':
        return <Ghost className="w-5 h-5 text-black" />;
      case 'marksman':
      case 'titan':
      case 'bastion':
        return <ShieldAlert className="w-5 h-5 text-black" />;
      default:
        return <Zap className="w-5 h-5 text-black" />;
    }
  };

  const activePlayersList = Object.values(allPlayers) as PlayerState[];
  const humanCount = activePlayersList.filter((p) => !p.isBot).length;

  const isTeleportActive = Boolean(teleportAlert && Date.now() - teleportAlert.timestamp < 6500);
  const isForeignIntruder = Boolean(isTeleportActive && teleportAlert && !teleportAlert.isResident);
  const isResidentTeleport = Boolean(isTeleportActive && teleportAlert && teleportAlert.isResident);

  const activeBountyTargets = React.useMemo(() => {
    return (Object.values(allPlayers) as PlayerState[]).filter(
      (p) => p.isAlive && p.hasBounty && (p.bountyReward || 0) > 0
    );
  }, [allPlayers]);

  return (
    <div
      id="tactical-hud-container"
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-between select-none font-sans transition-all duration-300 ${
        isForeignIntruder
          ? 'dashboard-intruder-active border-4 border-rose-500 shadow-[inset_0_0_120px_rgba(244,63,94,0.85)]'
          : isResidentTeleport
          ? 'dashboard-resident-active border-4 border-sky-400 shadow-[inset_0_0_90px_rgba(56,189,248,0.7)]'
          : ''
      }`}
    >
      {/* SECTOR 8 TELEPORT / FOREIGN INTRUSION STROBE BANNER */}
      {isTeleportActive && teleportAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none select-none">
          <div
            className={`w-full py-2.5 px-4 flex items-center justify-between text-xs font-mono font-black tracking-wider uppercase shadow-2xl border-b-2 ${
              isForeignIntruder
                ? 'bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white border-yellow-400 animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.95)]'
                : 'bg-gradient-to-r from-sky-700 via-cyan-600 to-sky-700 text-white border-amber-400 shadow-[0_0_40px_rgba(56,189,248,0.85)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isForeignIntruder ? (
                <ShieldAlert className="w-5 h-5 text-yellow-300 animate-bounce shrink-0" />
              ) : (
                <Zap className="w-5 h-5 text-amber-300 animate-pulse fill-amber-300 shrink-0" />
              )}
              <span className="drop-shadow-md text-[11px] sm:text-xs">
                {isForeignIntruder
                  ? `🚨 [SECTOR 8 INTRUSION ALERT] FOREIGN OPERATIVE "${teleportAlert.playerName.toUpperCase()}" FROM SECTOR ${teleportAlert.homeSector} TELEPORTED INTO SECTOR 8! 🚨`
                  : `⚡ [SECTOR 8 WARP] RESIDENT OPERATIVE "${teleportAlert.playerName.toUpperCase()}" TELEPORTED INTO SECTOR 8 (-1 CHARGE) ⚡`}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] bg-black/50 px-2.5 py-1 rounded border border-white/20">
              <span className="text-amber-300 font-mono">UNFRIENDLY SCORES CRUCIBLE</span>
              <span>● ACTIVE WARZONE</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTOR 8 IN-GAME LIVE NEWS TICKER: Moves across screen until bounty claimed or target leaves/defeated */}
      {activeBountyTargets.length > 0 && (
        <div className="fixed top-12 sm:top-14 left-0 right-0 z-30 pointer-events-none select-none bg-gradient-to-r from-red-950/95 via-black/95 to-red-950/95 border-y-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.5)] py-1.5 overflow-hidden flex items-center">
          <div className="flex items-center gap-2 px-3 py-0.5 bg-red-600 text-black font-black font-mono text-[10px] uppercase tracking-wider shrink-0 shadow-lg ml-2 rounded-l">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>SECTOR 8 BREAKING NEWS</span>
          </div>
          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="animate-news-ticker font-mono text-xs font-bold text-amber-200 tracking-wide">
              {activeBountyTargets.map((b, idx) => (
                <span key={idx} className="mx-8 inline-flex items-center gap-2.5">
                  <span className="text-red-400 font-black">● BREAKING NEWS WIRE:</span>
                  <span className="text-white font-black uppercase">HIGH COMMAND BOUNTY TARGET IDENTIFIED IN SECTOR 8:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-black tracking-wider">[{b.name.toUpperCase()}]</span>
                  <span className="text-amber-300 font-black">REWARD: {b.bountyReward || 1000} GOLD</span>
                  <span className="text-slate-300">• UNFRIENDLY SCORES CRUCIBLE • BROADCAST ACTIVE UNTIL TARGET IS CLAIMED OR EXPELLED •</span>
                  <span className="text-red-400 font-bold">KILL ON SIGHT</span>
                  <span className="text-amber-400">⚡</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Immersive UI Header */}
      <header className="relative z-20 flex justify-between items-start p-3 sm:p-5 pl-52 sm:pl-64 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        {/* Left Side: Operator Info & Squad Score */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Operator Card */}
          <button
            onClick={onOpenHeroSelect}
            className="bg-slate-900/80 border border-slate-700 p-2 sm:p-2.5 rounded flex items-center gap-2.5 backdrop-blur-md hover:border-slate-500 hover:bg-slate-900 transition-all text-left group shadow-lg cursor-pointer"
            title="Click or press H to change Operator"
          >
            <div
              className="w-9 h-9 sm:w-11 sm:h-11 rounded flex items-center justify-center font-black text-black text-base sm:text-lg shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-transform group-hover:scale-105"
              style={{ backgroundColor: hero.color }}
            >
              {hero.name.charAt(0)}
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
                <span>Operator</span>
                <span className="text-amber-400 group-hover:underline text-[9px] font-mono">[H]</span>
              </div>
              <div className="text-sm sm:text-base font-black tracking-tight italic text-slate-100 uppercase truncate max-w-[100px] sm:max-w-[140px]">
                {player?.name || 'GHOST_X'}
              </div>
            </div>
          </button>

          {/* Quick Operative Switcher (1: Sniper, 2: Shotgun, 3: Assault, 4: Marksman) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 border border-slate-700 p-1.5 rounded backdrop-blur-md shadow-lg pointer-events-auto">
            <span className="text-[9px] uppercase tracking-widest text-slate-400 font-bold px-1 flex items-center gap-1">
              <Swords className="w-3 h-3 text-amber-400" />
              <span>Class:</span>
            </span>
            {[
              { id: 'sniper' as HeroId, key: '1', name: 'SNIPER', color: '#10b981' },
              { id: 'shotgun' as HeroId, key: '2', name: 'SHOTGUN', color: '#f59e0b' },
              { id: 'assault' as HeroId, key: '3', name: 'ASSAULT', color: '#38bdf8' },
              { id: 'marksman' as HeroId, key: '4', name: 'MARKSMAN', color: '#ec4899' },
            ].map((op) => {
              const isActive = hero.id === op.id;
              return (
                <button
                  key={op.id}
                  onClick={() => onSelectHero?.(op.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white border ring-1 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                  style={{
                    borderColor: isActive ? op.color : 'transparent',
                  }}
                  title={`Select ${op.name} (Key: ${op.key})`}
                >
                  <span className="text-[9px] text-slate-500">[{op.key}]</span>
                  <span style={{ color: isActive ? op.color : undefined }}>{op.name}</span>
                </button>
              );
            })}
          </div>

          {/* Squad / Player Score */}
          <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded flex flex-col justify-center backdrop-blur-md shadow-lg">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
              Score
            </div>
            <div className="text-base sm:text-lg font-mono font-bold text-amber-500">
              {(player?.score || 0).toLocaleString()}
            </div>
          </div>

          {/* Locked Game Mode Badge & TDM Scores (Modes locked during match) */}
          <div className="bg-slate-900/80 border border-slate-700 px-2.5 py-1.5 rounded flex items-center gap-2 backdrop-blur-md shadow-lg">
            <div
              className="text-[10px] font-mono font-bold uppercase px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5"
              title="Game mode is locked during active match"
            >
              <Swords className="w-3 h-3 text-amber-400" />
              <span>
                {gameMode === 'tdm'
                  ? 'MODE: TDM'
                  : gameMode === 'br'
                  ? 'MODE: BATTLE ROYALE'
                  : gameMode === 'training'
                  ? 'MODE: TRAINING'
                  : 'MODE: FFA'}
              </span>
            </div>

            {gameMode === 'tdm' && teamScores && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold">
                <span className={`px-1.5 py-0.5 rounded ${player?.team === 'alpha' ? 'bg-sky-950 text-sky-400 border border-sky-600/40' : 'text-slate-400'}`}>
                  A: {teamScores.alpha}
                </span>
                <span className="text-slate-600">:</span>
                <span className={`px-1.5 py-0.5 rounded ${player?.team === 'bravo' ? 'bg-rose-950 text-rose-400 border border-rose-600/40' : 'text-slate-400'}`}>
                  B: {teamScores.bravo}
                </span>
              </div>
            )}
          </div>

          {/* Active Killstreak Badge */}
          {(player?.killStreak || 0) >= 2 && (
            <div className="bg-gradient-to-r from-amber-950/90 to-red-950/90 border border-amber-500 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <div className="flex flex-col leading-none">
                <span className="text-[8px] uppercase tracking-widest text-amber-400 font-black">ACTIVE STREAK</span>
                <span className="text-xs font-mono font-black text-amber-200">
                  {player?.killStreak} KILLS
                </span>
              </div>
            </div>
          )}

          {/* Training vs PvP Indicator */}
          {gameMode === 'training' ? (
            <div
              className="px-2.5 py-1.5 rounded border border-emerald-500/60 bg-emerald-950/70 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg"
              title="Training Simulation: Practice bots deployed for combat drills"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>TRAINING: BOTS ACTIVE</span>
            </div>
          ) : (
            <div
              className="px-2.5 py-1.5 rounded border border-slate-700 bg-slate-900/80 text-slate-300 text-[10px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg"
              title="Live Multiplayer Match (Bots restricted to Training Mode)"
            >
              <Swords className="w-3.5 h-3.5 text-sky-400" />
              <span>LIVE PVP MATCH</span>
            </div>
          )}

          {/* Sector MMO Persistent Link Badge */}
          {sectorMmoInfo && (
            <div className="relative">
              <button
                onClick={() => setShowSectorDetails(!showSectorDetails)}
                className={`px-2.5 py-1.5 rounded border flex items-center gap-2 backdrop-blur-md shadow-lg transition-all cursor-pointer ${
                  sectorMmoInfo.isFrontlineCombatZone
                    ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-900/85 border-sky-500/50 text-sky-300'
                }`}
                title="Click to view Persistent MMO Sector Sync Intel"
              >
                <Database className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                <div className="flex flex-col text-left leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-mono font-black tracking-wider text-white">
                      SECTOR {sectorMmoInfo.sectorNumber}
                    </span>
                    <span className="text-[8px] font-mono px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded">
                      MMO SYNC
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-400 max-w-[130px] sm:max-w-[180px] truncate hidden sm:block">
                    {sectorMmoInfo.baseStatus}
                  </span>
                </div>
              </button>

              {/* Sector MMO Details Modal / Flyout */}
              {showSectorDetails && (
                <div className="absolute top-full left-0 mt-2 w-84 sm:w-96 bg-[#080d19] border border-amber-500/60 rounded-xl p-4 shadow-2xl z-50 font-mono text-xs max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="font-black text-amber-400 text-xs uppercase flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                      <span>{sectorMmoInfo.sectorName}</span>
                    </span>
                    <button
                      onClick={() => setShowSectorDetails(false)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                    {sectorMmoInfo.mmoContext}
                  </p>

                  <div className="space-y-1.5 text-[10px] bg-slate-950/80 p-2.5 rounded border border-slate-800 mb-3">
                    <div className="text-slate-400 flex justify-between">
                      <span className="text-slate-500">BASE STATUS:</span>
                      <span className="text-amber-300 font-bold">{sectorMmoInfo.baseStatus}</span>
                    </div>
                    <div className="text-slate-400 flex justify-between">
                      <span className="text-slate-500">RESOURCE NODE:</span>
                      <span className="text-sky-300 font-bold">{sectorMmoInfo.resourceNode}</span>
                    </div>
                    {mmoLiveState?.lastPhaseName && (
                      <div className="text-slate-400 flex justify-between">
                        <span className="text-slate-500">SECTOR PHASE:</span>
                        <span className="text-emerald-400 font-bold">{mmoLiveState.lastPhaseName}</span>
                      </div>
                    )}
                    {mmoLiveState?.dominance && (
                      <div className="text-slate-400 flex justify-between">
                        <span className="text-slate-500">DOMINANCE:</span>
                        <span className="text-amber-400 font-bold">
                          {mmoLiveState.dominance.alliance || 'CONTESTED'} ({mmoLiveState.dominance.percentage || 50}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* MMO Sector Occupants (Commanders in Sector 8) */}
                  {mmoLiveState?.occupants && mmoLiveState.occupants.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Active Outposts in Sector {sectorMmoInfo.sectorNumber}</span>
                        <span className="text-[9px] text-slate-500">({mmoLiveState.occupants.length} Bases)</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                        {mmoLiveState.occupants.map((occ, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900/90 border border-slate-800 p-1.5 rounded flex items-center justify-between text-[10px]"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200">{occ.username}</span>
                              <span className="text-[9px] text-slate-400">
                                {occ.baseName || 'Forward Outpost'} (HQ Lv.{occ.baseHqLevel || 1})
                              </span>
                            </div>
                            <div className="text-right flex flex-col">
                              {occ.totalPower !== undefined && (
                                <span className="text-sky-400 font-bold">{occ.totalPower.toLocaleString()} PWR</span>
                              )}
                              {occ.warPoints !== undefined && (
                                <span className="text-[9px] text-amber-400">{occ.warPoints} War Pts</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Sector Bounties */}
                  {mmoLiveState?.bounties && mmoLiveState.bounties.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Sector Bounty Targets</span>
                        <span className="text-[9px] text-amber-400 font-bold">Claim in Killzone</span>
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {mmoLiveState.bounties.map((b) => (
                          <div
                            key={b.bountyId}
                            className="bg-red-950/40 border border-red-500/40 p-1.5 rounded flex items-center justify-between text-[10px]"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-red-300">{b.targetName}</span>
                              <span className="text-[9px] text-slate-400 truncate max-w-[170px]">{b.reason}</span>
                            </div>
                            <span className="font-bold text-amber-400 shrink-0 ml-2">
                              +{b.rewardGold} Gold
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoadingMmo && (
                    <div className="text-center py-2 text-slate-400 text-[10px] animate-pulse">
                      Synchronizing with Sector {sectorMmoInfo.sectorNumber} database tables...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Sector 8 Bounty Target Badge */}
          {activeBountyPlayer && (
            <div className="bg-gradient-to-r from-amber-950/95 via-yellow-950/95 to-amber-950/95 border border-amber-400/90 px-3 py-1 rounded flex items-center gap-2 backdrop-blur-md shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
              <div className="flex flex-col leading-tight">
                <span className="text-[8px] uppercase tracking-wider text-amber-300 font-black">
                  SECTOR 8 BOUNTY
                </span>
                <span className="text-[11px] font-mono font-black text-amber-100 flex items-center gap-1">
                  <span>{activeBountyPlayer.name}</span>
                  <span className="text-amber-400">({activeBountyPlayer.bountyReward}G)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Online Players / Roster, Shop, Latency, Audio Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Online Players / Roster [TAB] */}
          <button
            onClick={onOpenScoreboard}
            className="bg-slate-900/80 hover:bg-slate-800 border border-sky-500/40 hover:border-sky-400 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md text-slate-200 transition-all cursor-pointer shadow-lg group"
            title="View Online Players & Scoreboard [TAB]"
          >
            <Users className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-1 font-mono text-xs font-bold">
              <span className="text-sky-300">
                {connectedPlayerCount ?? (Object.values(allPlayers) as PlayerState[]).filter(p => !p.isBot).length}
              </span>
              <span className="text-slate-500">/{maxServerCapacity}</span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 uppercase hidden sm:inline px-1 py-0.5 bg-slate-950 border border-slate-800 rounded">
              TAB
            </span>
          </button>

          {/* WebSocket Room Active Badge */}
          <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded text-right backdrop-blur-md shadow-lg hidden md:block">
            <div className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-end gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Server: {roomId}</span>
              <button
                onClick={handleCopyLink}
                title="Copy sector invite link"
                className="hover:text-sky-300 text-slate-500 p-0.5 transition-colors cursor-pointer ml-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            {spectatorCount > 0 && (
              <div className="text-[9px] font-mono text-sky-400 flex items-center justify-end gap-1">
                <Eye className="w-2.5 h-2.5" />
                <span>{spectatorCount} Spectating</span>
              </div>
            )}
          </div>

          {/* Armory Shop & Coins */}
          <button
            onClick={onOpenShop}
            className="bg-slate-900/80 hover:bg-slate-800 border border-amber-500/40 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md text-slate-200 transition-all cursor-pointer shadow-lg hover:border-amber-400 group"
            title="Open Armory Shop & Loadouts"
          >
            <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm">
              {playerCoins.toLocaleString()}
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase hidden sm:inline">SHOP</span>
          </button>

          {/* Latency / Ping */}
          <div className="bg-slate-900/80 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded flex flex-col items-end backdrop-blur-md shadow-lg">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
              Ping
            </div>
            <div
              className={`text-sm sm:text-base font-mono font-bold ${
                ping < 60 ? 'text-emerald-400' : ping < 150 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {ping}ms
            </div>
          </div>

          {/* Fullscreen / Landscape Lock Button */}
          <button
            onClick={() => requestLandscapeMode()}
            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 p-2 rounded backdrop-blur-md text-slate-400 hover:text-amber-400 transition-colors shadow-lg cursor-pointer"
            title="Lock / Switch to Landscape Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Audio Mute Button */}
          <button
            onClick={onToggleMute}
            className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 p-2 rounded backdrop-blur-md text-slate-400 hover:text-slate-100 transition-colors shadow-lg cursor-pointer"
            title={isMuted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Exit Match / Return to Command Terminal Button */}
          {onReturnToMenu && (
            <button
              onClick={onReturnToMenu}
              className="bg-slate-900/80 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/60 px-2.5 py-2 rounded text-slate-400 hover:text-rose-300 font-mono text-xs flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
              title="Exit Match & Return to Command Menu"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">EXIT</span>
            </button>
          )}
        </div>
      </header>

      {/* Sector 8 High Command Bounty Alert Screen Banner */}
      {bountyAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none max-w-lg w-full px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-amber-950/95 via-yellow-950/95 to-amber-950/95 border-2 border-amber-500 rounded-xl p-4 shadow-[0_0_40px_rgba(245,158,11,0.65)] backdrop-blur-md text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
              <span className="text-[11px] font-mono font-black tracking-widest uppercase text-amber-400">
                SECTOR 8 HIGH COMMAND BOUNTY BROADCAST
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono uppercase tracking-wide text-white drop-shadow-md">
              TARGET FLAGGED: {bountyAlert.targetName}
            </div>
            <div className="mt-1 flex items-center justify-center gap-3">
              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-black font-mono font-black text-xs">
                💰 PRIZE: {bountyAlert.rewardGold.toLocaleString()} GOLD
              </span>
              <span className="text-xs font-mono text-amber-200">
                {bountyAlert.reason || 'Eliminate target to claim bounty'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sector 8 Bounty Claimed Screen Banner */}
      {bountyClaimed && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none max-w-lg w-full px-4 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-emerald-950/95 via-teal-950/95 to-emerald-950/95 border-2 border-emerald-400 rounded-xl p-4 shadow-[0_0_40px_rgba(16,185,129,0.65)] backdrop-blur-md text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-[11px] font-mono font-black tracking-widest uppercase text-emerald-400">
                SECTOR 8 BOUNTY CLAIMED!
              </span>
              <Trophy className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div className="text-lg sm:text-xl font-black font-mono uppercase tracking-wide text-white">
              {bountyClaimed.killerName} ELIMINATED {bountyClaimed.victimName}
            </div>
            <div className="mt-1 text-xs font-mono text-emerald-200 font-bold">
              +{bountyClaimed.rewardGold.toLocaleString()} GOLD DEPOSITED TO KILLER'S MMO ACCOUNT
            </div>
          </div>
        </div>
      )}

      {/* Spectator Mode Floating Control Bar */}
      {isSpectator && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none max-w-xl w-full px-4">
          <div className="bg-[#0a0f1d]/95 border border-sky-500/60 rounded-xl px-4 py-2.5 shadow-[0_0_30px_rgba(56,189,248,0.35)] backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-mono uppercase tracking-widest text-sky-400 font-black">
                  {gameMode === 'tdm'
                    ? 'TEAM SPECTATOR // SQUAD OPERATIVES ONLY'
                    : isFreeCam
                    ? 'FREE CAM SPECTATOR // FLY CAM'
                    : 'TACTICAL OPERATIVE CAM'}
                </span>
                <span className="text-sm font-black text-white truncate">
                  {isFreeCam
                    ? 'Free Tactical Drone (WASD / Arrows to Pan)'
                    : spectatedPlayer
                    ? spectatedPlayer.name
                    : 'Targeting Squad Operative...'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {gameMode !== 'tdm' && onToggleFreeCam && (
                <button
                  onClick={onToggleFreeCam}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    isFreeCam
                      ? 'bg-sky-500 text-black border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Toggle Free Cam (Fly camera freely with WASD or arrow keys)"
                >
                  {isFreeCam ? 'FREE CAM [ON]' : 'FREE CAM'}
                </button>
              )}

              {!isFreeCam && (
                <>
                  <button
                    onClick={onPrevSpectate}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 rounded border border-slate-700 cursor-pointer transition-colors"
                    title={gameMode === 'tdm' ? 'Previous Teammate' : 'Previous Operative'}
                  >
                    ◄ Prev
                  </button>
                  <button
                    onClick={onNextSpectate}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 rounded border border-slate-700 cursor-pointer transition-colors"
                    title={gameMode === 'tdm' ? 'Next Teammate' : 'Next Operative'}
                  >
                    Next ►
                  </button>
                </>
              )}

              <button
                onClick={onOpenScoreboard}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-black text-white rounded border border-slate-700 cursor-pointer transition-colors flex items-center gap-1"
                title="Open Player Roster"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Fire Active Warning Banner & Battle Royale Safe Zone (Center) */}
      <div className="flex flex-col items-center gap-2 pointer-events-none px-4">
        {gameMode === 'br' && safeZone && (
          <div
            className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider shadow-lg flex items-center gap-2 ${
              safeZone.isShrinking
                ? 'bg-red-950/90 border border-red-500 text-red-300 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'bg-sky-950/80 border border-sky-400 text-sky-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {safeZone.isShrinking
                ? 'STORM CONTRACTING — RETREAT TO SAFE ZONE'
                : `SAFE ZONE ACTIVE • RADIUS ${Math.round(safeZone.radius / 20)}m`}
            </span>
          </div>
        )}

        {player?.isShooting && (
          <div className="bg-red-950/80 border border-red-500 text-red-300 px-4 py-1 rounded-full text-xs font-mono font-bold tracking-wider animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]">
            ● TARGET IN FIRE RANGE — AUTO-FIRING
          </div>
        )}
      </div>

      {/* Combat Activity Log (Aside / Left-Bottom) */}
      <aside className="absolute left-4 sm:left-6 bottom-32 sm:bottom-36 w-64 sm:w-72 flex flex-col gap-1.5 pointer-events-none z-30">
        {(Array.isArray(kills) ? kills : []).slice(0, 3).map((k, i) => (
          <div
            key={k.timestamp + i}
            className="bg-black/60 border-l-2 border-amber-500 px-3 py-1.5 text-xs font-mono italic text-amber-200/90 backdrop-blur-sm shadow-md"
          >
            <span className="font-bold">{k.killerName}</span> eliminated {k.victimName}
          </div>
        ))}
        {player?.isShooting && (
          <div className="bg-black/60 border-l-2 border-red-500 px-3 py-1 text-xs font-mono italic text-red-400 backdrop-blur-sm shadow-md">
            Weapon engaged: firing burst
          </div>
        )}
        <div className="bg-black/60 border-l-2 border-slate-700 px-3 py-1 text-[11px] font-mono italic text-slate-400 backdrop-blur-sm">
          Squad operatives online: {humanCount}
        </div>
      </aside>

      {/* Immersive UI Footer Combat Dashboard */}
      <footer className="relative z-20 p-4 sm:p-8 flex flex-col sm:flex-row justify-between items-end gap-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
        {/* Left: Armor & Health Vitals */}
        <div className="flex flex-col gap-3 w-full sm:w-80 md:w-96 pointer-events-auto">
          {/* Armor Status Bar */}
          {hero.maxArmor > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest px-1 text-slate-400">
                <span>Armor Plating</span>
                <span className="text-blue-400 font-mono">
                  {Math.round(armorPercent)}% ({Math.round(player?.armor || 0)})
                </span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-150"
                  style={{ width: `${armorPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Health Status Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest px-1 text-slate-400">
              <span>Health Status</span>
              <span
                className={`font-mono ${
                  hpPercent > 50 ? 'text-emerald-400' : hpPercent > 25 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {Math.round(player?.hp || 0)} / {hero.maxHp}
              </span>
            </div>
            <div className="h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-[2px]">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-150"
                style={{
                  width: `${hpPercent}%`,
                  backgroundImage:
                    hpPercent <= 25
                      ? 'linear-gradient(to right, #dc2626, #ef4444)'
                      : hpPercent <= 50
                      ? 'linear-gradient(to right, #d97706, #f59e0b)'
                      : undefined,
                }}
              />
            </div>
          </div>
        </div>

        {/* Center/Right: Weapon Magazine & Action Abilities */}
        <div className="flex items-end gap-3 sm:gap-4 pointer-events-auto">
          {/* Ammo Counter Card */}
          <div className="flex flex-col items-center bg-slate-900/80 border border-slate-700 p-3 sm:p-4 rounded-xl backdrop-blur-lg shadow-xl min-w-[120px]">
            <div className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white font-mono">
              {player?.isReloading ? '--' : player?.ammo || 0}{' '}
              <span className="text-base sm:text-lg text-slate-500 not-italic">
                / {hero.maxAmmo}
              </span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mt-1 truncate max-w-[140px]">
              {player?.isReloading ? 'Reloading...' : hero.weaponName}
            </div>
          </div>

          {/* Action Buttons: Reload (R), Turret (T), and Ability (Space / E) */}
          <div className="flex gap-2 items-end">
            {/* Deploy Sentry Turret Button (T) */}
            <button
              onClick={onDeployTurret}
              disabled={turretInventory <= 0 || !player?.isAlive}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded flex flex-col items-center justify-center relative transition-all cursor-pointer overflow-hidden active:scale-95 border ${
                turretInventory > 0 && player?.isAlive
                  ? 'bg-emerald-950/80 border-emerald-500 hover:bg-emerald-900 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
              }`}
              title="Deploy Machine Gun Sentry Turret (Key: T)"
            >
              <div className="absolute top-1 left-1.5 text-[8px] font-mono text-emerald-400 font-bold">
                T
              </div>
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-[9px] font-mono font-bold text-emerald-300 leading-none mt-0.5">
                {turretInventory}
              </span>
            </button>

            {/* Reload Button */}
            <button
              onClick={onReload}
              disabled={player?.isReloading || (player && player.ammo >= hero.maxAmmo)}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 border border-slate-600 rounded flex items-center justify-center text-xl shadow-inner relative hover:bg-slate-700 disabled:opacity-40 transition-all cursor-pointer active:scale-95"
              title="Reload Weapon (R)"
            >
              <div className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400">R</div>
              <RotateCw
                className={`w-5 h-5 text-slate-200 ${player?.isReloading ? 'animate-spin text-amber-400' : ''}`}
              />
            </button>

            {/* Special Ability Button */}
            <button
              onClick={onUseAbility}
              disabled={!abilityReady || !player?.isAlive}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded flex items-center justify-center text-xl relative transition-all cursor-pointer overflow-hidden active:scale-95 ${
                abilityReady && player?.isAlive
                  ? 'bg-amber-500 border border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:bg-amber-400'
                  : 'bg-slate-800 border border-slate-700 opacity-60 cursor-not-allowed'
              }`}
              title={`${hero.abilityName} (SPACE)`}
            >
              <div className="absolute top-1 left-1.5 text-[8px] font-mono text-black font-bold">
                SPACE
              </div>
              {!abilityReady && (
                <div
                  className="absolute inset-0 bg-black/75 flex items-center justify-center"
                  style={{
                    clipPath: `inset(0 0 ${100 - abilityCooldownProgress}% 0)`,
                  }}
                />
              )}
              {renderAbilityIcon()}
            </button>
          </div>
        </div>

        {/* Circular Tactical Radar (Right Side) */}
        <div className="hidden md:flex w-36 h-36 sm:w-40 sm:h-40 bg-slate-900/80 border border-slate-700 rounded-full backdrop-blur-md relative overflow-hidden items-center justify-center shadow-2xl pointer-events-auto">
          <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#1e293b_100%)] opacity-30 pointer-events-none" />
          <div className="w-full h-[1px] bg-emerald-500/30 absolute pointer-events-none" />
          <div className="h-full w-[1px] bg-emerald-500/30 absolute pointer-events-none" />
          <div className="w-2.5 h-2.5 bg-blue-400 rounded-full absolute shadow-[0_0_10px_rgba(96,165,250,0.8)]" />

          {/* Render nearby enemy blips on radar */}
          {player &&
            activePlayersList
              .filter((other) => other.id !== player.id && other.isAlive)
              .slice(0, 4)
              .map((other) => {
                const dx = (other.x - player.x) / 18; // scale down map coords
                const dy = (other.y - player.y) / 18;
                const dist = Math.hypot(dx, dy);
                if (dist > 65) return null; // inside circular radar radius
                return (
                  <div
                    key={other.id}
                    className="w-2 h-2 bg-red-500 rounded-full absolute animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    style={{
                      transform: `translate(${dx}px, ${dy}px)`,
                    }}
                  />
                );
              })}

          <div className="text-[8px] absolute bottom-3 uppercase tracking-tighter text-slate-500 font-bold font-mono pointer-events-none">
            Sector 7 - Grid 4
          </div>
        </div>
      </footer>

      {/* Respawn Overlay */}
      {player && !player.isAlive && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-40">
          <div className="bg-slate-900/90 border border-red-500/50 p-6 rounded-xl shadow-2xl text-center max-w-sm w-full mx-4">
            <div className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-1">
              Combat Alert
            </div>
            <h2 className="text-2xl font-black italic tracking-tight text-white mb-2">
              OPERATOR NEUTRALIZED
            </h2>
            <p className="text-slate-400 text-xs mb-3">Re-deploying into combat sector...</p>
            <div className="text-4xl font-mono font-bold text-amber-500 mb-3 animate-pulse">
              {Math.max(1, Math.ceil((player.respawnAt - now) / 1000))}s
            </div>

            {/* Quick Operative Switch on Respawn */}
            <div className="border-t border-slate-800/80 pt-3 mb-3">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2">
                Deploy Next As:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'sniper' as HeroId, name: 'GHOST', role: 'Sniper', color: '#10b981' },
                  { id: 'shotgun' as HeroId, name: 'BREACH', role: 'Shotgun', color: '#ef4444' },
                  { id: 'assault' as HeroId, name: 'VANGUARD', role: 'Assault', color: '#38bdf8' },
                  { id: 'marksman' as HeroId, name: 'DEADEYE', role: 'Marksman', color: '#f59e0b' },
                ].map((op) => {
                  const isSelected = hero.id === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => onSelectHero?.(op.id)}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 text-white ring-1 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                      style={{
                        borderColor: isSelected ? op.color : undefined,
                        boxShadow: isSelected ? `0 0 10px ${op.color}40` : undefined,
                      }}
                    >
                      <span style={{ color: isSelected ? op.color : undefined }}>{op.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {onOpenScoreboard && (
              <button
                onClick={onOpenScoreboard}
                className="w-full py-1.5 px-3 mb-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>View Online Roster / Scoreboard [TAB]</span>
              </button>
            )}
            <p className="text-[11px] text-slate-500 font-mono">
              Tip: Sound echoes reveal enemy movements through walls.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

