import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  ClientMessage,
  ServerMessage,
  PlayerState,
  Bullet,
  Turret,
  SoundEcho,
  Pickup,
  KillEvent,
  StreakEvent,
  StreakType,
  AssistEvent,
  HeroId,
  GameWorldState,
  Wall,
  Bush,
  GameMode,
  TeamId,
  MapId,
  WeaponId,
  EffectId,
  SafeZoneState,
  MatchVoteState,
  ActiveGrenade,
} from './src/types/game';
import { HERO_DEFINITIONS, MAP_CONFIG, DEFAULT_PISTOL_STATS } from './src/game/constants';
import { generateMap } from './src/game/mapData';
import { CUSTOM_WEAPONS, SPECIAL_EFFECTS, TURRET_CONFIG } from './src/game/loadoutData';
import { resolveWallCollision, hasLineOfSight, angleDiff } from './src/game/raycast';
import { INITIAL_LEADERBOARD_DATA } from './src/game/leaderboardData';
import {
  getDatabaseStatus,
  getPlayerProfile,
  savePlayerProfile,
  updatePlayerTokens,
  getLeaderboard,
  recordMatchScore,
  SUPABASE_SQL_SCHEMA,
} from './server/db';

const app = express();
app.use(express.json());
const server = http.createServer(app);
const PORT = 3000;

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Database & Persistent Storage API
app.get('/api/database/status', (req, res) => {
  res.json(getDatabaseStatus());
});

app.get('/api/database/schema', (req, res) => {
  res.type('text/plain').send(SUPABASE_SQL_SCHEMA);
});

