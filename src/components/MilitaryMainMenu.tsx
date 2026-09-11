import React, { useState, useEffect } from 'react';
import { HeroId, GameMode, LeaderboardData, LeaderboardTab, ServerRoomInfo } from '../types/game';
import { HERO_DEFINITIONS, FIXED_CHARACTERS } from '../game/constants';
import {
  Shield,
  Crosshair,
  Zap,
  Flame,
  Trophy,
  Server,
  Settings,
  Users,
  Eye,
  Play,
  Volume2,
  VolumeX,
  Edit2,
  Check,
  Award,
  Sparkles,
  ShoppingBag,
  Target,
  RefreshCw,
  Maximize2,
  Key,
  Copy,
  FileText,
  CheckCircle2,
  X,
  Database,
  Globe,
} from 'lucide-react';
import { sounds } from '../game/audio';
import { requestLandscapeMode } from '../utils/orientation';
import { CharacterAvatar } from './CharacterAvatar';

interface MilitaryMainMenuProps {
  playerName: string;
  onUpdatePlayerName: (newName: string) => void;
  selectedHeroId: HeroId;
  onSelectHero: (heroId: HeroId) => void;
  onJoinRoom: (roomId: string, mode: GameMode, asSpectator?: boolean) => void;
  onOpenLeaderboard?: (tab?: LeaderboardTab) => void;
  onOpenShop: () => void;
  onOpenLastWeekWinners: () => void;
  onOpenCustomLobby?: () => void;
  leaderboardData: LeaderboardData;
  playerCoins: number;
}

