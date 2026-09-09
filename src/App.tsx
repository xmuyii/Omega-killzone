import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ClientMessage,
  ServerMessage,
  PlayerState,
  GameWorldState,
  Wall,
  Bush,
  HeroId,
  KillEvent,
  GameMode,
  TeamId,
  WeaponId,
  EffectId,
  StreakEvent,
} from './types/game';
import { HERO_DEFINITIONS, MAP_CONFIG } from './game/constants';
import { CanvasRenderer } from './game/canvasRenderer';
import { sounds } from './game/audio';
import { TacticalHUD } from './components/TacticalHUD';
import { HeroSelectModal } from './components/HeroSelectModal';
import { JoinLobbyModal } from './components/JoinLobbyModal';
import { TouchControls } from './components/TouchControls';
import { MiniMap } from './components/MiniMap';
import { KillScreenModal } from './components/KillScreenModal';
import { KillBanner } from './components/KillBanner';
import { KillstreakAnnouncer } from './components/KillstreakAnnouncer';
import { ShopModal } from './components/ShopModal';
import { MatchEndVoteModal } from './components/MatchEndVoteModal';
import { ScoreboardModal } from './components/ScoreboardModal';
import { MilitaryMainMenu } from './components/MilitaryMainMenu';
import { LastWeekWinnersModal } from './components/LastWeekWinnersModal';
import { OrientationGuard } from './components/OrientationGuard';
import { requestLandscapeMode } from './utils/orientation';
import { INITIAL_LEADERBOARD_DATA } from './game/leaderboardData';
import { LeaderboardData } from './types/game';
import {
  getPlayerCoins,
  getEquippedLoadout,
  getTurretInventory,
  setTurretInventory,
  saveEquippedLoadout,
} from './game/loadoutData';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connection and Session state
  const [hasJoined, setHasJoined] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>(() => {
    const sessionName = sessionStorage.getItem('be_player_name');
    if (sessionName) return sessionName;
    const newName = `Agent-${Math.floor(Math.random() * 900 + 100)}`;
    sessionStorage.setItem('be_player_name', newName);
    return newName;
  });
  const [currentHeroId, setCurrentHeroId] = useState<HeroId>(() => {
    const saved = (localStorage.getItem('be_hero_id') as HeroId) || 'assault';
    if (saved === 'bastion') return 'marksman';
    if (saved === 'mirage' || saved === 'valkyrie') return 'sniper';
    if (saved === 'titan' || saved === 'stalker') return 'assault';
    if (['sniper', 'shotgun', 'assault', 'marksman'].includes(saved)) return saved;
    return 'assault';
  });
  const [roomId, setRoomId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'public-arena';
  });

  // World and game state
  const [worldState, setWorldState] = useState<GameWorldState | null>(null);
  const [lastKillEvent, setLastKillEvent] = useState<KillEvent | null>(null);
  const [activeStreakEvent, setActiveStreakEvent] = useState<StreakEvent | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('ffa');
  const [playerTeam, setPlayerTeam] = useState<TeamId | undefined>(undefined);
  const [enableBots, setEnableBots] = useState<boolean>(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [bushes, setBushes] = useState<Bush[]>([]);
  const [ping, setPing] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHeroSelectOpen, setIsHeroSelectOpen] = useState<boolean>(false);

  // Economy, Shop, and Loadout State
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [playerCoins, setPlayerCoins] = useState<number>(() => getPlayerCoins());
  const [turretInventory, setTurretInventoryState] = useState<number>(() => getTurretInventory());
  const [equippedLoadout, setEquippedLoadout] = useState<{ weaponId: WeaponId; effectId: EffectId }>(() =>
    getEquippedLoadout()
  );
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [showLastWeekWinners, setShowLastWeekWinners] = useState<boolean>(() => {
    return !sessionStorage.getItem('be_seen_last_week_v2');
  });
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>(INITIAL_LEADERBOARD_DATA);

  // Sync leaderboards & persistent player tokens from database
  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.leaderboard) {
          setLeaderboardData(data.leaderboard);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!playerName) return;
    fetch(`/api/player/${encodeURIComponent(playerName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.profile?.tokens !== undefined) {
          setPlayerCoins(data.profile.tokens);
        }
      })
      .catch(() => {});
  }, [playerName]);

  // Scoreboard and Spectator state
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [spectatedPlayerId, setSpectatedPlayerId] = useState<string | null>(null);
  const isSpectatorRef = useRef<boolean>(false);
  const spectatedPlayerIdRef = useRef<string | null>(null);

  // Synchronous refs for smooth 60fps render loop without re-renders
  const playerIdRef = useRef<string>('');
  const worldStateRef = useRef<GameWorldState | null>(null);
  const wallsRef = useRef<Wall[]>([]);
  const bushesRef = useRef<Bush[]>([]);

  // Local input state tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchMove = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchAimAngle = useRef<number | null>(null);
  const previousHp = useRef<number>(0);
  const lastInputSendTime = useRef<number>(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Canvas Renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const handleResize = () => {
      if (canvasRef.current && rendererRef.current) {
        rendererRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Connect to WebSocket Server
  const connectWebSocket = useCallback(
    (name: string, room: string, hero: HeroId, mode?: GameMode, team?: TeamId, bots?: boolean, spectate?: boolean) => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      if (wsRef.current) {
        const oldWs = wsRef.current;
        oldWs.onopen = null;
        oldWs.onmessage = null;
        oldWs.onerror = null;
        oldWs.onclose = null;
        try {
          oldWs.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        const joinMsg: ClientMessage = {
          type: 'join',
          name,
          heroId: hero,
          roomId: room,
          team,
          gameMode: mode,
          enableBots: bots,
          isSpectator: spectate,
        };
        ws.send(JSON.stringify(joinMsg));

        // Sync initial player loadout & turret stock with server
        const currentLoadout = getEquippedLoadout();
        const currentTurrets = getTurretInventory();
        ws.send(
          JSON.stringify({
            type: 'equip_loadout',
            weaponId: currentLoadout.weaponId,
            effectId: currentLoadout.effectId,
          })
        );
        ws.send(
          JSON.stringify({
            type: 'add_turrets',
            count: currentTurrets,
          })
        );

        // Start periodic ping measurement
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', clientTime: performance.now() }));
          }
        }, 2000);

        ws.addEventListener('close', () => clearInterval(pingInterval));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;

          if (msg.type === 'init') {
            playerIdRef.current = msg.playerId;
            worldStateRef.current = msg.world;
            wallsRef.current = msg.walls;
            bushesRef.current = msg.bushes;
            setPlayerId(msg.playerId);
            setWorldState(msg.world);
            setWalls(msg.walls);
            setBushes(msg.bushes);
            setRoomId(msg.roomId);
            if (msg.isSpectator) {
              setIsSpectator(true);
              isSpectatorRef.current = true;
            }
          } else if (msg.type === 'world_update') {
            worldStateRef.current = msg.world;
            setWorldState(msg.world);

            const myId = playerIdRef.current;
            const localP = msg.world.players[myId];
            if (localP && rendererRef.current) {
              if (previousHp.current > 0 && localP.hp < previousHp.current) {
                const diff = previousHp.current - localP.hp;
                sounds.playHit(localP.armor > 0);
                rendererRef.current.addDamageText(localP.x, localP.y, Math.round(diff), localP.armor > 0);
                rendererRef.current.addImpactSparks(localP.x, localP.y, '#ef4444');
              }
              previousHp.current = localP.hp;
            }

            // Gunshot audio for players shooting
            for (const pId in msg.world.players) {
              const p = msg.world.players[pId];
              if (p.isShooting && Math.random() < 0.35) {
                const isLocal = p.id === myId;
                sounds.playGunshot(p.heroId, isLocal);
                if (rendererRef.current) {
                  rendererRef.current.addMuzzleFlash(p.x, p.y, p.angle, HERO_DEFINITIONS[p.heroId].color);
                }
              }
            }
          } else if (msg.type === 'pong') {
            const rtt = Math.round(performance.now() - msg.clientTime);
            setPing(rtt);
          } else if (msg.type === 'kill') {
            setLastKillEvent(msg.kill);
            if (msg.kill.killerId === playerIdRef.current) {
              sounds.playKill();
            }
          } else if (msg.type === 'streak') {
            setActiveStreakEvent(msg.streak);
          } else if (msg.type === 'match_ended') {
            setLastWinner(msg.winner);
            setCoinsEarned(msg.coinsAwarded || 0);
            setPlayerCoins(getPlayerCoins());
          }
        } catch (err) {
          console.error('Error handling WS message in client:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Automatic reconnection retry
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connectWebSocket(name, room, hero);
          }
        }, 1500);
      };

      ws.onerror = () => {
        // Suppress browser error noise on normal socket closure or negotiation
      };
    },
    []
  );

  // Auto-connect and deploy into combat if already joined, or cleanup on unmount
  useEffect(() => {
    if (hasJoined) {
      connectWebSocket(playerName, roomId, currentHeroId);
    }

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current) {
        const oldWs = wsRef.current;
        oldWs.onopen = null;
        oldWs.onmessage = null;
        oldWs.onerror = null;
        oldWs.onclose = null;
        try {
          oldWs.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, []);

  // Handle Joining from Lobby
  const handleJoinLobby = (
    name: string,
    room: string,
    hero: HeroId,
    mode: GameMode,
    team?: TeamId,
    bots?: boolean,
    spectate?: boolean
  ) => {
    requestLandscapeMode().catch(() => {});
    setPlayerName(name);
    setRoomId(room);
    setCurrentHeroId(hero);
    setGameMode(mode);
    setPlayerTeam(team);
    setEnableBots(Boolean(bots));
    setIsSpectator(Boolean(spectate));
    isSpectatorRef.current = Boolean(spectate);
    sessionStorage.setItem('be_player_name', name);
    localStorage.setItem('be_hero_id', hero);
    setHasJoined(true);
    connectWebSocket(name, room, hero, mode, team, bots, spectate);
  };

  // Cycle Spectator Target Operative
  const handleNextSpectate = useCallback(() => {
    const players = worldStateRef.current?.players;
    if (!players) return;
    const playerList = Object.values(players) as PlayerState[];
    const alivePlayers = playerList.filter((p) => p.isAlive);
    if (alivePlayers.length === 0) return;
    const currentIdx = alivePlayers.findIndex((p) => p.id === spectatedPlayerIdRef.current);
    const nextIdx = (currentIdx + 1) % alivePlayers.length;
    const nextId = alivePlayers[nextIdx].id;
    setSpectatedPlayerId(nextId);
    spectatedPlayerIdRef.current = nextId;
  }, []);

  const handlePrevSpectate = useCallback(() => {
    const players = worldStateRef.current?.players;
    if (!players) return;
    const playerList = Object.values(players) as PlayerState[];
    const alivePlayers = playerList.filter((p) => p.isAlive);
    if (alivePlayers.length === 0) return;
    const currentIdx = alivePlayers.findIndex((p) => p.id === spectatedPlayerIdRef.current);
    const prevIdx = (currentIdx - 1 + alivePlayers.length) % alivePlayers.length;
    const prevId = alivePlayers[prevIdx].id;
    setSpectatedPlayerId(prevId);
    spectatedPlayerIdRef.current = prevId;
  }, []);

  // Toggle Bots In-Game (Strictly restricted to Training Mode)
  const handleToggleBots = () => {
    const activeMode = worldState?.gameMode || gameMode;
    if (activeMode !== 'training') {
      return;
    }
    const nextVal = !worldState?.enableBots;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'toggle_bots', enableBots: nextVal }));
    }
  };

  // Switch Hero
  const handleSelectHero = (heroId: HeroId) => {
    setCurrentHeroId(heroId);
    localStorage.setItem('be_hero_id', heroId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'select_hero', heroId }));
    }
  };

  // Use Special Ability
  const handleUseAbility = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'use_ability' }));
      sounds.playAbility();
    }
  };

  // Reload
  const handleReload = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'reload' }));
      sounds.playReload();
    }
  };

  // Audio mute toggle
  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  // Return to Main Menu (especially for Battle Royale elimination)
  const handleReturnToMenu = useCallback(() => {
    if (wsRef.current) {
      const oldWs = wsRef.current;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setHasJoined(false);
    setWorldState(null);
  }, []);

  // Deploy Sentry Turret
  const handleDeployTurret = useCallback(() => {
    if (turretInventory <= 0) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'place_turret' }));
      const newCount = Math.max(0, turretInventory - 1);
      setTurretInventory(newCount);
      setTurretInventoryState(newCount);
      sounds.playAbility();
    }
  }, [turretInventory]);

  // Cast Vote for Next Map / Game Mode
  const handleCastVote = useCallback((mapId: string, mode: GameMode) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cast_vote', mapId, gameMode: mode }));
    }
  }, []);

  // Update loadout and notify server if connected
  const handleEquipChange = (weaponId: WeaponId, effectId: EffectId) => {
    setEquippedLoadout({ weaponId, effectId });
    saveEquippedLoadout(weaponId, effectId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'equip_loadout', weaponId, effectId }));
    }
  };

  // When purchasing turrets in Shop
  const handleTurretBuy = (newCount: number) => {
    setTurretInventoryState(newCount);
    setPlayerCoins(getPlayerCoins());
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'add_turrets', count: newCount }));
    }
  };

  // Keyboard & Mouse Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setIsScoreboardOpen(false);
        setIsHeroSelectOpen(false);
        setIsShopOpen(false);
        return;
      }

      keysPressed.current[e.key.toLowerCase()] = true;

      // Spectator navigation shortcuts
      if (isSpectatorRef.current) {
        if (e.key === 'ArrowRight' || e.key === 'e' || e.key === 'E') {
          handleNextSpectate();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'q' || e.key === 'Q') {
          handlePrevSpectate();
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleUseAbility();
      } else if (e.key.toLowerCase() === 'r') {
        handleReload();
      } else if (e.key.toLowerCase() === 't') {
        handleDeployTurret();
      } else if (e.key.toLowerCase() === 'h') {
        setIsHeroSelectOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMute();
      } else if (e.key === '1') {
        handleSelectHero('sniper');
      } else if (e.key === '2') {
        handleSelectHero('shotgun');
      } else if (e.key === '3') {
        handleSelectHero('assault');
      } else if (e.key === '4') {
        handleSelectHero('marksman');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleNextSpectate, handlePrevSpectate]);

  // Game Render and Input Dispatch Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      animId = requestAnimationFrame(loop);

      const currentWorld = worldStateRef.current;
      const myId = playerIdRef.current;
      const localPlayer = currentWorld?.players[myId];

      // 1. Calculate and Send Player Input to Server (Only for combatants, not spectators)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isSpectatorRef.current) {
        const now = performance.now();
        if (now - lastInputSendTime.current >= 25) {
          // ~40Hz input updates for ultra-responsive movement
          let moveX = 0;
          let moveY = 0;

          if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY -= 1;
          if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY += 1;
          if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
          if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

          // Touch joystick overrides if active
          if (touchMove.current.x !== 0 || touchMove.current.y !== 0) {
            moveX = touchMove.current.x;
            moveY = touchMove.current.y;
          }

          // Calculate Aim Angle: mouse > touch > movement direction > previous angle
          let aimAngle = localPlayer?.angle || 0;
          if (touchAimAngle.current !== null) {
            aimAngle = touchAimAngle.current;
          } else if (mousePos.current.x !== 0 || mousePos.current.y !== 0) {
            const screenCenterX = window.innerWidth / 2;
            const screenCenterY = window.innerHeight / 2;
            aimAngle = Math.atan2(mousePos.current.y - screenCenterY, mousePos.current.x - screenCenterX);
          } else if (moveX !== 0 || moveY !== 0) {
            aimAngle = Math.atan2(moveY, moveX);
          }

          const isSprint = !!keysPressed.current['shift'];

          const inputMsg: ClientMessage = {
            type: 'input',
            moveX,
            moveY,
            angle: aimAngle,
            isSprint,
          };
          wsRef.current.send(JSON.stringify(inputMsg));
          lastInputSendTime.current = now;
        }
      }

      // 2. Render Canvas Game World
      if (rendererRef.current && currentWorld) {
        const isRadarActive = localPlayer?.abilityActive?.type === 'scan';
        rendererRef.current.render(
          myId,
          currentWorld.players,
          currentWorld.bullets,
          currentWorld.pickups,
          wallsRef.current,
          bushesRef.current,
          currentWorld.soundEchoes,
          isRadarActive,
          currentWorld.turrets,
          currentWorld.safeZone,
          spectatedPlayerIdRef.current || undefined
        );
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const activeHero = HERO_DEFINITIONS[currentHeroId] || HERO_DEFINITIONS.stalker;
  const localPlayerState = worldState?.players[playerId];

  return (
    <div
      id="game-app-root"
      className="relative w-screen h-screen overflow-hidden bg-[#050506] text-slate-200 font-sans select-none flex flex-col"
      style={{
        backgroundImage: 'radial-gradient(#1a1a2e 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    >
      {/* Immersive UI Ambient Radial Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(circle at center, rgba(16, 24, 39, 0) 0%, rgba(5, 5, 6, 0.75) 70%)',
        }}
      />

      {/* HTML5 Game Canvas */}
      <canvas
        id="game-viewport"
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair touch-none relative z-0"
      />

      {/* Tactical HUD (Only visible once joined) */}
      {hasJoined && (
        <TacticalHUD
          player={localPlayerState}
          hero={activeHero}
          kills={worldState?.recentKills || []}
          allPlayers={worldState?.players || {}}
          ping={ping}
          roomId={roomId}
          isMuted={isMuted}
          gameMode={worldState?.gameMode || gameMode}
          teamScores={worldState?.teamScores}
          enableBots={worldState?.enableBots ?? enableBots}
          turretInventory={turretInventory}
          playerCoins={playerCoins}
          safeZone={worldState?.safeZone}
          connectedPlayerCount={worldState?.connectedPlayersCount}
          maxServerCapacity={worldState?.maxServerCapacity || 10}
          spectatorCount={worldState?.spectatorCount || 0}
          isSpectator={isSpectator}
          spectatedPlayer={spectatedPlayerId ? worldState?.players[spectatedPlayerId] : undefined}
          onOpenScoreboard={() => setIsScoreboardOpen(true)}
          onNextSpectate={handleNextSpectate}
          onPrevSpectate={handlePrevSpectate}
          onToggleMute={handleToggleMute}
          onOpenHeroSelect={() => setIsHeroSelectOpen(true)}
          onSelectHero={handleSelectHero}
          onUseAbility={handleUseAbility}
          onReload={handleReload}
          onDeployTurret={handleDeployTurret}
          onOpenShop={() => setIsShopOpen(true)}
          onToggleBots={handleToggleBots}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {/* Tactical Mini-Map Radar Overlay */}
      {hasJoined && (
        <MiniMap
          player={localPlayerState || null}
          players={worldState?.players || {}}
          walls={walls}
          soundEchoes={worldState?.soundEchoes || []}
          gameMode={worldState?.gameMode || gameMode}
          teamScores={worldState?.teamScores}
          radarActive={localPlayerState?.abilityActive?.type === 'scan'}
          safeZone={worldState?.safeZone}
          turrets={worldState?.turrets}
        />
      )}

      {/* Kill Banner (Elimination notification) */}
      {hasJoined && (
        <KillBanner lastKill={lastKillEvent} localPlayerId={playerId} />
      )}

      {/* Multi-Kill & Killstreak Announcer Overlay */}
      {hasJoined && (
        <KillstreakAnnouncer streakEvent={activeStreakEvent} localPlayerId={playerId} />
      )}

      {/* Kill Screen Modal (When player is eliminated) */}
      {hasJoined && localPlayerState && !localPlayerState.isAlive && (
        <KillScreenModal
          player={localPlayerState}
          lastKillEvent={lastKillEvent}
          selectedHeroId={currentHeroId}
          onSelectHero={handleSelectHero}
          gameMode={worldState?.gameMode || gameMode}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {/* Match End & Map/Mode Voting Modal */}
      {hasJoined && worldState?.votingState?.isVoting && (
        <MatchEndVoteModal
          localPlayer={localPlayerState || null}
          votingState={worldState.votingState}
          winner={lastWinner}
          gameMode={worldState.gameMode || gameMode}
          teamScores={worldState.teamScores}
          onCastVote={handleCastVote}
          coinsEarned={coinsEarned}
        />
      )}

      {/* Mobile Touch Joysticks & Controls */}
      {hasJoined && (
        <TouchControls
          onMove={(x, y) => {
            touchMove.current = { x, y };
          }}
          onAim={(angle) => {
            touchAimAngle.current = angle;
          }}
          onUseAbility={handleUseAbility}
          onReload={handleReload}
        />
      )}

      {/* Hero Selection Modal */}
      {isHeroSelectOpen && (
        <HeroSelectModal
          currentHeroId={currentHeroId}
          onSelectHero={handleSelectHero}
          onClose={() => setIsHeroSelectOpen(false)}
        />
      )}

      {/* Armory & Tactical Weapon Shop */}
      {isShopOpen && (
        <ShopModal
          onClose={() => {
            setIsShopOpen(false);
            setPlayerCoins(getPlayerCoins());
            setTurretInventoryState(getTurretInventory());
          }}
          onEquipChange={handleEquipChange}
          onTurretBuy={handleTurretBuy}
        />
      )}

      {/* Scoreboard / Online Players Roster Modal */}
      {hasJoined && (
        <ScoreboardModal
          isOpen={isScoreboardOpen}
          onClose={() => setIsScoreboardOpen(false)}
          players={worldState?.players || {}}
          localPlayerId={playerId}
          gameMode={worldState?.gameMode || gameMode}
          teamScores={worldState?.teamScores}
          roomId={roomId}
          spectatorCount={worldState?.spectatorCount || 0}
          maxCapacity={worldState?.maxServerCapacity || 10}
          onSpectatePlayer={(targetId) => {
            setSpectatedPlayerId(targetId);
            spectatedPlayerIdRef.current = targetId;
            setIsSpectator(true);
            isSpectatorRef.current = true;
            setIsScoreboardOpen(false);
          }}
        />
      )}

      {/* Home Screen / Military Main Menu (Shown before joining) */}
      {!hasJoined && !showDeployModal && (
        <div className="relative z-40 w-full h-full">
          <MilitaryMainMenu
            playerName={playerName}
            playerCoins={playerCoins}
            selectedHeroId={currentHeroId}
            onSelectHero={(heroId) => {
              setCurrentHeroId(heroId);
              localStorage.setItem('be_hero_id', heroId);
            }}
            onUpdatePlayerName={(newName) => {
              setPlayerName(newName);
              sessionStorage.setItem('be_player_name', newName);
            }}
            onJoinRoom={(targetRoomId, mode, asSpectator) => {
              handleJoinLobby(
                playerName,
                targetRoomId,
                currentHeroId,
                mode,
                undefined,
                false,
                asSpectator
              );
            }}
            onOpenCustomLobby={() => setShowDeployModal(true)}
            onOpenShop={() => setIsShopOpen(true)}
            onOpenLastWeekWinners={() => setShowLastWeekWinners(true)}
            leaderboardData={leaderboardData}
          />
        </div>
      )}

      {/* Custom Deploy & Character Briefing Modal */}
      {!hasJoined && showDeployModal && (
        <div className="relative z-50">
          <JoinLobbyModal
            initialName={playerName}
            initialRoomId={roomId}
            initialHeroId={currentHeroId}
            equippedWeaponId={equippedLoadout.weaponId}
            equippedEffectId={equippedLoadout.effectId}
            playerCoins={playerCoins}
            turretCount={turretInventory}
            onOpenShop={() => setIsShopOpen(true)}
            onOpenSettings={() => setShowDeployModal(false)}
            onJoin={(name, room, hero, mode, team, bots, spectate) => {
              setShowDeployModal(false);
              handleJoinLobby(name, room, hero, mode, team, bots, spectate);
            }}
          />
          <button
            onClick={() => setShowDeployModal(false)}
            className="fixed top-4 left-4 z-50 px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs uppercase cursor-pointer backdrop-blur-md shadow-xl"
          >
            ← BACK TO COMMAND TERMINAL
          </button>
        </div>
      )}

      {/* Last Week Winners Modal (Displayed when player returns to game, closable) */}
      {showLastWeekWinners && (
        <LastWeekWinnersModal
          winners={leaderboardData.lastWeek}
          onClose={() => {
            setShowLastWeekWinners(false);
            sessionStorage.setItem('be_seen_last_week_v2', 'true');
          }}
        />
      )}

      {/* Mobile Landscape Orientation Guard & Auto-Prompt */}
      <OrientationGuard />
    </div>
  );
}
