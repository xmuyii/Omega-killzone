export type HeroId =
  | 'sniper'
  | 'shotgun'
  | 'assault'
  | 'marksman'
  | 'titan'
  | 'stalker'
  | 'valkyrie'
  | 'bastion'
  | 'mirage'
  | 'sparkle'
  | 'firefly'
  | 'raven';

export type GameMode = 'ffa' | 'tdm' | 'br' | 'training';
export type TeamId = 'alpha' | 'bravo';
export type MapId = 'cyber-complex' | 'bunker-9' | 'neon-slums' | 'desert-outpost';

export type StreakType =
  | 'double_kill'
  | 'triple_kill'
  | 'quad_kill'
  | 'mega_kill'
  | 'killing_spree'
  | 'rampage'
  | 'dominating'
  | 'unstoppable'
  | 'godlike'
  | 'shutdown'
  | 'first_blood';

export interface StreakEvent {
  id: string;
  killerId: string;
  killerName: string;
  killerTeam?: TeamId;
  victimName: string;
  streakType: StreakType;
  title: string;
  subtitle: string;
  count: number;
  bonusPoints: number;
  isMultiKill: boolean;
  isLifeStreak: boolean;
  isShutdown: boolean;
  timestamp: number;
}

export type WeaponId =
  | 'standard'
  | 'ar15_elite'
  | 'dual_smg'
  | 'dragonfire_shotgun'
  | 'plasma_carbine'
  | 'void_railgun'
  | 'arc_blaster';

export type EffectId = 'neon_cyan' | 'crimson_blood' | 'void_purple' | 'golden_royale';

export interface CustomWeaponDef {
  id: WeaponId;
  name: string;
  category: string;
  cost: number;
  damage: number;
  fireRate: number;
  fireRange: number;
  bulletSpeed: number;
  bulletSpread: number;
  pellets: number;
  maxAmmo: number;
  reloadTime: number;
  color: string;
  description: string;
}

export interface CustomEffectDef {
  id: EffectId;
  name: string;
  cost: number;
  color: string;
  glowColor: string;
  description: string;
}

export interface SafeZoneState {
  centerX: number;
  centerY: number;
  radius: number;
  targetRadius: number;
  shrinkSpeed: number;
  phase: number;
  maxPhases: number;
  nextShrinkTime: number;
  isShrinking: boolean;
  dps: number;
}

export type SafeZone = SafeZoneState;

export interface Turret {
  id: string;
  ownerId: string;
  ownerName?: string;
  team?: TeamId;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  targetPlayerId: string | null;
  lastFiredAt: number;
}

export interface MatchVoteState {
  isVoting: boolean;
  votingEndsAt: number;
  mapVotes: Record<string, MapId>;
  modeVotes: Record<string, GameMode>;
  winnerMap?: MapId;
  winnerMode?: GameMode;
}

export type VotingState = MatchVoteState;

export interface AssistEvent {
  assisterId: string;
  assisterName: string;
  assisterTeam?: TeamId;
  victimName: string;
  points: number;
  timestamp: number;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  role: 'Assault' | 'Tank' | 'Sniper' | 'Shotgun' | 'Artillery' | 'Recon';
  description: string;
  color: string;
  accentColor: string;
  maxHp: number;
  maxArmor: number;
  speed: number;
  // Weapon stats
  weaponName: string;
  fireRange: number;        // in pixels
  fireAngle: number;        // in radians (cone width)
  bulletDamage: number;
  bulletSpeed: number;
  fireRate: number;         // rounds per second
  burstCount: number;       // shots per burst
  burstDelay: number;       // delay between bursts in ms
  bulletSpread: number;     // inaccuracy in radians
  pellets: number;          // pellets per shot (e.g. shotgun)
  maxAmmo: number;
  reloadTime: number;       // in seconds
  // Ability
  abilityName: string;
  abilityIcon: string;
  abilityDescription: string;
  abilityCooldown: number;  // in seconds
  abilityDuration: number;  // in seconds (0 if instant)
}

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'crate' | 'pillar';
}