app.get('/api/player/:callsign', async (req, res) => {
  try {
    const profile = await getPlayerProfile(req.params.callsign);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/player/sync', async (req, res) => {
  try {
    const profile = await savePlayerProfile(req.body);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/player/tokens', async (req, res) => {
  try {
    const { callsign, deltaTokens } = req.body;
    const tokens = await updatePlayerTokens(callsign, deltaTokens || 0);
    res.json({ success: true, tokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (err: any) {
    res.json({ leaderboard: INITIAL_LEADERBOARD_DATA });
  }
});

app.post('/api/leaderboard/submit', async (req, res) => {
  try {
    const leaderboard = await recordMatchScore(req.body);
    res.json({ success: true, leaderboard });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms', (req, res) => {
  const sectorNames: Record<string, string> = {
    'ffa-public': 'SECTOR ALPHA (FFA)',
    'tdm-public': 'SECTOR BRAVO (TDM)',
    'br-public': 'SECTOR CHARLIE (BR)',
    'training-public': 'PROVING GROUNDS (SIM)',
  };

  const list = [];
  for (const [id, r] of rooms.entries()) {
    const humanCount = Object.values(r.players).filter((p) => !p.isBot).length;
    const isFull = humanCount >= r.maxCapacity;
    let sectorName = sectorNames[id];
    if (!sectorName) {
      if (id.startsWith('ffa-')) sectorName = `SECTOR ALPHA - ${id.split('-').pop()?.toUpperCase()}`;
      else if (id.startsWith('tdm-')) sectorName = `SECTOR BRAVO - ${id.split('-').pop()?.toUpperCase()}`;
      else if (id.startsWith('br-')) sectorName = `SECTOR CHARLIE - ${id.split('-').pop()?.toUpperCase()}`;
      else sectorName = `OUTPOST ${id.toUpperCase()}`;
    }

    list.push({
      id,
      name: sectorName,
      region: 'US-EAST',
      mode: r.gameMode,
      gameMode: r.gameMode,
      playerCount: humanCount,
      botCount: Object.values(r.players).filter((p) => p.isBot).length,
      maxPlayers: r.maxCapacity,
      maxCapacity: r.maxCapacity,
      isFull,
      mapId: r.mapId,
      status: humanCount > 0 ? 'in_progress' : 'waiting',
      spectatorCount: r.spectators.size,
    });
  }
  res.json({ rooms: list });
});

// Room Implementation
class GameRoom {
  public id: string;
  public gameMode: GameMode = 'ffa';
  public mapId: MapId = 'cyber-complex';
  public enableBots: boolean = false;
  public teamScores: { alpha: number; bravo: number } = { alpha: 0, bravo: 0 };
  public walls: Wall[];
  public bushes: Bush[];
  public pickups: Pickup[];
  public spawnPoints: { x: number; y: number }[];
  public players: Record<string, PlayerState> = {};
  public bullets: Bullet[] = [];
  public turrets: Turret[] = [];
  public grenades: ActiveGrenade[] = [];
  public soundEchoes: SoundEcho[] = [];
  public recentKills: KillEvent[] = [];
  public sockets: Map<string, WebSocket> = new Map();
  public spectators: Map<string, WebSocket> = new Map();
  public readonly maxCapacity: number = 10;
  public botIds: Set<string> = new Set();
  public safeZone?: SafeZoneState;
  public votingState: MatchVoteState = {
    isVoting: false,
    votingEndsAt: 0,
    mapVotes: {},
    modeVotes: {},
  };
  public matchStartedAt: number = Date.now();
  public matchDuration: number = 600 * 1000; // 10 minute FFA limit
  public isMatchEnded: boolean = false;
  public matchWinner: string = '';
  private damageHistory: Record<string, Record<string, { damage: number; timestamp: number }>> = {};
  private playerKillStreaks: Record<
    string,
    {
      lifeStreak: number;
      multiKill: number;
      lastKillTime: number;
    }
  > = {};
  private matchTotalKills: number = 0;
  private votingTimeout: NodeJS.Timeout | null = null;
  private lastTick: number = Date.now();
  private nextShootTimes: Record<string, number> = {};
  private nextBotAiTick: number = 0;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(id: string, gameMode: GameMode = 'ffa', enableBots: boolean = false, mapId: MapId = 'cyber-complex') {
    this.id = id;
    this.gameMode = gameMode;
    this.mapId = mapId;
    // Bots are strictly only available when players select training mode
    this.enableBots = (gameMode === 'training');
    const map = generateMap(mapId);
    this.walls = map.walls;
    this.bushes = map.bushes;
    this.pickups = map.pickups;
    this.spawnPoints = map.spawnPoints;

    if (this.gameMode === 'br') {
      this.initSafeZone();
    }

    // Seed room with tactical bots only if enableBots is true
    this.adjustBots();
    this.startGameLoop();
  }

  private initSafeZone() {
    this.safeZone = {
      centerX: MAP_CONFIG.width / 2,
      centerY: MAP_CONFIG.height / 2,
      radius: 1350,
      targetRadius: 1350,
      shrinkSpeed: 22,
      phase: 1,
      maxPhases: 5,
      nextShrinkTime: Date.now() + 25000,
      isShrinking: false,
      dps: 15,
    };
  }

  public addPlayer(
    ws: WebSocket,
    id: string,
    name: string,
    heroId: HeroId,
    preferredTeam?: TeamId,
    weaponId?: WeaponId,
    effectId?: EffectId,
    turretCount?: number
  ) {
    this.sockets.set(id, ws);
    const spawn = this.getRandomSpawn();
    const hero = HERO_DEFINITIONS[heroId] || HERO_DEFINITIONS.stalker;
    const customWeapon = weaponId && CUSTOM_WEAPONS[weaponId] ? CUSTOM_WEAPONS[weaponId] : null;

    let assignedTeam: TeamId | undefined = undefined;
    if (this.gameMode === 'tdm') {
      if (preferredTeam === 'alpha' || preferredTeam === 'bravo') {
        assignedTeam = preferredTeam;
      } else {
        const alphaCount = Object.values(this.players).filter((p) => p.team === 'alpha').length;
        const bravoCount = Object.values(this.players).filter((p) => p.team === 'bravo').length;
        assignedTeam = alphaCount <= bravoCount ? 'alpha' : 'bravo';
      }
    }

    const playerMaxAmmo = customWeapon ? customWeapon.maxAmmo : hero.maxAmmo;

    const player: PlayerState = {
      id,
      name: name.slice(0, 16) || 'Agent',
      heroId: hero.id,
      team: assignedTeam,
      x: spawn.x,
      y: spawn.y,
      angle: Math.random() * Math.PI * 2,
      vx: 0,
      vy: 0,
      hp: hero.maxHp,
      maxHp: hero.maxHp,
      armor: hero.maxArmor,
      maxArmor: hero.maxArmor,
      ammo: playerMaxAmmo,
      maxAmmo: playerMaxAmmo,
      isReloading: false,
      reloadEndsAt: 0,
      score: 0,
      kills: 0,
      assists: 0,
      deaths: 0,
      isAlive: true,
      respawnAt: 0,
      isBot: false,
      isShooting: false,
      targetPlayerId: null,
      abilityReadyAt: 0,
      abilityActive: null,
      isInBush: false,
      speedMultiplier: 1,
      damageMultiplier: 1,
      weaponId: weaponId || 'standard',
      effectId: effectId || 'neon_cyan',
      turretInventory: typeof turretCount === 'number' ? turretCount : 1,
      grenadeInventory: 1,
      isUsingPistol: false,
      primaryAmmo: playerMaxAmmo,
      maxPrimaryAmmo: playerMaxAmmo,
    };

    this.players[id] = player;
    this.adjustBots({ id, name, team: player.team });

    // When the very first human player enters an empty arena, position a few bots nearby for immediate action
    const humanCount = this.getHumanPlayerCount();
    if (humanCount === 1) {
      const nearbyBots = Array.from(this.botIds).map(bId => this.players[bId]).filter(Boolean);
      if (nearbyBots.length > 0) {
        const offsets = [
          { dx: 320, dy: -60 },
          { dx: 360, dy: 100 },
          { dx: -280, dy: 120 },
        ];
        for (let i = 0; i < Math.min(nearbyBots.length, offsets.length); i++) {
          const bot = nearbyBots[i];
          if (bot && bot.isAlive) {
            const resolved = resolveWallCollision(player.x + offsets[i].dx, player.y + offsets[i].dy, MAP_CONFIG.playerRadius, this.walls);
            bot.x = resolved.x;
            bot.y = resolved.y;
            bot.angle = Math.atan2(player.y - bot.y, player.x - bot.x);
            const bHero = HERO_DEFINITIONS[bot.heroId];
            bot.vx = Math.cos(bot.angle) * (bHero.speed * 0.7);
            bot.vy = Math.sin(bot.angle) * (bHero.speed * 0.7);
          }
        }
      }
    }

    // Send init packet
    const initMsg: ServerMessage = {
      type: 'init',
      playerId: id,
      world: this.getWorldState(),
      walls: this.walls,
      bushes: this.bushes,
      mapSize: { width: MAP_CONFIG.width, height: MAP_CONFIG.height },
      roomId: this.id,
      mapId: this.mapId,
      isSpectator: false,
      maxServerCapacity: this.maxCapacity,
      connectedPlayersCount: this.getHumanPlayerCount(),
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(initMsg));
    }
  }

  public getHumanPlayerCount(): number {
    return Object.values(this.players).filter((p) => !p.isBot).length;
  }

  public isFull(): boolean {
    return this.getHumanPlayerCount() >= this.maxCapacity;
  }

  public addSpectator(ws: WebSocket, id: string, name: string) {
    this.spectators.set(id, ws);

    const initMsg: ServerMessage = {
      type: 'init',
      playerId: id,
      world: this.getWorldState(),
      walls: this.walls,
      bushes: this.bushes,
      mapSize: { width: MAP_CONFIG.width, height: MAP_CONFIG.height },
      roomId: this.id,
      mapId: this.mapId,
      isSpectator: true,
      maxServerCapacity: this.maxCapacity,
      connectedPlayersCount: this.getHumanPlayerCount(),
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(initMsg));
    }
  }

  public removeSpectator(id: string) {
    this.spectators.delete(id);
  }

  public removePlayer(id: string) {
    this.sockets.delete(id);
    delete this.players[id];
    delete this.nextShootTimes[id];
    this.adjustBots();
  }

  public adjustBots(newPlayerJoining?: { id: string; name: string; team?: TeamId }) {
    const humanCount = Object.values(this.players).filter((p) => !p.isBot).length;

    // Condition 1: If there are NO humans in the room (and not in training mode), don't simulate idle bots
    if (humanCount === 0 && this.gameMode !== 'training') {
      if (this.botIds.size > 0) {
        for (const bId of this.botIds) {
          delete this.players[bId];
          delete this.nextShootTimes[bId];
        }
        this.botIds.clear();
      }
      return;
    }

    // Condition 2: Dynamic slot replacement:
    // Total combatants in match = targetMatchCapacity (6 combatants)
    // "If one user joins the match, only one bot is kicked out, the match continues"
    const maxCapacity = Math.min(this.maxCapacity, 6);
    const targetBots = this.gameMode === 'training'
      ? (this.enableBots ? Math.min(MAP_CONFIG.maxBots, 5) : 0)
      : Math.max(0, maxCapacity - humanCount);

    // If humanCount increased and we have more bots than targetBots,
    // remove ONLY the excess bots (i.e. exactly 1 bot kicked out per user joining)
    while (this.botIds.size > targetBots) {
      let chosenBotId: string | null = null;

      // In TDM mode: if a user joined a team, prioritize kicking a bot from that same team to keep teams balanced
      if (this.gameMode === 'tdm' && newPlayerJoining?.team) {
        // Check for dead bot on that team first
        for (const bId of this.botIds) {
          const b = this.players[bId];
          if (b && b.team === newPlayerJoining.team && !b.isAlive) {
            chosenBotId = bId;
            break;
          }
        }
        // Then any bot on that team
        if (!chosenBotId) {
          for (const bId of this.botIds) {
            const b = this.players[bId];
            if (b && b.team === newPlayerJoining.team) {
              chosenBotId = bId;
              break;
            }
          }
        }
      }

      // If still not chosen, prefer a bot that is currently dead or respawning so active gunfights aren't interrupted
      if (!chosenBotId) {
        for (const bId of this.botIds) {
          if (!this.players[bId]?.isAlive) {
            chosenBotId = bId;
            break;
          }
        }
      }

      // If all bots are alive, choose the bot furthest from any active human player
      if (!chosenBotId) {
        let maxDist = -1;
        const liveHumans = Object.values(this.players).filter((p) => !p.isBot && p.isAlive);
        for (const bId of this.botIds) {
          const bot = this.players[bId];
          if (!bot) continue;
          if (liveHumans.length === 0) {
            chosenBotId = bId;
            break;
          }
          const minDistToHuman = Math.min(
            ...liveHumans.map((h) => Math.hypot(h.x - bot.x, h.y - bot.y))
          );
          if (minDistToHuman > maxDist) {
            maxDist = minDistToHuman;
            chosenBotId = bId;
          }
        }
      }

      // Final fallback
      if (!chosenBotId) {
        chosenBotId = this.botIds.values().next().value;
      }

      if (chosenBotId) {
        const kickedBot = this.players[chosenBotId];
        const botName = kickedBot?.name || 'Bot';
        this.botIds.delete(chosenBotId);
        delete this.players[chosenBotId];
        delete this.nextShootTimes[chosenBotId];

        console.log(
          `[GameRoom ${this.id}] Real player "${newPlayerJoining?.name || 'User'}" joined. Exactly 1 bot (${botName}) kicked out. ${this.botIds.size} bots remaining. Match continues seamlessly.`
        );

        // Feed event notification: Player joined, bot stood down, match continues
        if (newPlayerJoining) {
          this.recentKills.unshift({
            killerId: newPlayerJoining.id,
            killerName: newPlayerJoining.name,
            killerHero: this.players[newPlayerJoining.id]?.heroId || 'assault',
            killerTeam: newPlayerJoining.team,
            killerWeapon: 'DEPLOYED // REPLACED',
            victimId: chosenBotId,
            victimName: botName,
            victimHero: kickedBot?.heroId || 'assault',
            victimTeam: kickedBot?.team,
            timestamp: Date.now(),
          });
          if (this.recentKills.length > 8) this.recentKills.pop();
        }
      }
    }

    // Pool of realistic, authentic gamer names
    const realisticGamerNames = [
      'Viper_99', 'GhostSniper', 'Kodiak_Ops', 'Shadow_X', 'ZeroTrace',
      'DeadShot_Pro', 'Havoc_Elite', 'CyberWolf', 'Talon_Actual', 'GrimReaper_7',
      'SilentEcho', 'PulseFire', 'Frostbite', 'NovaStrike', 'IronClad_9',
      'VoidRunner', 'ApexHunter', 'TitanSlayer', 'Phantom_Recon', 'RogueLeader',
      'BulletProof', 'NightShade', 'BlitzKrieg', 'CrossHair', 'StormSurge',
      'Alpha_One', 'Echo_Four', 'DeltaSniper', 'BravoSix', 'OmegaPrime',
      'Spectre_Ops', 'NeonViper', 'Hawkeye_99', 'RazorEdge', 'DarkMatter'
    ];
    const heroKeys: HeroId[] = ['sniper', 'shotgun', 'assault', 'marksman'];

    // Track existing names to ensure unique realistic names
    const usedNames = new Set(Object.values(this.players).map((p) => p.name.toLowerCase()));

    while (this.botIds.size < targetBots) {
      const bId = `bot-${Math.random().toString(36).substr(2, 6)}`;
      const hId = heroKeys[this.botIds.size % heroKeys.length];
      const hero = HERO_DEFINITIONS[hId];
      const spawn = this.getRandomSpawn();

      const availableNames = realisticGamerNames.filter((n) => !usedNames.has(n.toLowerCase()));
      const botName = availableNames.length > 0
        ? availableNames[Math.floor(Math.random() * availableNames.length)]
        : `Operative_${Math.floor(Math.random() * 900 + 100)}`;
      usedNames.add(botName.toLowerCase());

      let botTeam: TeamId | undefined = undefined;
      if (this.gameMode === 'tdm') {
        const alphaCount = Object.values(this.players).filter((p) => p.team === 'alpha').length;
        const bravoCount = Object.values(this.players).filter((p) => p.team === 'bravo').length;
        botTeam = alphaCount <= bravoCount ? 'alpha' : 'bravo';
      }

      const botPlayer: PlayerState = {
        id: bId,
        name: botName,
        heroId: hId,
        team: botTeam,
        x: spawn.x,
        y: spawn.y,
        angle: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
        hp: hero.maxHp,
        maxHp: hero.maxHp,
        armor: hero.maxArmor,
        maxArmor: hero.maxArmor,
        ammo: hero.maxAmmo,
        maxAmmo: hero.maxAmmo,
        isReloading: false,
        reloadEndsAt: 0,
        score: 0,
        kills: 0,
        assists: 0,
        deaths: 0,
        isAlive: true,
        respawnAt: 0,
        isBot: true,
        isShooting: false,
        targetPlayerId: null,
        abilityReadyAt: 0,
        abilityActive: null,
        isInBush: false,
        speedMultiplier: 1,
        damageMultiplier: 1,
      };

      this.botIds.add(bId);
      this.players[bId] = botPlayer;
    }
  }

  private getRandomSpawn(): { x: number; y: number } {
    const idx = Math.floor(Math.random() * this.spawnPoints.length);
    const pt = this.spawnPoints[idx] || { x: 400, y: 400 };
    return {
      x: pt.x + (Math.random() - 0.5) * 60,
      y: pt.y + (Math.random() - 0.5) * 60,
    };
  }

  public handleInput(id: string, moveX: number, moveY: number, angle: number, isSprint: boolean = false) {
    const p = this.players[id];
    if (!p || !p.isAlive) return;

    p.angle = angle;
    const hero = HERO_DEFINITIONS[p.heroId];
    let speed = hero.speed * p.speedMultiplier;
    if (isSprint) speed *= 1.15;
    if (p.isShooting) speed *= 0.65; // shooting slows down movement like in Bullet Echo

    // Normalize input vector
    const mag = Math.hypot(moveX, moveY);
    if (mag > 0.05) {
      p.vx = (moveX / mag) * speed;
      p.vy = (moveY / mag) * speed;
    } else {
      p.vx = 0;
      p.vy = 0;
    }
  }

  public handleHeroSelect(id: string, heroId: HeroId) {
    const p = this.players[id];
    if (!p) return;
    const hero = HERO_DEFINITIONS[heroId];
    if (!hero) return;

    p.heroId = heroId;
    p.maxHp = hero.maxHp;
    p.hp = Math.min(p.hp, hero.maxHp);
    p.maxArmor = hero.maxArmor;
    p.armor = Math.min(p.armor, hero.maxArmor);
    p.maxAmmo = hero.maxAmmo;
    p.ammo = hero.maxAmmo;
    p.isReloading = false;
    p.abilityActive = null;
  }

  public handleAbility(id: string) {
    const p = this.players[id];
    if (!p || !p.isAlive) return;
    const now = Date.now();
    if (now < p.abilityReadyAt) return;

    const hero = HERO_DEFINITIONS[p.heroId];
    p.abilityReadyAt = now + hero.abilityCooldown * 1000;

    if (hero.id === 'titan' || hero.id === 'bastion') {
      p.abilityActive = { type: 'shield', endsAt: now + hero.abilityDuration * 1000 };
    } else if (hero.id === 'stalker') {
      p.abilityActive = { type: 'camo', endsAt: now + hero.abilityDuration * 1000 };
    } else if (hero.id === 'valkyrie' || hero.id === 'raven' || hero.id === 'mirage') {
      p.abilityActive = { type: 'scan', endsAt: now + hero.abilityDuration * 1000 };
    } else if (hero.id === 'sparkle') {
      // Frag Grenade thrown in aim direction
      const grenadeRange = 260;
      const gx = p.x + Math.cos(p.angle) * grenadeRange;
      const gy = p.y + Math.sin(p.angle) * grenadeRange;
      setTimeout(() => {
        this.detonateExplosion(gx, gy, 140, 320, p.id);
      }, 1200);
    } else if (hero.id === 'firefly') {
      // Stinger proximity trap placed at current position
      const trapX = p.x;
      const trapY = p.y;
      setTimeout(() => {
        this.detonateExplosion(trapX, trapY, 110, 240, p.id);
      }, 2500);
    }

    // Sound echo for ability
    this.soundEchoes.push({
      id: `echo-${Math.random()}`,
      x: p.x,
      y: p.y,
      type: 'ability',
      sourcePlayerId: p.id,
      timestamp: now,
      radius: 350,
    });
  }

  public handleReload(id: string) {
    const p = this.players[id];
    if (!p || !p.isAlive || p.isReloading) return;
    const hero = HERO_DEFINITIONS[p.heroId];
    const customWeapon = p.weaponId && CUSTOM_WEAPONS[p.weaponId] ? CUSTOM_WEAPONS[p.weaponId] : null;
    const isPistol = Boolean(p.isUsingPistol);
    const maxAmmo = isPistol ? DEFAULT_PISTOL_STATS.maxAmmo : (customWeapon ? customWeapon.maxAmmo : hero.maxAmmo);
    const reloadTime = isPistol ? DEFAULT_PISTOL_STATS.reloadTime : (customWeapon ? customWeapon.reloadTime : hero.reloadTime);

    if (p.ammo >= maxAmmo) return;

    p.isReloading = true;
    p.reloadEndsAt = Date.now() + reloadTime * 1000;

    // Reload sound echo
    this.soundEchoes.push({
      id: `echo-${Math.random()}`,
      x: p.x,
      y: p.y,
      type: 'reload',
      sourcePlayerId: p.id,
      timestamp: Date.now(),
      radius: 260,
    });
  }

  public throwGrenade(id: string) {
    const p = this.players[id];
    if (!p || !p.isAlive) return;
    if ((p.grenadeInventory || 0) <= 0) return;

    p.grenadeInventory = (p.grenadeInventory || 0) - 1;

    const throwSpeed = 540;
    const grenade: ActiveGrenade = {
      id: `grenade-${Math.random().toString(36).substr(2, 7)}`,
      ownerId: p.id,
      ownerName: p.name,
      team: p.team,
      x: p.x + Math.cos(p.angle) * (MAP_CONFIG.playerRadius + 14),
      y: p.y + Math.sin(p.angle) * (MAP_CONFIG.playerRadius + 14),
      vx: Math.cos(p.angle) * throwSpeed,
      vy: Math.sin(p.angle) * throwSpeed,
      explodesAt: Date.now() + 1150,
      radius: 170,
      damage: 420,
    };

    this.grenades.push(grenade);

    this.soundEchoes.push({
      id: `echo-${Math.random()}`,
      x: p.x,
      y: p.y,
      type: 'ability',
      sourcePlayerId: p.id,
      timestamp: Date.now(),
      radius: 280,
    });
  }

  public toggleWeapon(id: string) {
    const p = this.players[id];
    if (!p || !p.isAlive) return;
    const hero = HERO_DEFINITIONS[p.heroId];

    p.isUsingPistol = !p.isUsingPistol;
    p.isReloading = false;
    if (p.isUsingPistol) {
      p.ammo = DEFAULT_PISTOL_STATS.maxAmmo;
      p.maxAmmo = DEFAULT_PISTOL_STATS.maxAmmo;
    } else {
      p.ammo = hero.maxAmmo;
      p.maxAmmo = hero.maxAmmo;
    }
  }

  public buyItem(id: string, itemId: string) {
    const p = this.players[id];
    if (!p || !p.isAlive) return;
    const hero = HERO_DEFINITIONS[p.heroId];

    if (itemId === 'grenades') {
      p.grenadeInventory = Math.min(4, (p.grenadeInventory || 0) + 2);
    } else if (itemId === 'turret') {
      p.turretInventory = Math.min(3, (p.turretInventory || 0) + 1);
    } else if (itemId === 'ammo') {
      p.isUsingPistol = false;
      p.ammo = hero.maxAmmo;
      p.maxAmmo = hero.maxAmmo;
      p.isReloading = false;
    } else if (itemId === 'armor') {
      p.armor = Math.min(p.maxArmor, p.armor + 300);
    } else if (itemId === 'health') {
      p.hp = Math.min(p.maxHp, p.hp + 350);
    } else if (itemId === 'speed_stim') {
      p.speedMultiplier = 1.35;
      setTimeout(() => {
        if (this.players[id]) this.players[id].speedMultiplier = 1;
      }, 7000);
    }
  }

  public placeTurret(id: string) {
    const p = this.players[id];
    if (!p || !p.isAlive) return;
    if ((p.turretInventory || 0) <= 0) return;

    p.turretInventory = (p.turretInventory || 0) - 1;

    // Deploy turret slightly in front of player
    const dist = MAP_CONFIG.playerRadius + 28;
    const tx = p.x + Math.cos(p.angle) * dist;
    const ty = p.y + Math.sin(p.angle) * dist;
    const safePos = resolveWallCollision(tx, ty, 20, this.walls);

    const turret: Turret = {
      id: `turret-${Math.random().toString(36).substr(2, 7)}`,
      ownerId: p.id,
      team: p.team,
      x: safePos.x,
      y: safePos.y,
      angle: p.angle,
      hp: TURRET_CONFIG.hp,
      maxHp: TURRET_CONFIG.hp,
      targetPlayerId: null,
      lastFiredAt: 0,
    };

    this.turrets.push(turret);

    // Deployment sound echo
    this.soundEchoes.push({
      id: `echo-${Math.random()}`,
      x: safePos.x,
      y: safePos.y,
      type: 'ability',
      sourcePlayerId: p.id,
      timestamp: Date.now(),
      radius: 340,
    });
  }

  public equipLoadout(id: string, weaponId: WeaponId, effectId: EffectId) {
    const p = this.players[id];
    if (!p) return;
    p.weaponId = weaponId;
    p.effectId = effectId;
    const customWeapon = CUSTOM_WEAPONS[weaponId];
    if (customWeapon) {
      p.maxAmmo = customWeapon.maxAmmo;
      p.ammo = Math.min(p.ammo, customWeapon.maxAmmo);
    }
  }

  public addTurrets(id: string, count: number) {
    const p = this.players[id];
    if (!p) return;
    p.turretInventory = Math.min(TURRET_CONFIG.maxInventory, (p.turretInventory || 0) + count);
  }

  public handleVote(playerId: string, mapId?: MapId, gameMode?: GameMode) {
    if (!this.votingState.isVoting) return;
    if (mapId) {
      this.votingState.mapVotes[playerId] = mapId;
    }
    if (gameMode) {
      this.votingState.modeVotes[playerId] = gameMode;
    }
    this.broadcastWorld();
  }

  private detonateExplosion(x: number, y: number, radius: number, damage: number, attackerId: string) {
    const now = Date.now();
    this.soundEchoes.push({
      id: `echo-${Math.random()}`,
      x,
      y,
      type: 'gunfire',
      sourcePlayerId: attackerId,
      timestamp: now,
      radius: 650,
    });

    for (const pId in this.players) {
      const p = this.players[pId];
      if (!p.isAlive) continue;
      if (p.id === attackerId) continue; // NEVER damage oneself!
      const attacker = this.players[attackerId];
      if (this.gameMode === 'tdm' && attacker?.team && p.team === attacker.team) continue; // No friendly fire!

      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist <= radius) {
        this.damagePlayer(p, damage * (1 - dist / radius * 0.4), attackerId);
      }
    }

    for (const t of this.turrets) {
      if (t.hp <= 0) continue;
      const attacker = this.players[attackerId];
      if (this.gameMode === 'tdm' && attacker?.team && t.team === attacker.team) continue;
      const dist = Math.hypot(t.x - x, t.y - y);
      if (dist <= radius) {
        t.hp -= damage * (1 - dist / radius * 0.4);
      }
    }
  }

  private updateGrenades(dt: number, now: number) {
    if (!this.grenades) this.grenades = [];
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.vx *= 0.94;
      g.vy *= 0.94;

      // Bounce off walls
      for (const w of this.walls) {
        if (
          g.x >= w.x - 8 &&
          g.x <= w.x + w.width + 8 &&
          g.y >= w.y - 8 &&
          g.y <= w.y + w.height + 8
        ) {
          g.vx = -g.vx * 0.5;
          g.vy = -g.vy * 0.5;
          break;
        }
      }

      if (now >= g.explodesAt) {
        this.detonateExplosion(g.x, g.y, g.radius, g.damage, g.ownerId);
        this.grenades.splice(i, 1);
      }
    }
  }

  private startGameLoop() {
    this.intervalId = setInterval(() => {
      this.tick();
    }, 40); // 25 updates/sec
  }

  public stop() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  private tick() {
    const now = Date.now();
    const dt = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // 1. Update AI bots
    if (now > this.nextBotAiTick) {
      this.updateBotAi();
      this.nextBotAiTick = now + 120; // 8 times/sec AI updates
    }

    // 2. Update players (movement, abilities, reload)
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.isAlive) {
        // In BR mode, eliminated players cannot respawn
        if (this.gameMode === 'br') {
          p.respawnAt = 0;
          continue;
        }

        // In FFA mode, players respawn until the 10 minute mark
        if (this.gameMode === 'ffa' && now >= this.matchStartedAt + this.matchDuration) {
          p.respawnAt = 0;
          continue;
        }

        if (p.respawnAt > 0 && now >= p.respawnAt) {
          // Respawn player
          const spawn = this.getRandomSpawn();
          const hero = HERO_DEFINITIONS[p.heroId];
          const customWeapon = p.weaponId && CUSTOM_WEAPONS[p.weaponId] ? CUSTOM_WEAPONS[p.weaponId] : null;
          p.x = spawn.x;
          p.y = spawn.y;
          p.hp = hero.maxHp;
          p.armor = hero.maxArmor;
          p.ammo = customWeapon ? customWeapon.maxAmmo : hero.maxAmmo;
          p.isAlive = true;
          p.isReloading = false;
          p.respawnAt = 0;
          p.abilityActive = null;
        }
        continue;
      }

      // Check ability expiration
      if (p.abilityActive && now >= p.abilityActive.endsAt) {
        p.abilityActive = null;
      }

      // Check reload completion
      if (p.isReloading && now >= p.reloadEndsAt) {
        const hero = HERO_DEFINITIONS[p.heroId];
        const customWeapon = p.weaponId && CUSTOM_WEAPONS[p.weaponId] ? CUSTOM_WEAPONS[p.weaponId] : null;
        if (p.isUsingPistol) {
          p.ammo = DEFAULT_PISTOL_STATS.maxAmmo;
          p.maxAmmo = DEFAULT_PISTOL_STATS.maxAmmo;
        } else {
          p.ammo = customWeapon ? customWeapon.maxAmmo : hero.maxAmmo;
          p.maxAmmo = customWeapon ? customWeapon.maxAmmo : hero.maxAmmo;
        }
        p.isReloading = false;
      }

      // Apply movement
      if (p.vx !== 0 || p.vy !== 0) {
        const nx = p.x + p.vx * dt;
        const ny = p.y + p.vy * dt;
        const resolved = resolveWallCollision(nx, ny, MAP_CONFIG.playerRadius, this.walls);
        p.x = resolved.x;
        p.y = resolved.y;

        // Check footstep sound echo
        if (!p.abilityActive || p.abilityActive.type !== 'camo') {
          if (Math.random() < 0.1) {
            this.soundEchoes.push({
              id: `echo-${Math.random()}`,
              x: p.x,
              y: p.y,
              type: 'footstep',
              sourcePlayerId: p.id,
              timestamp: now,
              radius: MAP_CONFIG.echoSoundRadius,
            });
          }
        }
      }

      // Check bush camouflage
      p.isInBush = false;
      for (const b of this.bushes) {
        if (Math.hypot(p.x - b.x, p.y - b.y) <= b.radius) {
          p.isInBush = true;
          break;
        }
      }
    }

    // 3. CORE MECHANICS
    this.updateAutoFire(now);
    this.updateBullets(dt);
    this.updateTurrets(dt, now);
    this.updateGrenades(dt, now);
    this.updateSafeZone(dt, now);
    this.updatePickups(now);

    // 4. Prune old sound echoes
    this.soundEchoes = this.soundEchoes.filter((e) => now - e.timestamp < 1800);

    // 5. Check match win/time conditions
    this.checkMatchConditions(now);

    // 6. Broadcast state
    this.broadcastWorld();
  }

  // AI Bot decision making
  private updateBotAi() {
    const playerList = Object.values(this.players).filter((p) => p.isAlive);

    for (const bId of this.botIds) {
      const bot = this.players[bId];
      if (!bot || !bot.isAlive) continue;

      const hero = HERO_DEFINITIONS[bot.heroId];

      // Find nearest enemy (never target teammate in TDM)
      let nearestTarget: PlayerState | null = null;
      let nearestDist = 99999;

      for (const other of playerList) {
        if (other.id === bot.id) continue;
        if (this.gameMode === 'tdm' && bot.team && other.team === bot.team) continue;

        const dist = Math.hypot(other.x - bot.x, other.y - bot.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestTarget = other;
        }
      }

      if (nearestTarget && nearestDist < 1400) {
        // Aim directly at target
        const aimAngle = Math.atan2(nearestTarget.y - bot.y, nearestTarget.x - bot.x);
        bot.angle = aimAngle;

        // Tactical positioning: approach and engage
        const idealRange = hero.fireRange * 0.75;
        if (nearestDist > idealRange + 40) {
          // Approach
          bot.vx = Math.cos(aimAngle) * hero.speed;
          bot.vy = Math.sin(aimAngle) * hero.speed;
        } else if (nearestDist < idealRange - 50) {
          // Tactical retreat
          bot.vx = -Math.cos(aimAngle) * (hero.speed * 0.85);
          bot.vy = -Math.sin(aimAngle) * (hero.speed * 0.85);
        } else {
          // Tactical circle-strafe
          const strafeAngle = aimAngle + Math.PI / 2;
          bot.vx = Math.cos(strafeAngle) * (hero.speed * 0.75);
          bot.vy = Math.sin(strafeAngle) * (hero.speed * 0.75);
        }

        // Use ability when in combat
        if (Date.now() > bot.abilityReadyAt && Math.random() < 0.15) {
          this.handleAbility(bot.id);
        }
      } else {
        // Active roaming towards center or nearest pickup
        if (Math.random() < 0.1 || (bot.vx === 0 && bot.vy === 0)) {
          const targetX = MAP_CONFIG.width / 2 + (Math.random() - 0.5) * 800;
          const targetY = MAP_CONFIG.height / 2 + (Math.random() - 0.5) * 800;
          const roamAngle = Math.atan2(targetY - bot.y, targetX - bot.x) + (Math.random() - 0.5) * 0.6;
          bot.angle = roamAngle;
          bot.vx = Math.cos(roamAngle) * (hero.speed * 0.75);
          bot.vy = Math.sin(roamAngle) * (hero.speed * 0.75);
        }
      }
    }
  }

  // Core Auto-Fire Logic (Signature mechanic of Bullet Echo)
  private updateAutoFire(now: number) {
    const alivePlayers = Object.values(this.players).filter((p) => p.isAlive);

    for (const shooter of alivePlayers) {
      const hero = HERO_DEFINITIONS[shooter.heroId];
      const customWeapon = shooter.weaponId && CUSTOM_WEAPONS[shooter.weaponId] ? CUSTOM_WEAPONS[shooter.weaponId] : null;
      const effectiveRange = customWeapon ? customWeapon.fireRange : hero.fireRange;
      const effectiveRate = customWeapon ? customWeapon.fireRate : hero.fireRate;

      let foundTarget: PlayerState | null = null;
      let closestTargetDist = effectiveRange;

      // Scan all potential targets
      for (const target of alivePlayers) {
        if (target.id === shooter.id) continue;

        // In Team Deathmatch, teammates do not auto-fire at each other!
        if (this.gameMode === 'tdm' && shooter.team && target.team === shooter.team) continue;

        const dx = target.x - shooter.x;
        const dy = target.y - shooter.y;
        const dist = Math.hypot(dx, dy);

        // 1. Is target inside fire range?
        if (dist > effectiveRange) continue;

        // 2. Is target inside fire angle cone?
        const angleToTarget = Math.atan2(dy, dx);
        const diff = Math.abs(angleDiff(angleToTarget, shooter.angle));
        if (diff > hero.fireAngle / 2) continue;

        // 3. Does shooter have clear Line of Sight (no wall/crate obstruction)?
        if (!hasLineOfSight(shooter.x, shooter.y, target.x, target.y, this.walls)) continue;

        // 4. Check concealment (camo or bush hiding)
        if (target.abilityActive?.type === 'camo' && dist > 70 && !target.isShooting) continue;
        if (target.isInBush && !shooter.isInBush && !target.isShooting) continue;

        // Best target is closest
        if (dist < closestTargetDist) {
          closestTargetDist = dist;
          foundTarget = target;
        }
      }

      if (foundTarget) {
        shooter.isShooting = true;
        shooter.targetPlayerId = foundTarget.id;

        // Auto-fire triggers!
        if (!shooter.isReloading && shooter.ammo > 0) {
          const nextShootTime = this.nextShootTimes[shooter.id] || 0;
          if (now >= nextShootTime) {
            this.fireWeapon(shooter, foundTarget, now);
            const rate = shooter.isUsingPistol ? DEFAULT_PISTOL_STATS.fireRate : effectiveRate;
            const intervalMs = (1 / rate) * 1000;
            this.nextShootTimes[shooter.id] = now + intervalMs;
          }
        } else if (shooter.ammo <= 0 && !shooter.isReloading) {
          if (!shooter.isUsingPistol) {
            // Ammo ran out in combat: immediately fall back to tactical pistol
            shooter.isUsingPistol = true;
            shooter.ammo = DEFAULT_PISTOL_STATS.maxAmmo;
            shooter.maxAmmo = DEFAULT_PISTOL_STATS.maxAmmo;
            shooter.isReloading = false;
          } else {
            // Pistol ran out: tactical quick reload
            this.handleReload(shooter.id);
          }
        }
      } else {
        shooter.isShooting = false;
        shooter.targetPlayerId = null;
      }
    }
  }

  private fireWeapon(shooter: PlayerState, target: PlayerState, now: number) {
    const hero = HERO_DEFINITIONS[shooter.heroId];
    const weapon = shooter.weaponId && CUSTOM_WEAPONS[shooter.weaponId] ? CUSTOM_WEAPONS[shooter.weaponId] : null;
    const effect = shooter.effectId && SPECIAL_EFFECTS[shooter.effectId] ? SPECIAL_EFFECTS[shooter.effectId] : null;

    if (shooter.ammo <= 0) return;

    shooter.ammo -= 1;

    // Break camo upon shooting
    if (shooter.abilityActive?.type === 'camo') {
      shooter.abilityActive = null;
    }

    // Emit gunfire sound echo ripple
    this.soundEchoes.push({
      id: `echo-${Math.random()}`,
      x: shooter.x,
      y: shooter.y,
      type: 'gunfire',
      sourcePlayerId: shooter.id,
      timestamp: now,
      radius: MAP_CONFIG.echoSoundRadius * 1.3,
    });

    const baseAngle = Math.atan2(target.y - shooter.y, target.x - shooter.x);
    const isPistol = Boolean(shooter.isUsingPistol);
    const pellets = isPistol ? 1 : (weapon ? weapon.pellets : (hero.pellets || 1));
    const spreadAngle = isPistol ? DEFAULT_PISTOL_STATS.bulletSpread : (weapon ? weapon.bulletSpread : hero.bulletSpread);
    const bulletSpeed = isPistol ? DEFAULT_PISTOL_STATS.bulletSpeed : (weapon ? weapon.bulletSpeed : hero.bulletSpeed);
    const baseDamage = isPistol ? DEFAULT_PISTOL_STATS.bulletDamage : (weapon ? weapon.damage : hero.bulletDamage);
    const bulletColor = isPistol ? DEFAULT_PISTOL_STATS.color : (effect ? effect.color : (weapon ? weapon.color : hero.color));
    const maxDist = isPistol ? DEFAULT_PISTOL_STATS.fireRange : (weapon ? weapon.fireRange : hero.fireRange) * 1.05;

    for (let i = 0; i < pellets; i++) {
      const spread = (Math.random() - 0.5) * spreadAngle * 2;
      const bAngle = baseAngle + spread;

      const bullet: Bullet = {
        id: `b-${Math.random().toString(36).substr(2, 7)}`,
        shooterId: shooter.id,
        x: shooter.x + Math.cos(bAngle) * (MAP_CONFIG.playerRadius + 14),
        y: shooter.y + Math.sin(bAngle) * (MAP_CONFIG.playerRadius + 14),
        vx: Math.cos(bAngle) * bulletSpeed,
        vy: Math.sin(bAngle) * bulletSpeed,
        damage: baseDamage * shooter.damageMultiplier,
        distanceTraveled: 0,
        maxDistance: maxDist,
        heroId: hero.id,
        color: bulletColor,
        effectColor: effect?.glowColor || effect?.color,
        isExplosive: hero.id === 'firefly',
      };

      this.bullets.push(bullet);
    }
  }

  private updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const stepX = b.vx * dt;
      const stepY = b.vy * dt;
      const stepDist = Math.hypot(stepX, stepY);

      b.x += stepX;
      b.y += stepY;
      b.distanceTraveled += stepDist;

      // 1. Max range reached
      if (b.distanceTraveled >= b.maxDistance) {
        if (b.isExplosive) {
          this.detonateExplosion(b.x, b.y, 80, b.damage * 0.75, b.shooterId);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // 2. Wall collision check
      let hitWall = false;
      for (const w of this.walls) {
        if (b.x >= w.x && b.x <= w.x + w.width && b.y >= w.y && b.y <= w.y + w.height) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        if (b.isExplosive) {
          this.detonateExplosion(b.x, b.y, 80, b.damage * 0.75, b.shooterId);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // 3. Turret hit check
      let hitTarget = false;
      for (let tIdx = this.turrets.length - 1; tIdx >= 0; tIdx--) {
        const t = this.turrets[tIdx];
        if (t.ownerId === b.shooterId) continue;
        const shooter = this.players[b.shooterId];
        if (this.gameMode === 'tdm' && shooter?.team && t.team === shooter.team) continue;

        const dist = Math.hypot(t.x - b.x, t.y - b.y);
        if (dist <= 26) {
          hitTarget = true;
          t.hp -= b.damage;
          if (t.hp <= 0) {
            this.detonateExplosion(t.x, t.y, 70, 50, b.shooterId);
            this.turrets.splice(tIdx, 1);
          }
          break;
        }
      }

      if (hitTarget) {
        if (b.isExplosive) {
          this.detonateExplosion(b.x, b.y, 80, b.damage * 0.75, b.shooterId);
        }
        this.bullets.splice(i, 1);
        continue;
      }

      // 4. Player hit check
      let hitPlayer = false;
      for (const pId in this.players) {
        const p = this.players[pId];
        if (!p.isAlive || p.id === b.shooterId) continue;

        // In Team Deathmatch, friendly fire is disabled!
        const shooter = this.players[b.shooterId];
        if (this.gameMode === 'tdm' && shooter?.team && p.team === shooter.team) continue;

        const dist = Math.hypot(p.x - b.x, p.y - b.y);
        if (dist <= MAP_CONFIG.playerRadius + 4) {
          // Check if Bastion's frontal shield blocks the bullet
          if (p.abilityActive?.type === 'shield') {
            const bulletAngle = Math.atan2(b.vy, b.vx);
            const facingAngle = p.angle;
            const blockDiff = Math.abs(angleDiff(bulletAngle + Math.PI, facingAngle));
            if (blockDiff < Math.PI * 0.35) {
              hitPlayer = true;
              break;
            }
          }

          hitPlayer = true;
          this.damagePlayer(p, b.damage, b.shooterId);
          break;
        }
      }

      if (hitPlayer) {
        if (b.isExplosive) {
          this.detonateExplosion(b.x, b.y, 80, b.damage * 0.75, b.shooterId);
        }
        this.bullets.splice(i, 1);
      }
    }
  }

  private damagePlayer(victim: PlayerState, rawDamage: number, attackerId: string) {
    if (!victim.isAlive) return;

    // RULE: Players cannot damage or kill themselves in any game mode!
    if (victim.id === attackerId) return;

    const attacker = this.players[attackerId];

    // RULE: In Team Deathmatch, friendly fire is strictly disabled!
    if (this.gameMode === 'tdm' && attacker?.team && victim.team === attacker.team) return;

    let damage = Math.round(rawDamage);

    // Armor absorbs damage first (armor absorbs 60% of damage until depleted)
    if (victim.armor > 0) {
      const absorbed = Math.min(victim.armor, Math.round(damage * 0.6));
      victim.armor -= absorbed;
      damage -= absorbed;
    }

    victim.hp -= damage;

    // Track damage history for assist credit
    if (attacker) {
      if (!this.damageHistory[victim.id]) {
        this.damageHistory[victim.id] = {};
      }
      const prev = this.damageHistory[victim.id][attackerId] || { damage: 0, timestamp: Date.now() };
      this.damageHistory[victim.id][attackerId] = {
        damage: prev.damage + damage,
        timestamp: Date.now(),
      };
    }

    if (victim.hp <= 0) {
      const now = Date.now();
      victim.hp = 0;
      victim.isAlive = false;
      victim.deaths += 1;
      victim.isShooting = false;
      victim.targetPlayerId = null;

      if (this.gameMode === 'br') {
        victim.respawnAt = 0; // Battle Royale elimination
        const aliveRemaining = Object.values(this.players).filter((p) => p.isAlive).length;
        victim.brPlacement = aliveRemaining + 1;
      } else if (this.gameMode === 'ffa') {
        if (now < this.matchStartedAt + this.matchDuration) {
          victim.respawnAt = now + 4500;
        } else {
          victim.respawnAt = 0; // No respawn after 10 minutes
        }
      } else {
        victim.respawnAt = now + 4500;
      }

      // Kills: 10 points per kill + streak evaluation
      let isFirstBlood = false;
      let isShutdown = false;
      let currentKillStreak = 0;
      let currentMultiKill = 0;

      if (attacker) {
        attacker.kills += 1;
        attacker.score += 10;
        if (this.gameMode === 'tdm' && attacker.team) {
          this.teamScores[attacker.team] = (this.teamScores[attacker.team] || 0) + 10;
        }

        this.matchTotalKills += 1;
        isFirstBlood = this.matchTotalKills === 1;

        if (!this.playerKillStreaks[attacker.id]) {
          this.playerKillStreaks[attacker.id] = { lifeStreak: 0, multiKill: 0, lastKillTime: 0 };
        }
        const streakData = this.playerKillStreaks[attacker.id];
        streakData.lifeStreak += 1;
        currentKillStreak = streakData.lifeStreak;

        const timeSinceLastKill = now - streakData.lastKillTime;
        if (timeSinceLastKill <= 4500 && streakData.multiKill > 0) {
          streakData.multiKill += 1;
        } else {
          streakData.multiKill = 1;
        }
        streakData.lastKillTime = now;
        currentMultiKill = streakData.multiKill;

        attacker.killStreak = streakData.lifeStreak;
        attacker.multiKillCount = streakData.multiKill;

        // 1. First Blood announcement
        if (isFirstBlood) {
          attacker.score += 50;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-fb-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: 'first_blood',
              title: 'FIRST BLOOD!',
              subtitle: `${attacker.name} claimed the first kill in the sector!`,
              count: 1,
              bonusPoints: 50,
              isMultiKill: false,
              isLifeStreak: false,
              isShutdown: false,
              timestamp: now,
            },
          });
        }

        // 2. Rapid Multi-Kill announcement
        if (streakData.multiKill >= 2) {
          let sType: StreakType = 'double_kill';
          let sTitle = 'DOUBLE KILL!';
          let sSub = '2 rapid eliminations!';
          let bonus = 50;

          if (streakData.multiKill === 3) {
            sType = 'triple_kill';
            sTitle = 'TRIPLE KILL!';
            sSub = '3 rapid eliminations in quick succession!';
            bonus = 100;
          } else if (streakData.multiKill === 4) {
            sType = 'quad_kill';
            sTitle = 'QUADRA KILL!';
            sSub = '4 rapid eliminations! Devastating firepower!';
            bonus = 150;
          } else if (streakData.multiKill >= 5) {
            sType = 'mega_kill';
            sTitle = 'MEGA KILL!';
            sSub = `${streakData.multiKill} rapid eliminations! Unstoppable rampage!`;
            bonus = 250;
          }

          attacker.score += bonus;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-mk-${streakData.multiKill}-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: sType,
              title: sTitle,
              subtitle: sSub,
              count: streakData.multiKill,
              bonusPoints: bonus,
              isMultiKill: true,
              isLifeStreak: false,
              isShutdown: false,
              timestamp: now,
            },
          });
        }

        // 3. Life streak milestones (kills without dying)
        if (streakData.lifeStreak === 3) {
          attacker.score += 75;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-ls-3-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: 'killing_spree',
              title: 'KILLING SPREE!',
              subtitle: '3 eliminations without dying!',
              count: 3,
              bonusPoints: 75,
              isMultiKill: false,
              isLifeStreak: true,
              isShutdown: false,
              timestamp: now,
            },
          });
        } else if (streakData.lifeStreak === 5) {
          attacker.score += 150;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-ls-5-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: 'rampage',
              title: 'RAMPAGE!',
              subtitle: '5-kill unbroken streak! Total combat dominance!',
              count: 5,
              bonusPoints: 150,
              isMultiKill: false,
              isLifeStreak: true,
              isShutdown: false,
              timestamp: now,
            },
          });
        } else if (streakData.lifeStreak === 7) {
          attacker.score += 200;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-ls-7-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: 'dominating',
              title: 'DOMINATING!',
              subtitle: '7-kill streak! Area locked down!',
              count: 7,
              bonusPoints: 200,
              isMultiKill: false,
              isLifeStreak: true,
              isShutdown: false,
              timestamp: now,
            },
          });
        } else if (streakData.lifeStreak === 10) {
          attacker.score += 300;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-ls-10-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: 'unstoppable',
              title: 'UNSTOPPABLE!',
              subtitle: '10-kill streak! A lethal combat machine!',
              count: 10,
              bonusPoints: 300,
              isMultiKill: false,
              isLifeStreak: true,
              isShutdown: false,
              timestamp: now,
            },
          });
        } else if (streakData.lifeStreak === 15 || (streakData.lifeStreak > 15 && streakData.lifeStreak % 5 === 0)) {
          attacker.score += 500;
          this.broadcastMessage({
            type: 'streak',
            streak: {
              id: `streak-${now}-ls-15-${attacker.id}`,
              killerId: attacker.id,
              killerName: attacker.name,
              killerTeam: attacker.team,
              victimName: victim.name,
              streakType: 'godlike',
              title: 'GODLIKE!',
              subtitle: `${streakData.lifeStreak}-kill unbroken streak! Supreme arena champion!`,
              count: streakData.lifeStreak,
              bonusPoints: 500,
              isMultiKill: false,
              isLifeStreak: true,
              isShutdown: false,
              timestamp: now,
            },
          });
        }
      }

      // Check Shutdown if Victim had an active streak of 3+
      const victimStreak = this.playerKillStreaks[victim.id];
      if (victimStreak && victimStreak.lifeStreak >= 3 && attacker) {
        isShutdown = true;
        const endedStreak = victimStreak.lifeStreak;
        attacker.score += 100;
        this.broadcastMessage({
          type: 'streak',
          streak: {
            id: `streak-${now}-sd-${victim.id}`,
            killerId: attacker.id,
            killerName: attacker.name,
            killerTeam: attacker.team,
            victimName: victim.name,
            streakType: 'shutdown',
            title: 'SHUTDOWN!',
            subtitle: `${attacker.name} shut down ${victim.name}'s ${endedStreak}-kill streak!`,
            count: endedStreak,
            bonusPoints: 100,
            isMultiKill: false,
            isLifeStreak: false,
            isShutdown: true,
            timestamp: now,
          },
        });
      }

      // Reset Victim's streak on death
      if (victimStreak) {
        victimStreak.lifeStreak = 0;
        victimStreak.multiKill = 0;
      }
      victim.killStreak = 0;
      victim.multiKillCount = 0;

      // Assists: 5 points per assist for any other contributor
      const history = this.damageHistory[victim.id] || {};
      for (const aId in history) {
        if (aId !== attackerId && now - history[aId].timestamp < 9000 && history[aId].damage >= 25) {
          const assister = this.players[aId];
          if (assister) {
            assister.assists = (assister.assists || 0) + 1;
            assister.score += 5;
            if (this.gameMode === 'tdm' && assister.team) {
              this.teamScores[assister.team] = (this.teamScores[assister.team] || 0) + 5;
            }
            this.broadcastMessage({
              type: 'assist',
              assist: {
                assisterId: assister.id,
                assisterName: assister.name,
                assisterTeam: assister.team,
                victimName: victim.name,
                points: 5,
                timestamp: now,
              },
            });
          }
        }
      }
      delete this.damageHistory[victim.id];

      const killerHeroDef = attacker ? HERO_DEFINITIONS[attacker.heroId] : null;
      const killDist = attacker ? Math.round(Math.hypot(attacker.x - victim.x, attacker.y - victim.y)) : 0;

      const killEvent: KillEvent = {
        killerId: attacker?.id || 'unknown',
        killerName: attacker?.name || 'Hazard',
        killerHero: attacker?.heroId || 'stalker',
        killerTeam: attacker?.team,
        killerWeapon: killerHeroDef?.weaponName || 'Tactical Armament',
        killerHp: attacker ? Math.round(attacker.hp) : 0,
        killerMaxHp: killerHeroDef ? killerHeroDef.maxHp : 1000,
        killerArmor: attacker ? Math.round(attacker.armor) : 0,
        killerMaxArmor: killerHeroDef ? killerHeroDef.maxArmor : 500,
        distance: killDist,
        victimId: victim.id,
        victimName: victim.name,
        victimHero: victim.heroId,
        victimTeam: victim.team,
        killStreak: currentKillStreak,
        multiKill: currentMultiKill,
        isShutdown: isShutdown,
        timestamp: Date.now(),
      };

      this.recentKills.unshift(killEvent);
      if (this.recentKills.length > 8) this.recentKills.pop();

      // Floor ammo drops upon victim death
      this.pickups.push({
        id: `drop-ammo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'ammo',
        x: victim.x,
        y: victim.y,
        amount: 30,
      });

      // 40% chance of dropping strategic grenade or turret
      if (Math.random() < 0.4) {
        const itemType = Math.random() < 0.5 ? 'grenade' : 'turret';
        this.pickups.push({
          id: `drop-${itemType}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          type: itemType,
          x: victim.x + (Math.random() - 0.5) * 36,
          y: victim.y + (Math.random() - 0.5) * 36,
          amount: 1,
        });
      }

      // Broadcast kill message
      this.broadcastMessage({ type: 'kill', kill: killEvent });

      // Check Win Conditions
      if (this.gameMode === 'tdm') {
        if (this.teamScores.alpha >= 100) {
          this.endMatch('Squad Alpha');
        } else if (this.teamScores.bravo >= 100) {
          this.endMatch('Squad Bravo');
        }
      } else if (this.gameMode === 'br') {
        const aliveRemaining = Object.values(this.players).filter((p) => p.isAlive);
        if (aliveRemaining.length <= 1) {
          const winner = aliveRemaining[0];
          if (winner) {
            winner.brPlacement = 1;
            this.endMatch(winner.name);
          } else {
            this.endMatch('Sole Survivor');
          }
        }
      }
    }
  }

  private damagePlayerFromHazard(victim: PlayerState, rawDamage: number) {
    if (!victim.isAlive) return;

    let damage = Math.round(rawDamage);
    if (victim.armor > 0) {
      const absorbed = Math.min(victim.armor, Math.round(damage * 0.5));
      victim.armor -= absorbed;
      damage -= absorbed;
    }

    victim.hp -= damage;

    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.isAlive = false;
      victim.deaths += 1;
      victim.isShooting = false;
      victim.targetPlayerId = null;

      const victimStreak = this.playerKillStreaks[victim.id];
      if (victimStreak) {
        victimStreak.lifeStreak = 0;
        victimStreak.multiKill = 0;
      }
      victim.killStreak = 0;
      victim.multiKillCount = 0;

      if (this.gameMode === 'br') {
        victim.respawnAt = 0;
        const aliveRemaining = Object.values(this.players).filter((p) => p.isAlive).length;
        victim.brPlacement = aliveRemaining + 1;
      } else {
        victim.respawnAt = Date.now() + 4500;
      }

      const killEvent: KillEvent = {
        killerId: 'hazard-zone',
        killerName: 'The Storm Zone',
        killerHero: 'stalker',
        killerWeapon: 'Toxic Storm Hazard',
        killerHp: 0,
        killerMaxHp: 1000,
        killerArmor: 0,
        killerMaxArmor: 500,
        distance: 0,
        victimId: victim.id,
        victimName: victim.name,
        victimHero: victim.heroId,
        victimTeam: victim.team,
        timestamp: Date.now(),
      };

      this.recentKills.unshift(killEvent);
      if (this.recentKills.length > 8) this.recentKills.pop();
      this.broadcastMessage({ type: 'kill', kill: killEvent });

      if (this.gameMode === 'br') {
        const aliveRemaining = Object.values(this.players).filter((p) => p.isAlive);
        if (aliveRemaining.length <= 1) {
          const winner = aliveRemaining[0];
          if (winner) {
            winner.brPlacement = 1;
            this.endMatch(winner.name);
          } else {
            this.endMatch('The Storm Zone');
          }
        }
      }
    }
  }

  private updateTurrets(dt: number, now: number) {
    if (this.turrets.length === 0) return;
    const alivePlayers = Object.values(this.players).filter((p) => p.isAlive);

    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const turret = this.turrets[i];
      if (turret.hp <= 0) {
        this.turrets.splice(i, 1);
        continue;
      }

      // Find nearest enemy in range
      let nearestTarget: PlayerState | null = null;
      let nearestDist = TURRET_CONFIG.range;

      for (const p of alivePlayers) {
        if (p.id === turret.ownerId) continue;
        if (this.gameMode === 'tdm' && turret.team && p.team === turret.team) continue;

        const dist = Math.hypot(p.x - turret.x, p.y - turret.y);
        if (dist <= TURRET_CONFIG.range) {
          if (!hasLineOfSight(turret.x, turret.y, p.x, p.y, this.walls)) continue;
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestTarget = p;
          }
        }
      }

      if (nearestTarget) {
        turret.targetPlayerId = nearestTarget.id;
        const targetAngle = Math.atan2(nearestTarget.y - turret.y, nearestTarget.x - turret.x);
        turret.angle = targetAngle;

        // Fire turret weapon
        if (now - turret.lastFiredAt >= 1000 / TURRET_CONFIG.fireRate) {
          turret.lastFiredAt = now;
          const spread = (Math.random() - 0.5) * 0.08;
          const bAngle = turret.angle + spread;

          this.bullets.push({
            id: `tb-${Math.random().toString(36).substr(2, 7)}`,
            shooterId: turret.ownerId,
            x: turret.x + Math.cos(bAngle) * 24,
            y: turret.y + Math.sin(bAngle) * 24,
            vx: Math.cos(bAngle) * 880,
            vy: Math.sin(bAngle) * 880,
            damage: TURRET_CONFIG.damage,
            distanceTraveled: 0,
            maxDistance: TURRET_CONFIG.range,
            heroId: 'titan',
            color: '#f59e0b',
            effectColor: '#fbbf24',
          });

          this.soundEchoes.push({
            id: `echo-${Math.random()}`,
            x: turret.x,
            y: turret.y,
            type: 'gunfire',
            sourcePlayerId: turret.ownerId,
            timestamp: now,
            radius: MAP_CONFIG.echoSoundRadius * 1.1,
          });
        }
      } else {
        turret.targetPlayerId = null;
        turret.angle += dt * 0.8;
      }
    }
  }

  private updateSafeZone(dt: number, now: number) {
    if (this.gameMode !== 'br' || !this.safeZone) return;

    if (!this.safeZone.isShrinking && now >= this.safeZone.nextShrinkTime && this.safeZone.phase <= this.safeZone.maxPhases) {
      this.safeZone.isShrinking = true;
      const targetRadii = [1350, 950, 620, 360, 160, 60];
      this.safeZone.targetRadius = targetRadii[this.safeZone.phase] || 60;
    }

    if (this.safeZone.isShrinking) {
      if (this.safeZone.radius > this.safeZone.targetRadius) {
        this.safeZone.radius = Math.max(this.safeZone.targetRadius, this.safeZone.radius - this.safeZone.shrinkSpeed * dt);
      } else {
        this.safeZone.isShrinking = false;
        this.safeZone.phase += 1;
        this.safeZone.dps += 8;
        this.safeZone.nextShrinkTime = now + 22000;
      }
    }

    // Apply storm damage to any alive player outside the safe zone
    for (const pId in this.players) {
      const p = this.players[pId];
      if (!p.isAlive) continue;
      const dist = Math.hypot(p.x - this.safeZone.centerX, p.y - this.safeZone.centerY);
      if (dist > this.safeZone.radius) {
        this.damagePlayerFromHazard(p, this.safeZone.dps * dt);
      }
    }
  }

  private checkMatchConditions(now: number) {
    if (this.isMatchEnded) return;

    // FFA 10-minute time limit check
    if (this.gameMode === 'ffa') {
      if (now >= this.matchStartedAt + this.matchDuration) {
        const playerList = Object.values(this.players);
        playerList.sort((a, b) => b.score - a.score || b.kills - a.kills);
        const top = playerList[0];
        this.endMatch(top ? top.name : 'Match Concluded');
      }
    }
  }

  private endMatch(winnerName: string) {
    if (this.isMatchEnded) return;
    this.isMatchEnded = true;
    this.matchWinner = winnerName;

    const votingDuration = 15000;
    this.votingState = {
      isVoting: true,
      votingEndsAt: Date.now() + votingDuration,
      mapVotes: {},
      modeVotes: {},
    };

    // Calculate coin rewards and send match_ended message to each connected player
    for (const [pId, ws] of this.sockets.entries()) {
      const p = this.players[pId];
      if (!p || !ws || ws.readyState !== WebSocket.OPEN) continue;

      const isWinner =
        (this.gameMode === 'tdm' && p.team && winnerName.toLowerCase().includes(p.team)) ||
        p.name === winnerName ||
        (this.gameMode === 'br' && p.brPlacement === 1);

      const killsCoins = (p.kills || 0) * 10;
      const assistsCoins = (p.assists || 0) * 5;
      const bonusCoins = isWinner ? 80 : 35;
      const totalCoins = killsCoins + assistsCoins + bonusCoins;

      ws.send(
        JSON.stringify({
          type: 'match_ended',
          winner: winnerName,
          teamScores: this.teamScores,
          coinsAwarded: totalCoins,
          stats: {
            kills: p.kills,
            assists: p.assists,
            placement: p.brPlacement,
          },
        })
      );

      // Persist player tokens and tournament score to durable storage & Supabase
      if (!p.isBot) {
        updatePlayerTokens(p.name, totalCoins).catch(() => {});
        recordMatchScore({
          name: p.name,
          score: p.score,
          kills: p.kills,
          deaths: p.deaths,
          wins: isWinner ? 1 : 0,
          heroId: p.heroId,
        }).catch(() => {});
      }
    }

    if (this.votingTimeout) clearTimeout(this.votingTimeout);
    this.votingTimeout = setTimeout(() => {
      this.resolveVoteAndStartNextMatch();
    }, votingDuration);
  }

  private resolveVoteAndStartNextMatch() {
    // Tally map votes
    const mapTally: Record<string, number> = {};
    for (const v of Object.values(this.votingState.mapVotes)) {
      mapTally[v] = (mapTally[v] || 0) + 1;
    }
    let chosenMap: MapId = this.mapId;
    let maxMapVotes = -1;
    for (const [m, count] of Object.entries(mapTally)) {
      if (count > maxMapVotes) {
        maxMapVotes = count;
        chosenMap = m as MapId;
      }
    }

    // Tally mode votes
    const modeTally: Record<string, number> = {};
    for (const v of Object.values(this.votingState.modeVotes)) {
      modeTally[v] = (modeTally[v] || 0) + 1;
    }
    let chosenMode: GameMode = this.gameMode;
    let maxModeVotes = -1;
    for (const [m, count] of Object.entries(modeTally)) {
      if (count > maxModeVotes) {
        maxModeVotes = count;
        chosenMode = m as GameMode;
      }
    }

    this.startNewMatch(chosenMap, chosenMode);
  }

  public startNewMatch(mapId: MapId, gameMode: GameMode) {
    this.mapId = mapId;
    this.gameMode = gameMode;
    // Bots strictly restricted to training mode
    this.enableBots = (gameMode === 'training');
    this.adjustBots();
    this.playerKillStreaks = {};
    this.matchTotalKills = 0;
    this.isMatchEnded = false;
    this.matchWinner = null;
    this.matchStartedAt = Date.now();
    this.votingState = {
      isVoting: false,
      votingEndsAt: 0,
      mapVotes: {},
      modeVotes: {},
    };

    // Re-generate map data
    const mapData = generateMap(mapId);
    this.walls = mapData.walls;
    this.bushes = mapData.bushes;
    this.pickups = mapData.pickups;
    this.spawnPoints = mapData.spawnPoints;

    this.bullets = [];
    this.turrets = [];
    this.damageHistory = {};
    this.recentKills = [];
    this.teamScores = { alpha: 0, bravo: 0 };

    if (this.gameMode === 'br') {
      this.safeZone = {
        centerX: MAP_CONFIG.width / 2,
        centerY: MAP_CONFIG.height / 2,
        radius: 1350,
        targetRadius: 950,
        shrinkSpeed: 22,
        nextShrinkTime: Date.now() + 25000,
        phase: 1,
        maxPhases: 5,
        dps: 12,
        isShrinking: false,
      };
    } else {
      this.safeZone = undefined;
    }

    // Reset all players
    let alphaCount = 0;
    let bravoCount = 0;
    for (const pId in this.players) {
      const p = this.players[pId];
      const spawn = this.getRandomSpawn();
      const hero = HERO_DEFINITIONS[p.heroId] || HERO_DEFINITIONS.stalker;
      const customWeapon = p.weaponId && CUSTOM_WEAPONS[p.weaponId] ? CUSTOM_WEAPONS[p.weaponId] : null;

      if (this.gameMode === 'tdm') {
        if (!p.team) {
          p.team = alphaCount <= bravoCount ? 'alpha' : 'bravo';
        }
        if (p.team === 'alpha') alphaCount++;
        else bravoCount++;
      } else {
        p.team = undefined;
      }

      p.x = spawn.x;
      p.y = spawn.y;
      p.hp = hero.maxHp;
      p.maxHp = hero.maxHp;
      p.armor = hero.maxArmor;
      p.maxArmor = hero.maxArmor;
      p.ammo = customWeapon ? customWeapon.maxAmmo : hero.maxAmmo;
      p.maxAmmo = customWeapon ? customWeapon.maxAmmo : hero.maxAmmo;
      p.isAlive = true;
      p.isReloading = false;
      p.kills = 0;
      p.assists = 0;
      p.deaths = 0;
      p.score = 0;
      p.killStreak = 0;
      p.multiKillCount = 0;
      p.brPlacement = undefined;
      p.respawnAt = 0;
      p.abilityActive = null;
    }

    // Broadcast map transition
    this.broadcastMessage({
      type: 'map_transition',
      mapId: this.mapId,
      gameMode: this.gameMode,
      walls: this.walls,
      bushes: this.bushes,
    });

    this.broadcastWorld();
  }

  private updatePickups(now: number) {
    for (const p of this.pickups) {
      if (p.respawnTime && now < p.respawnTime) continue;

      for (const pId in this.players) {
        const player = this.players[pId];
        if (!player.isAlive) continue;

        const dist = Math.hypot(player.x - p.x, player.y - p.y);
        if (dist <= MAP_CONFIG.playerRadius + 16) {
          const hero = HERO_DEFINITIONS[player.heroId];
          let picked = false;

          if (p.type === 'health' && player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + p.amount);
            picked = true;
          } else if (p.type === 'armor' && player.armor < player.maxArmor) {
            player.armor = Math.min(player.maxArmor, player.armor + p.amount);
            picked = true;
          } else if (p.type === 'ammo') {
            player.isUsingPistol = false;
            player.ammo = hero.maxAmmo;
            player.maxAmmo = hero.maxAmmo;
            player.isReloading = false;
            picked = true;
          } else if (p.type === 'turret') {
            player.turretInventory = Math.min(3, (player.turretInventory || 0) + (p.amount || 1));
            picked = true;
          } else if (p.type === 'grenade') {
            player.grenadeInventory = Math.min(4, (player.grenadeInventory || 0) + (p.amount || 2));
            picked = true;
          } else if (p.type === 'speed_boost') {
            player.speedMultiplier = 1.35;
            setTimeout(() => {
              player.speedMultiplier = 1;
            }, 6000);
            picked = true;
          } else if (p.type === 'damage_boost') {
            player.damageMultiplier = 1.3;
            setTimeout(() => {
              player.damageMultiplier = 1;
            }, 6000);
            picked = true;
          }

          if (picked) {
            if (p.id.startsWith('drop-')) {
              const pIdx = this.pickups.indexOf(p);
              if (pIdx >= 0) this.pickups.splice(pIdx, 1);
            } else {
              p.respawnTime = now + 18000; // 18s pickup respawn
            }
            break;
          }
        }
      }
    }
  }

  public getWorldState(): GameWorldState {
    const now = Date.now();
    const timeRemaining = Math.max(0, Math.floor((this.matchStartedAt + this.matchDuration - now) / 1000));
    return {
      players: this.players,
      bullets: this.bullets,
      soundEchoes: this.soundEchoes,
      pickups: this.pickups.filter((p) => !p.respawnTime || now >= p.respawnTime),
      recentKills: this.recentKills,
      serverTime: now,
      gameMode: this.gameMode,
      teamScores: this.teamScores,
      enableBots: this.enableBots,
      mapId: this.mapId,
      safeZone: this.safeZone,
      turrets: this.turrets,
      grenades: this.grenades,
      votingState: this.votingState,
      matchEndsAt: this.matchStartedAt + this.matchDuration,
      matchTimeRemaining: timeRemaining,
      isMatchEnded: this.isMatchEnded,
      matchWinner: this.matchWinner,
      spectatorCount: this.spectators.size,
      maxServerCapacity: this.maxCapacity,
      connectedPlayersCount: this.getHumanPlayerCount(),
    };
  }

  private broadcastWorld() {
    const msg = JSON.stringify({
      type: 'world_update',
      world: this.getWorldState(),
    });

    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
    for (const ws of this.spectators.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    }
  }

  private broadcastMessage(msg: ServerMessage) {
    const str = JSON.stringify(msg);
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(str);
      }
    }
    for (const ws of this.spectators.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(str);
      }
    }
  }
}

