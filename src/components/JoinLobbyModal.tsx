import React, { useState } from 'react';
import { HeroId, GameMode, TeamId, WeaponId, EffectId } from '../types/game';
import { HERO_DEFINITIONS } from '../game/constants';
import { CUSTOM_WEAPONS, SPECIAL_EFFECTS } from '../game/loadoutData';
import { resolveSectorMmoInfo } from '../game/sectorData';
import { requestLandscapeMode } from '../utils/orientation';
import {
  Shield,
  Zap,
  Ghost,
  ShieldAlert,
  Heart,
  Gauge,
  Crosshair,
  Terminal,
  Globe,
  ArrowRight,
  Swords,
  Users,
  Bot,
  UserCheck,
  ShoppingBag,
  Coins,
  Sparkles,
  Flame,
  Eye,
  Bomb,
  Settings,
  Database,
} from 'lucide-react';

interface JoinLobbyModalProps {
  initialName: string;
  initialRoomId: string;
  initialHeroId: HeroId;
  equippedWeaponId: WeaponId;
  equippedEffectId: EffectId;
  playerCoins: number;
  turretCount: number;
  teleportCharges?: number;
  bountyTimeoutSeconds?: number;
  onRechargeTeleport?: () => void;
  onOpenShop: () => void;
  onOpenSettings?: () => void;
  onJoin: (
    name: string,
    roomId: string,
    heroId: HeroId,
    gameMode: GameMode,
    team?: TeamId,
    enableBots?: boolean,
    isSpectator?: boolean,
    homeSector?: number,
    isTeleport?: boolean
  ) => void;
}