export const MilitaryMainMenu: React.FC<MilitaryMainMenuProps> = ({
  playerName,
  onUpdatePlayerName,
  selectedHeroId,
  onSelectHero,
  onJoinRoom,
  onOpenLeaderboard,
  onOpenShop,
  onOpenLastWeekWinners,
  onOpenCustomLobby,
  leaderboardData,
  playerCoins,
}) => {
  // Navigation tabs in main menu: 'home' | 'servers' | 'characters' | 'leaderboards' | 'settings'
  const [activeView, setActiveView] = useState<'home' | 'servers' | 'characters' | 'leaderboards' | 'settings'>('home');
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('thisWeek');
  const [rooms, setRooms] = useState<ServerRoomInfo[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
  const [editingName, setEditingName] = useState<string>(playerName);
  const [nameSavedNotice, setNameSavedNotice] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [sqlSchema, setSqlSchema] = useState<string>('');
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  // Fetch live database connection and key info
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch {
      // Ignore
    }
  };

  const fetchSqlSchema = async () => {
    try {
      const res = await fetch('/api/database/schema');
      if (res.ok) {
        const text = await res.text();
        setSqlSchema(text);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  // Fetch available rooms from /api/rooms
  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        const rawRooms = Array.isArray(data)
          ? data
          : Array.isArray(data?.rooms)
          ? data.rooms
          : [];

        const formattedRooms: ServerRoomInfo[] = rawRooms.map((r: any) => ({
          id: r.id || 'room',
          name: r.name || r.id || 'Sector Room',
          region: r.region || 'US-EAST',
          mode: (r.mode || r.gameMode || 'ffa') as GameMode,
          playerCount: typeof r.playerCount === 'number' ? r.playerCount : 0,
          maxPlayers: typeof r.maxPlayers === 'number' ? r.maxPlayers : (r.maxCapacity || 8),
          status: (r.status === 'in_progress' || r.status === 'ACTIVE COMBAT' || r.playerCount > 0) ? 'in_progress' : 'waiting',
        }));
        setRooms(formattedRooms);
      }
    } catch (e) {
      console.warn('Failed to fetch rooms:', e);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editingName.trim().slice(0, 16);
    if (trimmed) {
      onUpdatePlayerName(trimmed);
      try {
        localStorage.setItem('be_player_name', trimmed);
        sessionStorage.setItem('be_player_name', trimmed);
        fetch('/api/player/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callsign: trimmed, tokens: playerCoins }),
        }).catch(() => {});
      } catch (err) {
        // ignore storage errors
      }
      setNameSavedNotice(true);
      setTimeout(() => setNameSavedNotice(false), 2500);
    }
  };

  const currentHero = HERO_DEFINITIONS[selectedHeroId] || HERO_DEFINITIONS.assault;

  return (
    <div className="relative w-full h-full min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-between select-none overflow-x-hidden font-mono">
      {/* Tactical Background Grid & Military Radar Scanlines */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.8),#050811_85%)] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      {/* Top Military Command Navigation Bar */}
      <header className="relative z-20 px-4 sm:px-8 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-amber-500/10 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Crosshair className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-mono">
                KILLZONE ZERO
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-black rounded font-mono">
                DEFCON 1
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              TACTICAL COMBAT NETWORK // SECURE TERMINAL
            </div>
          </div>
        </div>

        {/* Center: Navigation Buttons */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveView('home')}
            className={`px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              activeView === 'home'
                ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            COMMAND CENTER
          </button>
          <button
            onClick={() => {
              setActiveView('servers');
              fetchRooms();
            }}
            className={`px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'servers'
                ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>SERVERS</span>
          </button>
          <button
            onClick={() => setActiveView('characters')}
            className={`px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'characters'
                ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>OPERATORS</span>
          </button>
          <button
            onClick={() => setActiveView('leaderboards')}
            className={`px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'leaderboards'
                ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${activeView === 'leaderboards' ? 'text-black' : 'text-amber-400'}`} />
            <span>LEADERBOARDS</span>
          </button>
          <button
            onClick={onOpenShop}
            className="px-3 sm:px-4 py-1.5 rounded text-xs font-mono font-bold uppercase text-emerald-400 hover:text-emerald-300 hover:bg-slate-900 border border-transparent transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span>ITEM SHOP</span>
          </button>
        </nav>

        {/* Right: Player Callsign & Settings */}
        <div className="flex items-center gap-3">
          {/* Fullscreen / Landscape Lock Button */}
          <button
            onClick={() => requestLandscapeMode()}
            className="p-2 rounded border bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-all cursor-pointer shadow-lg"
            title="Lock / Switch to Landscape Mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenLastWeekWinners}
            className="px-2.5 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="View Last Week's Tournament Champions"
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden md:inline">LAST WEEK'S CHAMPIONS</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`p-2 rounded border transition-all cursor-pointer ${
              activeView === 'settings'
                ? 'bg-slate-800 border-amber-500 text-amber-400'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Settings & Callsign"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: currentHero.color }}
            />
            <span className="text-xs font-bold text-white uppercase">{playerName}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {/* VIEW 1: COMMAND CENTER (HOME SCREEN) */}
        {activeView === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Mission Launch & Military Vibe */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  COMBAT SQUADRONS ACTIVE // PROTOCOL 0
                </div>
                <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight uppercase text-white font-mono leading-none">
                  TACTICAL <span className="text-amber-500">ENGAGEMENT</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-xl font-mono leading-relaxed">
                  Fast-paced 2D top-down military combat. Fixed tactical operator classes, frag grenades, deployable automated turrets, sidearm pistol fallback, and server-wide leaderboards.
                </p>
              </div>

              {/* Action Buttons: PLAY GAME -> Opens Server Browser */}
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    setActiveView('servers');
                    fetchRooms();
                  }}
                  className="px-8 py-4 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black uppercase text-base tracking-wider font-mono transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center gap-3 cursor-pointer group"
                >
                  <Play className="w-5 h-5 fill-black group-hover:scale-110 transition-transform" />
                  <span>PLAY GAME // BROWSE SERVERS</span>
                </button>

                <button
                  onClick={() => setActiveView('leaderboards')}
                  className="px-5 py-4 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/50 font-bold uppercase text-xs font-mono transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>VIEW LEADERBOARDS</span>
                </button>

                {onOpenCustomLobby && (
                  <button
                    onClick={onOpenCustomLobby}
                    className="px-4 py-4 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-sky-500/40 hover:border-sky-400 font-bold uppercase text-xs font-mono transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    title="Open tactical deployment briefing modal"
                  >
                    <Crosshair className="w-4 h-4 text-sky-400" />
                    <span>CUSTOM DEPLOY</span>
                  </button>
                )}
              </div>

              {/* Quick Server Live Snapshot */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 font-mono">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="flex items-center gap-2 font-bold uppercase text-slate-300">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    LIVE SERVERS ONLINE
                  </span>
                  <span className="text-emerald-400">{(Array.isArray(rooms) ? rooms : []).length} ACTIVE BATTLEFIELDS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Array.isArray(rooms) ? rooms : []).slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onJoinRoom(r.id, r.mode)}
                      className="bg-slate-900/80 hover:bg-slate-800 p-2 rounded border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all text-[11px]"
                    >
                      <div className="font-bold text-white truncate">{r.name}</div>
                      <div className="text-slate-400 flex items-center justify-between mt-1">
                        <span className="text-[10px] uppercase text-amber-400">{r.mode.toUpperCase()}</span>
                        <span className="text-emerald-400">{r.playerCount}/{r.maxPlayers}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Leaderboards Intel Snapshot: Top 10 Aces */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 font-mono">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                  <span className="flex items-center gap-2 font-bold uppercase text-slate-300">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    WEEKLY TOURNAMENT LEADERS (TOP 10 ACES)
                  </span>
                  <button
                    onClick={() => setActiveView('leaderboards')}
                    className="text-amber-400 hover:underline text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <span>VIEW FULL STANDINGS</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Podium Top 3 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(leaderboardData.thisWeek || []).slice(0, 3).map((entry, idx) => (
                      <div
                        key={entry.id}
                        onClick={() => setActiveView('leaderboards')}
                        className="bg-slate-900/80 hover:bg-slate-800 p-2.5 rounded border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className={`font-bold ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-amber-600'}`}>
                            #{idx + 1} {idx === 0 ? '★ ACE' : ''}
                          </span>
                          <span className="text-amber-400 font-bold">{entry.score.toLocaleString()} PTS</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <CharacterAvatar heroId={entry.heroId} size="xs" callsign={entry.name} />
                          <div className="font-bold text-white truncate">{entry.name}</div>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                          <span>{entry.kills} KILLS</span>
                          <span>{entry.kd} K/D</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ranks 4 to 10 Honor Roll */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {(leaderboardData.thisWeek || []).slice(3, 10).map((entry, idx) => {
                      return (
                        <div
                          key={entry.id}
                          onClick={() => setActiveView('leaderboards')}
                          className="bg-slate-900/50 hover:bg-slate-850 px-2.5 py-1 rounded border border-slate-800/80 flex items-center justify-between text-[11px] cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-slate-500 font-bold w-4">#{idx + 4}</span>
                            <CharacterAvatar heroId={entry.heroId} size="xs" callsign={entry.name} />
                            <span className="font-bold text-white uppercase truncate">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                            <span>{entry.kills} K</span>
                            <span className="text-sky-400 font-bold">{entry.score.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Selected Character Operative Showcase */}
            <div className="lg:col-span-5 bg-gradient-to-b from-slate-900/80 to-slate-950/90 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500/10 border-b border-l border-amber-500/30 px-3 py-1 text-[10px] font-bold text-amber-400 uppercase font-mono">
                ACTIVE OPERATOR SPEC
              </div>

              <div className="flex items-center gap-4 mb-4">
                <CharacterAvatar heroId={currentHero.id} size="xl" callsign={currentHero.name} />
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold">
                    FIXED CLASS // {currentHero.role.toUpperCase()}
                  </div>
                  <h3 className="text-2xl font-black text-white font-mono uppercase">
                    {currentHero.name}
                  </h3>
                  <div className="text-xs text-amber-400 font-mono mt-0.5">
                    {currentHero.weaponName}
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-mono leading-relaxed mb-4">
                {currentHero.description}
              </p>

              {/* Character Attributes Bar */}
              <div className="space-y-2 mb-5 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>HEALTH CAPACITY</span>
                    <span className="text-emerald-400 font-bold">{currentHero.maxHp} HP</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${((currentHero.maxHp || 800) / 900) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>BALLISTIC ARMOR</span>
                    <span className="text-sky-400 font-bold">{currentHero.maxArmor} AP</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${(currentHero.maxArmor / 500) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>TACTICAL VELOCITY</span>
                    <span className="text-amber-400 font-bold">{currentHero.speed} MPS</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(currentHero.speed / 280) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Character Selector Quick Switch */}
              <div className="border-t border-slate-800 pt-4">
                <div className="text-[10px] uppercase font-mono text-slate-500 font-bold mb-2">
                  SELECT FIXED CLASS OPERATIVE:
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {FIXED_CHARACTERS.map((char) => {
                    const hero = HERO_DEFINITIONS[char.heroId];
                    const isSelected = selectedHeroId === char.heroId;
                    return (
                      <button
                        key={char.id}
                        onClick={() => {
                          sounds.playGunshot(char.heroId);
                          onSelectHero(char.heroId);
                        }}
                        className={`p-2 rounded border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center font-bold text-[10px] text-black"
                          style={{ backgroundColor: hero.color }}
                        >
                          {hero.name.charAt(0)}
                        </div>
                        <div className="text-[10px] font-bold text-white truncate">{char.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: SERVER BROWSER */}
        {activeView === 'servers' && (
          <div className="bg-[#080d19] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                  SERVER DIRECTORY // GLOBAL COMBAT INFRASTRUCTURE
                </div>
                <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white font-mono">
                  AVAILABLE COMBAT SERVERS
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchRooms}
                  disabled={isLoadingRooms}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                  <span>REFRESH LIST</span>
                </button>
                <button
                  onClick={() => setActiveView('home')}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase cursor-pointer"
                >
                  RETURN
                </button>
              </div>
            </div>

            {/* PERSISTENT MMO BASE-BUILDING SECTOR INTEGRATION BANNER */}
            <div className="mb-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-sky-950/40 border border-amber-500/40 rounded-xl p-3.5 shadow-lg">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                        PERSISTENT MMO BASE LINK // SECTOR SYNCHRONIZATION
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
                        SECTOR 8 CONNECTED
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-300 mt-0.5">
                      Combat in <span className="text-amber-300 font-bold">Omega Killzone 0</span> directly defends and secures base installations, defenses, and resource grids in your persistent MMO universe. When entering a sector like <span className="text-white font-bold">Sector 8</span>, matches settle live frontline territory control.
                    </p>
                  </div>
                </div>

                {/* Quick Sector 8 Teleport Button */}
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={() => onJoinRoom('sector-8', 'tdm', false)}
                    className="flex-1 md:flex-initial px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>TELEPORT TO SECTOR 8</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Servers Table */}
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-800 pb-2">
                    <th className="py-2.5 px-3">SERVER / SECTOR NAME</th>
                    <th className="py-2.5 px-3">REGION</th>
                    <th className="py-2.5 px-3">COMBAT MODE</th>
                    <th className="py-2.5 px-3 text-center">OPERATIVES</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                    <th className="py-2.5 px-3 text-right">DEPLOYMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(Array.isArray(rooms) ? rooms : []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-mono text-xs">
                        {isLoadingRooms ? 'SCANNING SECURE SATELLITE LINKS FOR BATTLEFIELDS...' : 'NO SERVERS DETECTED. INITIALIZING LOCAL SIMULATION...'}
                      </td>
                    </tr>
                  ) : (
                    (Array.isArray(rooms) ? rooms : []).map((room) => {
                      const isFull = room.playerCount >= room.maxPlayers;
                      return (
                      <tr
                        key={room.id}
                        className="hover:bg-slate-850/40 transition-colors group"
                      >
                        {/* Name */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white group-hover:text-amber-400 transition-colors">
                              {room.name}
                            </span>
                            {room.sectorMmoInfo && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                                SECTOR {room.sectorMmoInfo.sectorNumber} MMO
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                            <span>ID: {room.id}</span>
                            {room.sectorMmoInfo && (
                              <span className="text-amber-400/90 font-medium">
                                • {room.sectorMmoInfo.baseStatus}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Region */}
                        <td className="py-3 px-3 text-slate-400">
                          {room.region}
                        </td>

                        {/* Mode */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-bold uppercase text-[10px]">
                            {room.mode.toUpperCase()}
                          </span>
                        </td>

                        {/* Operatives Count */}
                        <td className="py-3 px-3 text-center font-bold">
                          <span className={isFull ? 'text-rose-400' : 'text-emerald-400'}>
                            {room.playerCount}
                          </span>
                          <span className="text-slate-500"> / {room.maxPlayers}</span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                              room.status === 'in_progress'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {room.status === 'in_progress' ? 'COMBAT ACTIVE' : 'LOBBY OPEN'}
                          </span>
                        </td>

                        {/* Actions: Deploy or Spectate */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => onJoinRoom(room.id, room.mode, false)}
                              disabled={isFull}
                              className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                isFull
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800'
                                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              }`}
                            >
                              <Play className="w-3 h-3 fill-black" />
                              <span>DEPLOY</span>
                            </button>

                            <button
                              onClick={() => onJoinRoom(room.id, room.mode, true)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors"
                              title="Join as Spectator"
                            >
                              <Eye className="w-3 h-3 text-sky-400" />
                              <span className="hidden sm:inline">SPECTATE</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 3: FIXED CHARACTERS SELECTION */}
        {activeView === 'characters' && (
          <div className="bg-[#080d19] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                  OPERATOR ROSTER // FIXED CLASS ARCHETYPES
                </div>
                <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white font-mono">
                  SELECT COMBAT OPERATIVE
                </h2>
              </div>
              <button
                onClick={() => setActiveView('home')}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase cursor-pointer"
              >
                RETURN
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {FIXED_CHARACTERS.map((char) => {
                const hero = HERO_DEFINITIONS[char.heroId];
                const isSelected = selectedHeroId === char.heroId;

                return (
                  <div
                    key={char.id}
                    onClick={() => {
                      sounds.playGunshot(char.heroId);
                      onSelectHero(char.heroId);
                    }}
                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-slate-900/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {char.role}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-amber-500 text-black flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>EQUIPPED</span>
                          </span>
                        )}
                      </div>

                      <div className="mb-3 group-hover:scale-105 transition-transform">
                        <CharacterAvatar heroId={hero.id} size="lg" callsign={hero.name} />
                      </div>

                      <h3 className="text-lg font-black font-mono text-white uppercase group-hover:text-amber-400 transition-colors">
                        {char.name}
                      </h3>
                      <div className="text-xs text-amber-400 font-mono mb-2">
                        {char.weapon}
                      </div>

                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-4">
                        {char.description}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="space-y-1.5 border-t border-slate-800 pt-3 text-[10px] font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>HEALTH:</span>
                        <span className="font-bold text-emerald-400">{hero.maxHp} HP</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>ARMOR:</span>
                        <span className="font-bold text-sky-400">{hero.maxArmor} AP</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>ABILITY:</span>
                        <span className="font-bold text-amber-400">{hero.abilityName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: DEDICATED LEADERBOARDS SECTION */}
        {activeView === 'leaderboards' && (
          <div className="max-w-5xl mx-auto w-full bg-[#080d19] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[82vh]">
            {/* Leaderboards Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-amber-400 font-bold flex items-center gap-2">
                    <span>MILITARY ARCHIVE // GLOBAL STANDINGS</span>
                    <span className="px-1.5 py-0.2 text-[9px] bg-slate-800 text-slate-400 rounded border border-slate-700">
                      LIVE
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase text-white font-mono">
                    KILLZONE LEADERBOARDS
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenLastWeekWinners}
                  className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="View Last Week's Certified Tournament Champions"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>LAST WEEK'S CHAMPIONS</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('servers');
                    fetchRooms();
                  }}
                  className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>DEPLOY TO COMBAT</span>
                </button>
                <button
                  onClick={() => setActiveView('home')}
                  className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs uppercase cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  title="Close Leaderboard & Return to Command Center"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>CLOSE</span>
                </button>
              </div>
            </div>

            {/* 4 Tabs: THIS WEEK, ALL-TIME, LAST WEEK, DAILY */}
            <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-800/80">
              {[
                { id: 'thisWeek' as LeaderboardTab, label: "THIS WEEK'S LEADERBOARD", desc: 'Active Tournament Circuit', icon: Flame },
                { id: 'allTime' as LeaderboardTab, label: 'ALL-TIME LEADERBOARD', desc: 'Hall of Combat Legends', icon: Trophy },
                { id: 'lastWeek' as LeaderboardTab, label: "LAST WEEK'S LEADERBOARD", desc: 'Past Tournament Results', icon: Award },
                { id: 'daily' as LeaderboardTab, label: 'DAILY LEADERBOARD', desc: '24-Hour Tactical Cycle', icon: Target },
              ].map((tab) => {
                const isActive = leaderboardTab === tab.id;
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setLeaderboardTab(tab.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-amber-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tactical Rankings Table */}
            <div className="flex-1 overflow-y-auto overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/70">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-800 bg-slate-900/80">
                    <th className="py-2.5 px-3">RANK</th>
                    <th className="py-2.5 px-3">OPERATOR</th>
                    <th className="py-2.5 px-3 text-center">KILLS</th>
                    <th className="py-2.5 px-3 text-center">DEATHS</th>
                    <th className="py-2.5 px-3 text-center">K/D</th>
                    <th className="py-2.5 px-3 text-center">WINS</th>
                    <th className="py-2.5 px-3 text-right">COMBAT SCORE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {((leaderboardData[leaderboardTab] || [])).map((entry, idx) => {
                    const hero = HERO_DEFINITIONS[entry.heroId] || HERO_DEFINITIONS.sniper;
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    return (
                      <tr
                        key={entry.id}
                        className={`hover:bg-slate-900/60 transition-colors ${
                          isTop1
                            ? 'bg-amber-500/10'
                            : isTop2
                            ? 'bg-slate-400/10'
                            : isTop3
                            ? 'bg-amber-700/10'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            {isTop1 ? (
                              <span className="w-6 h-6 rounded bg-amber-500 text-black font-black text-xs flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                1
                              </span>
                            ) : isTop2 ? (
                              <span className="w-6 h-6 rounded bg-slate-300 text-black font-black text-xs flex items-center justify-center">
                                2
                              </span>
                            ) : isTop3 ? (
                              <span className="w-6 h-6 rounded bg-amber-700 text-white font-black text-xs flex items-center justify-center">
                                3
                              </span>
                            ) : (
                              <span className="w-6 text-center text-slate-500 font-bold">
                                {idx + 1}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <CharacterAvatar heroId={entry.heroId} size="xs" callsign={entry.name} />
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-xs">{entry.name}</span>
                              {entry.title && (
                                <span className="text-[9px] text-amber-400/80">{entry.title}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-rose-400 font-bold">
                          {entry.kills}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {entry.deaths}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-400">
                          {entry.kd}
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                          {entry.wins}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">
                          {entry.score.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 5: SETTINGS & CHANGE GAME NAME */}
        {activeView === 'settings' && (
          <div className="max-w-xl mx-auto w-full bg-[#080d19] border border-slate-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
              <div>
                <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                  OPERATIONAL PARAMETERS
                </div>
                <h2 className="text-xl font-black italic uppercase text-white font-mono">
                  TERMINAL SETTINGS
                </h2>
              </div>
              <button
                onClick={() => setActiveView('home')}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs uppercase cursor-pointer"
              >
                RETURN
              </button>
            </div>

            {/* Position for Change of Game Name (User Request Requirement) */}
            <form onSubmit={handleSaveName} className="mb-6">
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                CHANGE GAME CALLSIGN / PLAYER NAME
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  maxLength={16}
                  placeholder="Enter callsign..."
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 px-3.5 py-2.5 rounded text-sm font-mono text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-black uppercase font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>SAVE NAME</span>
                </button>
              </div>
              {nameSavedNotice && (
                <div className="text-emerald-400 text-xs font-mono mt-1.5 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Callsign successfully updated to "{playerName}"!</span>
                </div>
              )}
            </form>

            {/* Audio Toggle */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-300 font-mono uppercase">
                  MASTER AUDIO SYNTHESIZER
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Synthesized combat SFX and tactical audio cues
                </div>
              </div>
              <button
                onClick={() => setSoundMuted(!soundMuted)}
                className={`p-2 rounded border transition-colors cursor-pointer ${
                  soundMuted
                    ? 'bg-rose-950/40 border-rose-600 text-rose-400'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Persistent Database & Supabase Integration Status */}
            <div className="border-t border-slate-800 pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-amber-400" />
                    <span>PERSISTENT DATABASE // SUPABASE SYNC</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Stores all player tokens, values & tournament leaderboards
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PERSISTENCE ACTIVE
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-3 mt-2">
                <div className="flex flex-wrap justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Database Engine:</span>
                  <span className="text-amber-400 font-bold">
                    {dbStatus?.provider === 'supabase' ? 'Supabase PostgreSQL (Cloud)' : 'Local Persistent Storage (Active & Ready)'}
                  </span>
                </div>

                <div className="flex flex-wrap justify-between items-center text-[11px] pb-2 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-sky-400" />
                    <span>Active Key Authorization:</span>
                  </span>
                  <span className="text-sky-400 font-semibold">
                    {dbStatus?.keyTypeDescription || 'Local File Storage'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-950/80 border border-amber-500/30 rounded p-2.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-1">
                      <Key className="w-3.5 h-3.5" />
                      <span>SERVICE ROLE KEY (RECOMMENDED)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      For server hosting on <strong className="text-slate-200">Railway</strong> or Docker: set <code className="text-amber-300">SUPABASE_SERVICE_ROLE_KEY</code>. It gives the Node.js game server admin authority to update player tokens and weekly leaderboards directly without requiring user logins or RLS restrictions.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-700/60 rounded p-2.5">
                    <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px] mb-1">
                      <Key className="w-3.5 h-3.5" />
                      <span>ANON KEY (PUBLIC CLIENT)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Set <code className="text-sky-300">SUPABASE_ANON_KEY</code> if using public API keys. When using anon keys, ensure you run the SQL migration schema so public read/write RLS policies are enabled for matches and profiles.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Need table definitions in Supabase?</span>
                  <button
                    type="button"
                    onClick={() => {
                      fetchSqlSchema();
                      setShowSqlModal(true);
                    }}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>VIEW SUPABASE SQL SCHEMA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SQL Migration Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-xl max-w-2xl w-full p-5 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono font-bold text-white text-sm uppercase">
                  SUPABASE POSTGRESQL TABLE SCHEMA
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-white font-mono text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono my-3">
              Copy and execute this script inside your <strong>Supabase Dashboard &gt; SQL Editor</strong> to create all tables and RLS policies for player persistence:
            </p>

            <div className="relative flex-1 min-h-0 bg-slate-950 border border-slate-800 rounded p-3 overflow-auto">
              <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap">
                {sqlSchema || 'Loading SQL schema...'}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-3">
              <span className="text-[10px] text-slate-500 font-mono">
                Tables: player_profiles, tournament_leaderboards
              </span>
              <button
                onClick={() => {
                  if (sqlSchema) {
                    navigator.clipboard.writeText(sqlSchema);
                    setCopiedSchema(true);
                    setTimeout(() => setCopiedSchema(false), 2000);
                  }
                }}
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                {copiedSchema ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSchema ? 'COPIED TO CLIPBOARD' : 'COPY SQL SCRIPT'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Military Footer Telemetry */}
      <footer className="relative z-20 px-4 sm:px-8 py-3 border-t border-slate-900 bg-slate-950/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-500">
        <div>KILLZONE ZERO // BUILD 2.4.0 TACTICAL ENGINE</div>
        <div className="flex items-center gap-4">
          <span>SERVER TICK: 25HZ</span>
          <span>LATENCY: &lt;15MS</span>
          <span className="text-amber-400 font-bold">CREDITS: 🪙 {playerCoins}</span>
        </div>
      </footer>
    </div>
  );
};