// Global Room Registry & Mode-Based Server Load Balancer (Max 10 Players per Server)
const rooms: Map<string, GameRoom> = new Map();
const MAX_SERVER_CAPACITY = 10;

function findOrCreateServerForMode(
  gameMode: GameMode,
  preferSpectate: boolean = false
): GameRoom {
  const modeKey = gameMode || 'ffa';
  let serverIdx = 1;

  while (true) {
    const candidateId = `${modeKey}-${serverIdx}`;
    let room = rooms.get(candidateId);
    if (!room) {
      room = new GameRoom(candidateId, modeKey, modeKey === 'training');
      rooms.set(candidateId, room);
      return room;
    }

    if (preferSpectate) {
      return room;
    }

    // Capacity is strictly 10 players per server:
    // If the server has room (< 10 players), assign here!
    if (!room.isFull()) {
      return room;
    }

    // Server is full (10/10), check next server shard (${mode}-2, ${mode}-3, etc.)
    serverIdx++;
  }
}

function getOrCreateRoom(
  roomId: string = '',
  gameMode: GameMode = 'ffa',
  enableBots: boolean = false,
  isSpectator: boolean = false
): { room: GameRoom; wasFull: boolean } {
  const cleanId = roomId.trim().toLowerCase();
  const isDefaultRoom =
    !cleanId ||
    cleanId === 'public-arena' ||
    cleanId === 'auto' ||
    cleanId.startsWith(`${gameMode}-`);

  if (isDefaultRoom) {
    const room = findOrCreateServerForMode(gameMode, isSpectator);
    return { room, wasFull: false };
  }

  // Custom room requested (e.g. private squad code)
  let room = rooms.get(cleanId);
  let wasFull = false;
  if (!room) {
    room = new GameRoom(cleanId, gameMode, gameMode === 'training');
    rooms.set(cleanId, room);
  } else {
    if (room.isFull() && !isSpectator) {
      wasFull = true;
    }
  }
  return { room, wasFull };
}