export interface Bush {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export type PickupType = 'health' | 'armor' | 'ammo' | 'speed_boost' | 'damage_boost' | 'turret' | 'grenade';

export interface Pickup {
  id: string;
  type: PickupType;
  x: number;
  y: number;
  amount: number;
  respawnTime?: number;
}

export interface ActiveGrenade {
  id: string;
  ownerId: string;
  ownerName?: string;
  team?: TeamId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  explodesAt: number;
  radius: number;
  damage: number;
}

export interface SoundEcho {
  id: string;
  x: number;
  y: number;
  type: 'footstep' | 'gunfire' | 'reload' | 'ability';
  sourcePlayerId: string;
  timestamp: number;
  radius: number;
  angle?: number;
}

export interface Bullet {
  id: string;
  shooterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  distanceTraveled: number;
  maxDistance: number;
  heroId: HeroId;
  color: string;
  isExplosive?: boolean;
  isTurret?: boolean;
  effectColor?: string;
}

export interface ActiveAbility {
  type: 'camo' | 'shield' | 'scan' | 'leap';
  endsAt: number;
  value?: number;
}

export interface PlayerState {
  id: string;
  name: string;
  heroId: HeroId;
  team?: TeamId;
  x: number;
  y: number;
  angle: number;           // Facing / aiming angle in radians
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadEndsAt: number;
  score: number;
  kills: number;
  assists: number;
  deaths: number;
  isAlive: boolean;
  respawnAt: number;
  isBot: boolean;
  isShooting: boolean;
  targetPlayerId: string | null;
  // Ability state
  abilityReadyAt: number;
  abilityActive: ActiveAbility | null;
  isInBush: boolean;
  speedMultiplier: number;
  damageMultiplier: number;
  ping?: number;
  // Killstreak state
  killStreak?: number;
  multiKillCount?: number;
  // Weapon loadout & Turrets
  weaponId?: WeaponId;
  effectId?: EffectId;
  turretInventory?: number;
  grenadeInventory?: number;
  isUsingPistol?: boolean;
  primaryAmmo?: number;
  maxPrimaryAmmo?: number;
  brPlacement?: number;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  killerHero: HeroId;
  killerTeam?: TeamId;
  killerWeapon?: string;
  killerHp?: number;
  killerMaxHp?: number;
  killerArmor?: number;
  killerMaxArmor?: number;
  distance?: number;
  victimId: string;
  victimName: string;
  victimHero: HeroId;
  victimTeam?: TeamId;
  killStreak?: number;
  multiKill?: number;
  isShutdown?: boolean;
  timestamp: number;
}

export interface GameWorldState {
  players: Record<string, PlayerState>;
  bullets: Bullet[];
  turrets: Turret[];
  grenades?: ActiveGrenade[];
  soundEchoes: SoundEcho[];
  pickups: Pickup[];
  recentKills: KillEvent[];
  serverTime: number;
  gameMode?: GameMode;
  mapId?: MapId;
  teamScores?: { alpha: number; bravo: number };
  enableBots?: boolean;
  safeZone?: SafeZoneState;
  votingState?: MatchVoteState;
  matchEndsAt?: number;
  matchTimeRemaining?: number;
  isMatchEnded?: boolean;
  matchWinner?: string;
  spectatorCount?: number;
  maxServerCapacity?: number;
  connectedPlayersCount?: number;
}

export type ClientMessage =
  | {
      type: 'join';
      name: string;
      heroId: HeroId;
      roomId?: string;
      gameMode?: GameMode;
      team?: TeamId;
      enableBots?: boolean;
      weaponId?: WeaponId;
      effectId?: EffectId;
      turretCount?: number;
      isSpectator?: boolean;
    }
  | { type: 'select_hero'; heroId: HeroId }
  | { type: 'input'; moveX: number; moveY: number; angle: number; isSprint?: boolean }
  | { type: 'use_ability' }
  | { type: 'reload' }
  | { type: 'place_turret' }
  | { type: 'throw_grenade' }
  | { type: 'toggle_weapon' }
  | { type: 'buy_item'; itemId: string }
  | { type: 'cast_vote'; mapId?: MapId; gameMode?: GameMode }
  | { type: 'equip_loadout'; weaponId: WeaponId; effectId: EffectId }
  | { type: 'add_turrets'; count: number }
  | { type: 'toggle_bots'; enableBots: boolean }
  | { type: 'set_game_mode'; gameMode: GameMode }
  | { type: 'ping'; clientTime: number };

export type ServerMessage =
  | {
      type: 'init';
      playerId: string;
      world: GameWorldState;
      walls: Wall[];
      bushes: Bush[];
      mapSize: { width: number; height: number };
      roomId: string;
      mapId?: MapId;
      isSpectator?: boolean;
      maxServerCapacity?: number;
      connectedPlayersCount?: number;
    }
  | { type: 'world_update'; world: GameWorldState }
  | { type: 'pong'; clientTime: number; serverTime: number }
  | { type: 'player_joined'; player: PlayerState }
  | { type: 'player_left'; playerId: string }
  | { type: 'kill'; kill: KillEvent }
  | { type: 'streak'; streak: StreakEvent }
  | { type: 'assist'; assist: AssistEvent }
  | { type: 'sound_echo'; echo: SoundEcho }
  | {
      type: 'match_ended';
      winner: string;
      teamScores?: { alpha: number; bravo: number };
      coinsAwarded: number;
      stats: { kills: number; assists: number; placement?: number };
    }
  | {
      type: 'map_transition';
      mapId: MapId;
      gameMode: GameMode;
      walls: Wall[];
      bushes: Bush[];
    };

export interface LeaderboardEntry {
  id: string;
  name: string;
  heroId: HeroId;
  kills: number;
  deaths: number;
  wins: number;
  score: number;
  rank: number;
  kd: string;
  badge?: string;
  title?: string;
  lastActive?: string;
}

export interface LeaderboardData {
  daily: LeaderboardEntry[];
  thisWeek: LeaderboardEntry[];
  lastWeek: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
}

export type LeaderboardTab = 'daily' | 'thisWeek' | 'lastWeek' | 'allTime';

export interface ServerRoomInfo {
  id: string;
  name: string;
  region: string;
  mode: GameMode;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'in_progress' | 'waiting';
}