export const JoinLobbyModal: React.FC<JoinLobbyModalProps> = ({
  initialName,
  initialRoomId,
  initialHeroId,
  equippedWeaponId,
  equippedEffectId,
  playerCoins,
  turretCount,
  teleportCharges = 5,
  bountyTimeoutSeconds = 0,
  onRechargeTeleport,
  onOpenShop,
  onOpenSettings,
  onJoin,
}) => {
  const [name] = useState(initialName || `Agent-${Math.floor(Math.random() * 900 + 100)}`);
  const [roomId, setRoomId] = useState(initialRoomId || 'sector-8');
  const [gameMode, setGameMode] = useState<GameMode>('tdm');
  const [selectedTeam, setSelectedTeam] = useState<TeamId | 'auto'>('auto');
  const [homeSector, setHomeSector] = useState<number>(8);
  const [isForeignSector, setIsForeignSector] = useState<boolean>(false);
  const isTraining = gameMode === 'training';
  const [heroId, setHeroId] = useState<HeroId>(() => {
    if (initialHeroId === 'bastion') return 'marksman';
    if (initialHeroId === 'mirage' || initialHeroId === 'valkyrie') return 'sniper';
    if (initialHeroId === 'titan' || initialHeroId === 'stalker') return 'assault';
    if (['sniper', 'shotgun', 'assault', 'marksman'].includes(initialHeroId)) return initialHeroId;
    return 'assault';
  });

  const equippedWeapon = CUSTOM_WEAPONS[equippedWeaponId] || CUSTOM_WEAPONS.standard;
  const equippedEffect = SPECIAL_EFFECTS[equippedEffectId] || SPECIAL_EFFECTS.neon_cyan;

  // The 4 balanced fixed classes
  const playableHeroes = [
    HERO_DEFINITIONS.sniper,
    HERO_DEFINITIONS.shotgun,
    HERO_DEFINITIONS.assault,
    HERO_DEFINITIONS.marksman,
  ];

  const selectedHero = HERO_DEFINITIONS[heroId] || HERO_DEFINITIONS.assault;

  const handleJoinGame = (isSpectator: boolean = false) => {
    if (!name.trim()) return;
    if (bountyTimeoutSeconds > 0 && !isSpectator) return;
    requestLandscapeMode().catch(() => {});
    const teamParam = selectedTeam === 'auto' ? undefined : selectedTeam;
    const targetRoom = roomId.trim().toLowerCase() || 'sector-8';
    const isSector8 = targetRoom === 'sector-8' || targetRoom.includes('sector-8');
    const actualHomeSector = isForeignSector ? (homeSector === 8 ? 3 : homeSector) : 8;

    onJoin(
      name.trim(),
      targetRoom,
      heroId,
      gameMode,
      teamParam,
      isTraining,
      isSpectator,
      actualHomeSector,
      isSector8 && !isSpectator
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinGame(false);
  };

  const getAbilityIcon = (id: HeroId) => {
    switch (id) {
      case 'sniper':
        return <Zap className="w-4 h-4" />;
      case 'shotgun':
        return <Bomb className="w-4 h-4" />;
      case 'assault':
        return <Ghost className="w-4 h-4" />;
      case 'marksman':
        return <ShieldAlert className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050506]/92 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      style={{
        backgroundImage: 'radial-gradient(#1e1e38 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl animate-scale-in font-sans backdrop-blur-xl relative my-auto">
        {/* Ambient Top Glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent to-transparent opacity-90"
          style={{ backgroundImage: `linear-gradient(to right, transparent, ${selectedHero.color}, transparent)` }}
        />

        {/* Title Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-slate-800/90 border border-slate-700 text-slate-300 text-[10px] uppercase tracking-widest px-3 py-1 rounded font-bold mb-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span>Localhost & Network Multiplayer Online</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-white flex items-center justify-center gap-2">
            <span>OMEGA</span>
            <span className="text-amber-500 not-italic">KILLZONE</span>
            <span className="text-red-500 font-mono not-italic">ZERO</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Choose your combat operative below. Auto-fire engages as soon as enemies enter your tactical vision cone!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Hero Selection (1 of 4 balanced characters) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] uppercase tracking-widest text-slate-300 font-bold flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Select 1 of 4 Fixed Operatives</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">Click to preview & equip</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {playableHeroes.map((h) => {
                const isSelected = h.id === heroId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHeroId(h.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/95 border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.02]'
                        : 'bg-[#08080c]/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Hero Accent Strip */}
                    <div
                      className="w-full h-1.5 rounded-full mb-2"
                      style={{ backgroundColor: h.color }}
                    />

                    <div>
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
                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-2.5">{h.title}</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-1 text-[11px] font-mono border-t border-slate-800/80 pt-2 text-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-emerald-400" /> HP:
                        </span>
                        <span className="font-bold text-emerald-400">{h.maxHp}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Crosshair className="w-3 h-3 text-amber-400" /> Range:
                        </span>
                        <span className="font-bold text-amber-400">{h.fireRange}px</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-sky-400" /> Speed:
                        </span>
                        <span className="font-bold text-sky-400">{h.speed}</span>
                      </div>
                    </div>

                    {/* Selection Checkmark Indicator */}
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-black font-black text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Hero Tactical Dossier Banner */}
          <div className="bg-[#060609]/95 border border-slate-800 rounded-xl p-4 text-xs font-mono">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-bold text-sm tracking-wide text-white uppercase"
                    style={{ color: selectedHero.color }}
                  >
                    {selectedHero.name} — {selectedHero.title}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans">({selectedHero.description})</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Weapon: <span className="text-white font-semibold">{selectedHero.weaponName}</span>{' '}
                  <span className="text-amber-400 font-semibold">({selectedHero.fireRange}px range, {selectedHero.bulletDamage} dmg)</span>
                </div>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-0.5">Special Ability</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                  {getAbilityIcon(selectedHero.id)}
                  <span>{selectedHero.abilityName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Player Configuration (Callsign & Sector) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Operative Callsign (Changed in Settings) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Operative Callsign
                </label>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    <span>CHANGE IN SETTINGS</span>
                  </button>
                )}
              </div>
              <div className="w-full bg-[#060609] border border-slate-700/90 rounded-lg px-3.5 py-2.5 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-mono text-sm font-bold tracking-wide">{name}</span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  SETTINGS SYNCED
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                Operative identity is saved & managed under Terminal Settings.
              </span>
            </div>

            {/* Combat Sector / Server Assignment */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Sector Destination / Warzone ID
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span>Charges: {teleportCharges}/10</span>
                  </span>
                  {onRechargeTeleport && (
                    <button
                      type="button"
                      onClick={onRechargeTeleport}
                      className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono hover:bg-amber-500 hover:text-black transition-colors cursor-pointer"
                    >
                      + Recharge
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  maxLength={24}
                  placeholder="sector-8"
                  className="w-full bg-[#060609] border border-slate-700 focus:border-amber-400 rounded-lg px-3.5 py-2.5 text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner"
                />
                <Globe className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
              </div>

              {/* Strict Sector 8 Preset */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[9px] font-mono text-amber-400 uppercase font-bold">ACTIVE SECTOR:</span>
                <button
                  type="button"
                  onClick={() => {
                    setRoomId('sector-8');
                    setGameMode('tdm');
                  }}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    roomId === 'sector-8' || !roomId
                      ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Sector 8 (Unfriendly Scores Crucible)</span>
                </button>
              </div>

              {/* Commander Origin / Home Sector Choice */}
              <div className="mt-2.5 pt-2.5 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Commander Origin:</span>
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {isForeignSector ? `Foreign Operative (Sector ${homeSector})` : 'Resident of Sector 8'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForeignSector(false);
                      setHomeSector(8);
                    }}
                    className={`p-2 rounded border text-left text-xs font-mono transition-all cursor-pointer ${
                      !isForeignSector
                        ? 'bg-sky-950/80 border-sky-400 text-sky-200 ring-1 ring-sky-400/40'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>Resident of Sector 8</span>
                      {!isForeignSector && <span className="text-sky-400">●</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Native garrison operative</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForeignSector(true);
                      setHomeSector(3);
                    }}
                    className={`p-2 rounded border text-left text-xs font-mono transition-all cursor-pointer ${
                      isForeignSector
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-1 ring-rose-400/40'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>Foreign Sector Intruder</span>
                      {isForeignSector && <span className="text-rose-400">●</span>}
                    </div>
                    <div className="text-[10px] text-rose-300/80 mt-0.5">Lights up entire dashboard!</div>
                  </button>
                </div>
              </div>

              {/* Dynamic Sector MMO Context Intel */}
              {(() => {
                const sectorInfo = resolveSectorMmoInfo(roomId);
                if (!sectorInfo) return null;
                return (
                  <div className="mt-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs font-mono shadow-md">
                    <div className="flex items-center justify-between text-amber-300 font-bold text-[10px] mb-1">
                      <span className="flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-amber-400 animate-pulse" />
                        <span className="uppercase">{sectorInfo.sectorName}</span>
                      </span>
                      <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[8px] font-bold">
                        PERSISTENT MMO SYNC
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-tight">
                      {sectorInfo.mmoContext}
                    </p>
                    <div className="text-[9px] text-slate-400 mt-1.5 flex items-center justify-between border-t border-slate-800/80 pt-1">
                      <span>Status: <span className="text-amber-400 font-semibold">{sectorInfo.baseStatus}</span></span>
                      <span>Node: <span className="text-sky-300 font-semibold">{sectorInfo.resourceNode}</span></span>
                    </div>
                  </div>
                );
              })()}

              <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                Auto-joins the active 10-player server for your mode or connects directly to the specified MMO base sector shard.
              </span>
            </div>
          </div>

          {/* Weapon Loadout & Tactical Armory Section */}
          <div className="bg-[#080d1e]/95 border border-amber-500/40 rounded-xl p-4 shadow-inner relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Operative Loadout & Arsenal
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  Pre-Combat Equipment
                </h3>
              </div>

              {/* Coins & Open Shop Button */}
              <div className="flex items-center gap-2.5">
                <div className="bg-black/60 border border-amber-500/40 px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-mono">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold text-amber-300">{playerCoins.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-500">COINS</span>
                </div>

                <button
                  type="button"
                  onClick={onOpenShop}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ARMORY / SHOP</span>
                </button>
              </div>
            </div>

            {/* Loadout summary grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              {/* Primary Weapon Card */}
              <div className="bg-slate-900/80 border border-slate-700/80 p-2.5 rounded-lg">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold mb-1">
                  Primary Weapon
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-black text-white truncate">{equippedWeapon.name}</span>
                  <span
                    className="text-[9px] font-bold px-1 rounded uppercase"
                    style={{ color: equippedWeapon.color }}
                  >
                    {equippedWeapon.category}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>Dmg: <strong className="text-white">{equippedWeapon.damage * equippedWeapon.pellets}</strong></span>
                  <span>RPM: <strong className="text-amber-400">{equippedWeapon.fireRate}/s</strong></span>
                  <span>Cap: <strong className="text-emerald-400">{equippedWeapon.maxAmmo}</strong></span>
                </div>
              </div>

              {/* Bullet Tracer Effect */}
              <div className="bg-slate-900/80 border border-slate-700/80 p-2.5 rounded-lg">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold mb-1">
                  Bullet Tracer FX
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: equippedEffect.color, boxShadow: `0 0 8px ${equippedEffect.color}` }}
                  />
                  <span className="font-black text-white">{equippedEffect.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block truncate">
                  {equippedEffect.description}
                </span>
              </div>

              {/* Deployable Sentry Turrets */}
              <div className="bg-slate-900/80 border border-slate-700/80 p-2.5 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold mb-1">
                    Deployable Turrets
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-400">{turretCount} / 5 Ready</span>
                    <span className="text-[9px] text-slate-400 font-mono bg-slate-800 px-1 py-0.5 rounded">
                      [T] Key
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-slate-500 mt-1">
                  Placeable machine gun sentry turret
                </span>
              </div>
            </div>
          </div>

          {/* Game Mode & AI Bot Settings */}
          <div className="bg-[#080c18]/90 border border-slate-800 rounded-xl p-4 space-y-3.5">
            {/* Mode Selection */}
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Combat Game Mode</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGameMode('ffa')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    gameMode === 'ffa'
                      ? 'bg-amber-500/15 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs uppercase flex items-center justify-between">
                    <span>Free For All</span>
                    {gameMode === 'ffa' && <span className="text-[10px]">●</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Solo deathmatch with respawns</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('tdm')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    gameMode === 'tdm'
                      ? 'bg-sky-500/15 border-sky-400 text-sky-300 ring-1 ring-sky-400/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs uppercase flex items-center justify-between">
                    <span>Team Deathmatch</span>
                    {gameMode === 'tdm' && <span className="text-[10px]">●</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Squad Alpha vs Bravo (100 pts)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('br')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    gameMode === 'br'
                      ? 'bg-rose-500/15 border-rose-400 text-rose-300 ring-1 ring-rose-400/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs uppercase flex items-center justify-between">
                    <span>Battle Royale</span>
                    {gameMode === 'br' && <span className="text-[10px]">●</span>}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Shrinking zone • 1 life</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('training')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    gameMode === 'training'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <span className="font-bold text-xs uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Training Mode</span>
                    </span>
                    {gameMode === 'training' && <span className="text-[10px] text-emerald-400">●</span>}
                  </span>
                  <span className="text-[10px] text-emerald-400/80 mt-1">Combat bots & target practice</span>
                </button>
              </div>
            </div>

            {/* Team Selection if TDM */}
            {gameMode === 'tdm' && (
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>Choose Your Squad</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('auto')}
                    className={`py-1.5 px-2 rounded border text-[11px] font-mono font-bold cursor-pointer transition-all ${
                      selectedTeam === 'auto'
                        ? 'bg-slate-800 border-white/40 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    Auto-Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('alpha')}
                    className={`py-1.5 px-2 rounded border text-[11px] font-mono font-bold cursor-pointer transition-all ${
                      selectedTeam === 'alpha'
                        ? 'bg-sky-950 border-sky-400 text-sky-300 ring-1 ring-sky-400/40'
                        : 'bg-slate-900/50 border-slate-800 text-sky-500 hover:text-sky-400'
                    }`}
                  >
                    Squad Alpha (Blue)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTeam('bravo')}
                    className={`py-1.5 px-2 rounded border text-[11px] font-mono font-bold cursor-pointer transition-all ${
                      selectedTeam === 'bravo'
                        ? 'bg-rose-950 border-rose-400 text-rose-300 ring-1 ring-rose-400/40'
                        : 'bg-slate-900/50 border-slate-800 text-rose-500 hover:text-rose-400'
                    }`}
                  >
                    Squad Bravo (Red)
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 font-mono mt-1.5 block">
                  🛡️ Real players are strictly auto-balanced between Alpha & Bravo to prevent unbalanced human teams.
                </span>
              </div>
            )}

            {/* Strict Bot Policy Notice (Bots ONLY in Training Mode) */}
            <div className="pt-2.5 border-t border-slate-800/80">
              {isTraining ? (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300">
                  <div className="p-2 rounded bg-emerald-900/60 text-emerald-400 shrink-0">
                    <Bot className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>TRAINING COMBAT SIMULATION</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px] font-mono">BOTS ACTIVE</span>
                    </div>
                    <div className="text-[11px] text-emerald-400/90 mt-0.5">
                      Combat bots are automatically deployed to train vision cones, sentry turrets, and killstreaks.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/30 text-slate-300">
                  <div className="p-2 rounded bg-emerald-950/60 text-emerald-400 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2 text-white">
                      <span>AUTO-MATCHMAKING • COMBATANTS READY</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[9px] font-mono text-emerald-400 font-bold">READY TO PLAY</span>
                    </div>
                    <div className="text-[11px] text-emerald-400/90 mt-0.5">
                      Combatants will populate the match so you can play immediately. As soon as live players connect, the arena transitions to pure live PvP!
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lockout Warning Banner if player has active bounty defeat timeout */}
          {bountyTimeoutSeconds > 0 && (
            <div className="p-3 bg-rose-950/90 border border-rose-500 rounded-xl text-center font-mono shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse">
              <div className="text-rose-400 font-bold text-xs flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>SECTOR 8 WARZONE LOCKOUT ACTIVE</span>
              </div>
              <p className="text-white text-xs mt-1">
                You were eliminated as a high-value bounty target. Clearance suspended for{' '}
                <span className="text-amber-400 font-black text-sm">{bountyTimeoutSeconds}s</span>.
              </p>
              <div className="text-[10px] text-rose-300/80 mt-0.5">
                Redeployment to Sector 8 crucible is currently prohibited.
              </div>
            </div>
          )}

          {/* Action Buttons: Teleport / Deploy Combatant vs Spectate Match */}
          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <button
              type="submit"
              disabled={bountyTimeoutSeconds > 0}
              className={`flex-1 py-3.5 border text-black font-black tracking-wider text-sm rounded-xl transition-all transform active:scale-98 flex items-center justify-center gap-2 ${
                bountyTimeoutSeconds > 0
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                  : 'bg-amber-500 hover:bg-amber-400 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-pointer'
              }`}
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>
                TELEPORT TO SECTOR 8 (-1 CHARGE) • {selectedHero.name.toUpperCase()}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleJoinGame(true)}
              className="py-3.5 px-5 bg-slate-900 hover:bg-slate-800 border border-sky-500/50 hover:border-sky-400 text-sky-400 font-bold tracking-wide text-xs rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.2)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span>SPECTATE MATCH</span>
            </button>
          </div>
        </form>

        {/* Localhost Multi-Tab Instructions */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center text-slate-400 text-xs font-mono gap-2">
          <div>
            <span className="text-amber-400 font-bold">Localhost Tip:</span> Open a second browser tab to play as a different character in real time!
          </div>
          <div className="text-slate-500 text-[11px]">
            Controls: WASD Move • Mouse Aim • Auto-Fire • Space Ability • R Reload • H Change Hero
          </div>
        </div>
      </div>
    </div>
  );
};