// Pre-initialize initial server shards for standard modes
findOrCreateServerForMode('ffa');
findOrCreateServerForMode('tdm');
findOrCreateServerForMode('br');
findOrCreateServerForMode('training');

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = request.url || '/';
  const pathname = url.split('?')[0];
  // Route game websockets cleanly without colliding with Vite HMR
  if (pathname === '/ws' || pathname === '/' || (!pathname.includes('vite') && !pathname.includes('@vite'))) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  let currentRoom: GameRoom | null = null;
  let playerId: string = '';
  let isSpectatingClient: boolean = false;

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData.toString()) as ClientMessage;

      if (data.type === 'join') {
        const reqMode = data.gameMode || 'ffa';
        const wantsSpectate = Boolean(data.isSpectator);
        const { room, wasFull } = getOrCreateRoom(
          data.roomId,
          reqMode,
          reqMode === 'training',
          wantsSpectate
        );
        currentRoom = room;

        const actualSpectate = wantsSpectate || wasFull;
        if (actualSpectate) {
          isSpectatingClient = true;
          playerId = `spec-${Math.random().toString(36).substr(2, 8)}`;
          currentRoom.addSpectator(ws, playerId, data.name || 'Spectator');
        } else {
          isSpectatingClient = false;
          playerId = `p-${Math.random().toString(36).substr(2, 8)}`;
          currentRoom.addPlayer(
            ws,
            playerId,
            data.name,
            data.heroId,
            data.team,
            data.weaponId,
            data.effectId,
            data.turretCount
          );
        }
      } else if (data.type === 'toggle_bots' && currentRoom) {
        // Players should NOT be able to activate bots during the game.
        // Bots should only be available when players select training mode.
        if (currentRoom.gameMode === 'training') {
          currentRoom.enableBots = data.enableBots;
          currentRoom.adjustBots();
        } else {
          // Strictly reject bot activation during standard PvP matches
          currentRoom.enableBots = false;
          currentRoom.adjustBots();
        }
      } else if (data.type === 'set_game_mode') {
        // Game modes should NOT be changed during an active game!
        // Mode changes only happen via match-end voting or pre-match lobby.
        return;
      } else if (data.type === 'input' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.handleInput(playerId, data.moveX, data.moveY, data.angle, data.isSprint);
      } else if (data.type === 'select_hero' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.handleHeroSelect(playerId, data.heroId);
      } else if (data.type === 'use_ability' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.handleAbility(playerId);
      } else if (data.type === 'reload' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.handleReload(playerId);
      } else if (data.type === 'place_turret' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.placeTurret(playerId);
      } else if (data.type === 'cast_vote' && currentRoom && playerId) {
        currentRoom.handleVote(playerId, data.mapId, data.gameMode);
      } else if (data.type === 'equip_loadout' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.equipLoadout(playerId, data.weaponId, data.effectId);
      } else if (data.type === 'add_turrets' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.addTurrets(playerId, data.count);
      } else if (data.type === 'throw_grenade' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.throwGrenade(playerId);
      } else if (data.type === 'toggle_weapon' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.toggleWeapon(playerId);
      } else if (data.type === 'buy_item' && currentRoom && playerId && !isSpectatingClient) {
        currentRoom.buyItem(playerId, data.itemId);
      } else if (data.type === 'ping' && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pong', clientTime: data.clientTime, serverTime: Date.now() }));
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && playerId) {
      if (isSpectatingClient) {
        currentRoom.removeSpectator(playerId);
      } else {
        currentRoom.removePlayer(playerId);
      }
    }
  });
});

// Vite & Static Asset Handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Omega Killzone Zero Tactical Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
