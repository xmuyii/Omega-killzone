import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaderboardData, LeaderboardEntry, HeroId, MmoSectorLiveState, MmoCommanderOccupant, MmoBounty } from '../src/types/game';
import { INITIAL_LEADERBOARD_DATA } from '../src/game/leaderboardData';

export interface PlayerProfile {
  callsign: string;
  tokens: number;
  kills: number;
  deaths: number;
  wins: number;
  matches: number;
  highScore: number;
  unlockedItems: string[];
  equippedHero: HeroId;
  updatedAt: number;
  // Synced from persistent MMO 'players' table:
  mmoUserId?: string;
  mmoBaseName?: string;
  mmoBaseHqLevel?: number;
  mmoTotalPower?: number;
  mmoPowerTier?: string;
  mmoWarPoints?: number;
  mmoSector?: number;
  mmoHomeSector?: number;
  mmoAllianceId?: string;
  mmoGold?: number;
  mmoCredits?: number;
  mmoEnergy?: number;
  mmoIsBountyHunter?: boolean;
  teleportCharges?: number;
  bountyTimeoutUntil?: number;
}

// Database directory & persistent backup files for local/standalone hosting (e.g. Railway without Supabase)
const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILES_FILE = path.join(DATA_DIR, 'player_profiles.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Could not create data directory:', err);
  }
}

// Supabase lazy client
let supabaseClient: SupabaseClient | null = null;
let isSupabaseConfigured = false;

export function getSupabaseKeyInfo(): { key: string | undefined; keyType: 'service_role' | 'anon' | 'custom' | 'none' } {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { key: process.env.SUPABASE_SERVICE_ROLE_KEY, keyType: 'service_role' };
  }
  if (process.env.SUPABASE_KEY) {
    return { key: process.env.SUPABASE_KEY, keyType: 'custom' };
  }
  if (process.env.SUPABASE_ANON_KEY) {
    return { key: process.env.SUPABASE_ANON_KEY, keyType: 'anon' };
  }
  return { key: undefined, keyType: 'none' };
}

export function initSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const { key, keyType } = getSupabaseKeyInfo();

  if (url && key) {
    if (!supabaseClient) {
      try {
        supabaseClient = createClient(url, key, {
          auth: { persistSession: false },
        });
        isSupabaseConfigured = true;
        console.log(`[Database] Supabase client initialized with ${keyType.toUpperCase()} key.`);
      } catch (err) {
        console.error('[Database] Failed to initialize Supabase client:', err);
      }
    }
  } else {
    isSupabaseConfigured = false;
  }
  return supabaseClient;
}

// In-memory caches for high-performance tick access
let playerProfilesCache: Map<string, PlayerProfile> = new Map();
let leaderboardCache: LeaderboardData = JSON.parse(JSON.stringify(INITIAL_LEADERBOARD_DATA));

// Load initial persistent disk cache
function loadDiskCache() {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf-8'));
      for (const [key, val] of Object.entries(data)) {
        playerProfilesCache.set(key.toLowerCase(), val as PlayerProfile);
      }
      console.log(`[Database] Loaded ${playerProfilesCache.size} player profiles from persistent storage.`);
    }
  } catch (err) {
    console.warn('[Database] Could not load profiles from disk:', err);
  }

  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      leaderboardCache = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
      console.log('[Database] Loaded tournament leaderboards from persistent storage.');
    }
  } catch (err) {
    console.warn('[Database] Could not load leaderboard from disk:', err);
  }
}

loadDiskCache();

// Flush profiles to persistent file
function persistProfilesToDisk() {
  try {
    const obj: Record<string, PlayerProfile> = {};
    for (const [key, val] of playerProfilesCache.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to write profiles to disk:', err);
  }
}

// Flush leaderboard to persistent file
function persistLeaderboardToDisk() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(leaderboardCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Failed to write leaderboard to disk:', err);
  }
}

export function getDatabaseStatus() {
  const sb = initSupabase();
  const { keyType } = getSupabaseKeyInfo();
  return {
    provider: sb ? 'supabase' : 'local_persistent',
    isSupabaseConnected: !!sb,
    supabaseUrl: process.env.SUPABASE_URL ? 'Configured' : 'Not Set',
    keyType: sb ? keyType : 'none',
    keyTypeDescription: keyType === 'service_role'
      ? 'Service Role Key (Secret Admin - Full Server Bypass for Node.js Backend)'
      : keyType === 'anon'
      ? 'Anon Key (Public - Uses RLS Policies)'
      : keyType === 'custom'
      ? 'Custom Key (SUPABASE_KEY)'
      : 'None (Local persistent storage active)',
    cachedProfilesCount: playerProfilesCache.size,
    leaderboardEntriesCount: {
      thisWeek: leaderboardCache.thisWeek?.length || 0,
      allTime: leaderboardCache.allTime?.length || 0,
      lastWeek: leaderboardCache.lastWeek?.length || 0,
      daily: leaderboardCache.daily?.length || 0,
    },
  };
}

/**
 * Fetch a player profile by callsign. Checks Supabase first if available, falls back to disk/cache.
 */
export async function getPlayerProfile(callsign: string): Promise<PlayerProfile> {
  const key = (callsign || 'Agent').trim().toLowerCase();
  const sb = initSupabase();

  let profile: PlayerProfile | undefined;

  if (sb) {
    try {
      const { data, error } = await sb
        .from('player_profiles')
        .select('*')
        .eq('callsign', key)
        .maybeSingle();

      if (!error && data) {
        profile = {
          callsign: data.callsign,
          tokens: data.tokens ?? 500,
          kills: data.kills ?? 0,
          deaths: data.deaths ?? 0,
          wins: data.wins ?? 0,
          matches: data.matches ?? 0,
          highScore: data.high_score ?? 0,
          unlockedItems: Array.isArray(data.unlocked_items) ? data.unlocked_items : [],
          equippedHero: (data.equipped_hero as HeroId) || 'assault',
          updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
        };
      }
    } catch (err) {
      console.warn('[Database] Supabase query error, falling back to local storage:', err);
    }

    // Check user's persistent MMO 'players' table to link cross-game MMO base data
    try {
      const { data: mmoPlayer } = await sb
        .from('players')
        .select('*')
        .ilike('username', key)
        .maybeSingle();

      if (mmoPlayer) {
        if (!profile) {
          profile = {
            callsign: mmoPlayer.username || callsign.trim() || 'Agent',
            tokens: (mmoPlayer.credits || 500),
            kills: 0,
            deaths: 0,
            wins: mmoPlayer.wins || 0,
            matches: (mmoPlayer.wins || 0) + (mmoPlayer.losses || 0),
            highScore: mmoPlayer.war_points || 0,
            unlockedItems: ['frag_grenade'],
            equippedHero: 'assault',
            updatedAt: Date.now(),
          };
        }
        profile.mmoUserId = mmoPlayer.user_id;
        profile.mmoBaseName = mmoPlayer.base_name;
        profile.mmoBaseHqLevel = mmoPlayer.base_hq_level;
        profile.mmoTotalPower = mmoPlayer.total_power ? Number(mmoPlayer.total_power) : undefined;
        profile.mmoPowerTier = mmoPlayer.power_tier;
        profile.mmoWarPoints = mmoPlayer.war_points;
        profile.mmoSector = mmoPlayer.sector;
        profile.mmoHomeSector = mmoPlayer.home_sector;
        profile.mmoAllianceId = mmoPlayer.alliance_id;
        profile.mmoGold = mmoPlayer.gold;
        profile.mmoCredits = mmoPlayer.credits;
        profile.mmoEnergy = mmoPlayer.energy;
        profile.mmoIsBountyHunter = mmoPlayer.is_bounty_hunter;
      }
    } catch (err) {
      // Table may not be queried or player not found
    }
  }

  if (profile) {
    playerProfilesCache.set(key, profile);
    persistProfilesToDisk();
    return profile;
  }

  // Fallback to cache/local persistent storage
  profile = playerProfilesCache.get(key);
  if (!profile) {
    profile = {
      callsign: callsign.trim() || 'Agent',
      tokens: 500, // Default starting combat tokens
      kills: 0,
      deaths: 0,
      wins: 0,
      matches: 0,
      highScore: 0,
      unlockedItems: ['frag_grenade'],
      equippedHero: 'assault',
      teleportCharges: 5,
      updatedAt: Date.now(),
    };
    playerProfilesCache.set(key, profile);
    persistProfilesToDisk();
  }
  if (typeof profile.teleportCharges !== 'number') {
    profile.teleportCharges = 5;
  }
  return profile;
}

/**
 * Save or sync a player profile. Writes to memory, disk, and Supabase asynchronously.
 */
export async function savePlayerProfile(profile: Partial<PlayerProfile> & { callsign: string }): Promise<PlayerProfile> {
  const key = profile.callsign.trim().toLowerCase();
  const existing = await getPlayerProfile(profile.callsign);

  const updated: PlayerProfile = {
    ...existing,
    ...profile,
    callsign: profile.callsign.trim(),
    tokens: profile.tokens !== undefined ? profile.tokens : existing.tokens,
    kills: profile.kills !== undefined ? profile.kills : existing.kills,
    deaths: profile.deaths !== undefined ? profile.deaths : existing.deaths,
    wins: profile.wins !== undefined ? profile.wins : existing.wins,
    matches: profile.matches !== undefined ? profile.matches : existing.matches,
    highScore: Math.max(existing.highScore, profile.highScore || 0),
    unlockedItems: profile.unlockedItems || existing.unlockedItems,
    equippedHero: profile.equippedHero || existing.equippedHero,
    teleportCharges: profile.teleportCharges !== undefined ? profile.teleportCharges : (existing.teleportCharges ?? 5),
    bountyTimeoutUntil: profile.bountyTimeoutUntil !== undefined ? profile.bountyTimeoutUntil : existing.bountyTimeoutUntil,
    updatedAt: Date.now(),
  };

  playerProfilesCache.set(key, updated);
  persistProfilesToDisk();

  // Async sync to Supabase if configured
  const sb = initSupabase();
  if (sb) {
    try {
      await sb.from('player_profiles').upsert(
        {
          callsign: key,
          tokens: updated.tokens,
          kills: updated.kills,
          deaths: updated.deaths,
          wins: updated.wins,
          matches: updated.matches,
          high_score: updated.highScore,
          unlocked_items: updated.unlockedItems,
          equipped_hero: updated.equippedHero,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'callsign' }
      );
    } catch (err) {
      console.warn('[Database] Could not upsert player profile to Supabase:', err);
    }
  }

  return updated;
}

/**
 * Add or subtract combat tokens from a player account.
 */
export async function updatePlayerTokens(callsign: string, deltaTokens: number): Promise<number> {
  const prof = await getPlayerProfile(callsign);
  const newTokens = Math.max(0, prof.tokens + deltaTokens);
  await savePlayerProfile({ ...prof, tokens: newTokens });
  return newTokens;
}

/**
 * Deducts 1 teleport charge for warping into Sector 8
 */
export async function deductTeleportCharge(callsign: string): Promise<{ success: boolean; chargesRemaining: number; error?: string }> {
  const prof = await getPlayerProfile(callsign);
  const currentCharges = typeof prof.teleportCharges === 'number' ? prof.teleportCharges : 5;
  if (currentCharges <= 0) {
    return { success: false, chargesRemaining: 0, error: 'NO TELEPORT CHARGES REMAINING. Replenish charges to warp to Sector 8.' };
  }
  const updated = await savePlayerProfile({
    callsign: prof.callsign,
    teleportCharges: currentCharges - 1,
  });
  return { success: true, chargesRemaining: updated.teleportCharges ?? 0 };
}

/**
 * Replenishes teleport charges
 */
export async function rechargeTeleportCharges(callsign: string, amount: number = 5): Promise<number> {
  const prof = await getPlayerProfile(callsign);
  const current = typeof prof.teleportCharges === 'number' ? prof.teleportCharges : 0;
  const newCharges = Math.min(10, current + amount);
  const updated = await savePlayerProfile({
    callsign: prof.callsign,
    teleportCharges: newCharges,
  });
  return updated.teleportCharges ?? newCharges;
}

/**
 * Sets bounty elimination timeout penalty (default 60 seconds)
 */
export async function setBountyTimeout(callsign: string, seconds: number = 60): Promise<number> {
  const timeoutUntil = Date.now() + seconds * 1000;
  await savePlayerProfile({
    callsign,
    bountyTimeoutUntil: timeoutUntil,
  });
  return timeoutUntil;
}

/**
 * Checks if a player has an active bounty elimination lockout from Sector 8
 */
export async function isPlayerTimedOut(callsign: string): Promise<{ isTimedOut: boolean; secondsRemaining: number }> {
  const prof = await getPlayerProfile(callsign);
  if (!prof.bountyTimeoutUntil) {
    return { isTimedOut: false, secondsRemaining: 0 };
  }
  const remaining = Math.max(0, Math.ceil((prof.bountyTimeoutUntil - Date.now()) / 1000));
  return { isTimedOut: remaining > 0, secondsRemaining: remaining };
}

/**
 * Retrieve current persistent leaderboard data
 */
export async function getLeaderboard(): Promise<LeaderboardData> {
  const sb = initSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('leaderboard_entries')
        .select('*')
        .order('score', { ascending: false })
        .limit(40);

      if (!error && data && data.length > 0) {
        // Group by category
        const categorized: LeaderboardData = {
          thisWeek: [],
          allTime: [],
          lastWeek: [],
          daily: [],
        };

        for (const row of data) {
          const cat = (row.category as keyof LeaderboardData) || 'thisWeek';
          if (categorized[cat]) {
            categorized[cat].push({
              id: row.id,
              name: row.name,
              score: row.score,
              kills: row.kills,
              deaths: row.deaths || 0,
              wins: row.wins || 0,
              kd: String(row.kd || '0.00'),
              heroId: (row.hero_id as HeroId) || 'assault',
              rank: categorized[cat].length + 1,
              badge: row.badge,
              title: row.title,
            });
          }
        }

        // Merge with defaults if category has entries
        if (categorized.thisWeek.length > 0) leaderboardCache.thisWeek = categorized.thisWeek;
        if (categorized.allTime.length > 0) leaderboardCache.allTime = categorized.allTime;
        if (categorized.lastWeek.length > 0) leaderboardCache.lastWeek = categorized.lastWeek;
        if (categorized.daily.length > 0) leaderboardCache.daily = categorized.daily;
      }

      // Query user's persistent MMO 'last_week_winners' table
      try {
        const { data: lwData } = await sb
          .from('last_week_winners')
          .select('*')
          .order('rank', { ascending: true })
          .limit(10);

        if (Array.isArray(lwData) && lwData.length > 0) {
          const heroRotation: HeroId[] = ['sniper', 'assault', 'shotgun', 'marksman'];
          leaderboardCache.lastWeek = lwData.map((row, idx) => ({
            id: `lww-${row.id || row.user_id || idx}`,
            name: (row.username || 'Commander').toUpperCase(),
            heroId: heroRotation[idx % heroRotation.length],
            kills: Math.round((row.points || row.weekly_points || 1200) / 60),
            deaths: Math.max(1, Math.round((row.points || row.weekly_points || 1200) / 320)),
            wins: Math.max(1, Math.round((row.points || row.weekly_points || 1200) / 180)),
            score: row.points || row.weekly_points || 0,
            rank: row.rank || (idx + 1),
            kd: ((row.points || 1000) / 450).toFixed(2),
            badge: row.rank === 1 ? 'TOURNAMENT CHAMPION' : row.rank <= 3 ? 'APEX PODIUM' : 'TOP 10 ACE',
            title: `Level ${row.level || 1} Sector Ace`,
            level: row.level,
            weekKey: row.week_key,
          }));
        }
      } catch (err) {
        // Table not ready or empty
      }

      // Query user's persistent MMO 'weekly_leaderboard' table
      try {
        const { data: wlData } = await sb
          .from('weekly_leaderboard')
          .select('*')
          .order('weekly_points', { ascending: false })
          .limit(20);

        if (Array.isArray(wlData) && wlData.length > 0) {
          const heroRotation: HeroId[] = ['assault', 'sniper', 'shotgun', 'marksman'];
          leaderboardCache.thisWeek = wlData.map((row, idx) => ({
            id: `wl-${row.user_id || idx}`,
            name: (row.username || 'Operative').toUpperCase(),
            heroId: heroRotation[idx % heroRotation.length],
            kills: Math.round((row.weekly_points || 800) / 50),
            deaths: Math.max(1, Math.round((row.weekly_points || 800) / 260)),
            wins: Math.max(1, Math.round((row.weekly_points || 800) / 150)),
            score: row.weekly_points || 0,
            rank: idx + 1,
            kd: ((row.weekly_points || 500) / 300).toFixed(2),
            badge: idx === 0 ? 'CURRENT #1' : idx < 3 ? 'TOP 3' : undefined,
            title: `Level ${row.level || 1} Combatant`,
            level: row.level,
          }));
        }
      } catch (err) {
        // Table not ready or empty
      }

      // Query user's persistent MMO 'alltime_leaderboard' table
      try {
        const { data: atData } = await sb
          .from('alltime_leaderboard')
          .select('*')
          .order('all_time_points', { ascending: false })
          .limit(20);

        if (Array.isArray(atData) && atData.length > 0) {
          const heroRotation: HeroId[] = ['assault', 'sniper', 'shotgun', 'marksman'];
          leaderboardCache.allTime = atData.map((row, idx) => ({
            id: `at-${row.user_id || idx}`,
            name: (row.username || 'Apex Operative').toUpperCase(),
            heroId: heroRotation[idx % heroRotation.length],
            kills: Math.round((row.all_time_points || 5000) / 40),
            deaths: Math.max(1, Math.round((row.all_time_points || 5000) / 300)),
            wins: Math.max(1, Math.round((row.all_time_points || 5000) / 120)),
            score: row.all_time_points || 0,
            rank: idx + 1,
            kd: ((row.all_time_points || 2000) / 400).toFixed(2),
            badge: idx === 0 ? 'HALL OF FAME #1' : idx < 3 ? 'LEGENDARY' : undefined,
            title: `Level ${row.level || 1} Grand Commander`,
            level: row.level,
          }));
        }
      } catch (err) {
        // Table not ready or empty
      }
    } catch (err) {
      console.warn('[Database] Could not fetch leaderboards from Supabase:', err);
    }
  }

  return leaderboardCache;
}

/**
 * Record a player's match performance onto the persistent tournament leaderboard
 */
export async function recordMatchScore(entry: {
  name: string;
  score: number;
  kills: number;
  deaths: number;
  wins: number;
  heroId: HeroId;
}): Promise<LeaderboardData> {
  if (entry.score <= 0) return leaderboardCache;

  const kd = (entry.kills / Math.max(1, entry.deaths)).toFixed(2);
  const newEntry: LeaderboardEntry = {
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: entry.name.toUpperCase(),
    heroId: entry.heroId,
    kills: entry.kills,
    deaths: entry.deaths,
    wins: entry.wins,
    score: entry.score,
    rank: 1,
    kd,
    badge: entry.score >= 2500 ? 'ACE WARRIOR' : entry.score >= 1200 ? 'VETERAN' : undefined,
    title: entry.heroId === 'sniper' ? 'Ghost Sharpshooter' : entry.heroId === 'shotgun' ? 'Breach Operator' : entry.heroId === 'marksman' ? 'Deadeye Vanguard' : 'Assault Commando',
  };

  // Update 'thisWeek' and 'daily'
  const updateList = (list: LeaderboardEntry[]) => {
    // Check if player already on board
    const existingIdx = list.findIndex((e) => e.name.toUpperCase() === entry.name.toUpperCase());
    if (existingIdx !== -1) {
      if (entry.score > list[existingIdx].score) {
        list[existingIdx] = {
          ...list[existingIdx],
          score: entry.score,
          kills: Math.max(list[existingIdx].kills, entry.kills),
          kd: parseFloat(kd) > parseFloat(list[existingIdx].kd) ? kd : list[existingIdx].kd,
          heroId: entry.heroId,
        };
      }
    } else {
      list.push(newEntry);
    }

    list.sort((a, b) => b.score - a.score);
    // Reassign ranks 1..10
    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    return list.slice(0, 15);
  };

  leaderboardCache.daily = updateList(leaderboardCache.daily || []);
  leaderboardCache.thisWeek = updateList(leaderboardCache.thisWeek || []);
  persistLeaderboardToDisk();

  // Async push to Supabase if configured
  const sb = initSupabase();
  if (sb) {
    try {
      await sb.from('leaderboard_entries').upsert({
        id: newEntry.id,
        name: newEntry.name,
        score: newEntry.score,
        kills: newEntry.kills,
        deaths: newEntry.deaths,
        wins: newEntry.wins,
        kd: newEntry.kd,
        hero_id: newEntry.heroId,
        category: 'thisWeek',
        badge: newEntry.badge,
        title: newEntry.title,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[Database] Could not write score to Supabase:', err);
    }
  }

  return leaderboardCache;
}

export const SUPABASE_SQL_SCHEMA = `
-- Supabase Schema for Omega Killzone Zero
-- Run this in your Supabase SQL Editor:

create table if not exists player_profiles (
  callsign text primary key,
  tokens integer default 500,
  kills integer default 0,
  deaths integer default 0,
  wins integer default 0,
  matches integer default 0,
  high_score integer default 0,
  unlocked_items text[] default '{"frag_grenade"}',
  equipped_hero text default 'assault',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists leaderboard_entries (
  id text primary key,
  name text not null,
  score integer not null,
  kills integer not null,
  deaths integer default 0,
  wins integer default 0,
  kd text not null,
  hero_id text not null,
  category text not null default 'thisWeek',
  badge text,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (optional / public read for tournament leaderboards)
alter table player_profiles enable row level security;
alter table leaderboard_entries enable row level security;

create policy "Allow all operations for backend service" on player_profiles for all using (true);
create policy "Allow all operations for backend service" on leaderboard_entries for all using (true);

-- Sectors Table (Supports custom game server sectors from your existing Supabase project)
create table if not exists sectors (
  id text primary key,
  name text not null,
  region text default 'us-east',
  mode text default 'ffa',
  max_players integer default 10,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table sectors enable row level security;
create policy "Allow all operations for backend service" on sectors for all using (true);
`;

export interface SectorRecord {
  id: string;
  name: string;
  region?: string;
  mode?: string;
  max_players?: number;
  description?: string;
  is_active?: boolean;
}

export async function getSectorsFromDatabase(): Promise<SectorRecord[]> {
  const sb = initSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('sectors')
        .select('*')
        .order('id', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        console.log(`[Database] Successfully loaded ${data.length} sectors from Supabase.`);
        return data as SectorRecord[];
      }
    } catch (err) {
      console.warn('[Database] Could not fetch sectors from Supabase:', err);
    }
  }
  return [];
}

/**
 * Query live state of a persistent MMO Sector (such as Sector 8) from Supabase:
 * - Reads public.sector_state (dominance, occupancy, event_log, phase)
 * - Reads public.players (active commanders in this sector, HQ level, power, shield)
 * - Reads public.bounty_board (bounties active in this sector)
 */
export async function getMmoSectorLiveState(sectorId: number): Promise<MmoSectorLiveState> {
  const sb = initSupabase();
  let sectorStateRow: any = null;
  let occupants: MmoCommanderOccupant[] = [];
  let bounties: MmoBounty[] = [];

  if (sb) {
    try {
      // 1. Query sector_state
      const { data: sData } = await sb
        .from('sector_state')
        .select('*')
        .eq('sector_id', sectorId)
        .maybeSingle();

      if (sData) {
        sectorStateRow = sData;
      }

      // 2. Query players in this sector
      const { data: pData } = await sb
        .from('players')
        .select('user_id, username, level, total_power, power_tier, base_name, base_hq_level, alliance_id, war_points, base_shielded, is_bounty_hunter')
        .eq('sector', sectorId)
        .order('total_power', { ascending: false })
        .limit(15);

      if (Array.isArray(pData) && pData.length > 0) {
        occupants = pData.map((p) => ({
          userId: p.user_id,
          username: p.username,
          level: p.level,
          totalPower: p.total_power ? Number(p.total_power) : undefined,
          powerTier: p.power_tier,
          baseName: p.base_name,
          baseHqLevel: p.base_hq_level,
          allianceId: p.alliance_id,
          warPoints: p.war_points,
          baseShielded: p.base_shielded,
          isBountyHunter: p.is_bounty_hunter,
        }));
      }

      // 3. Query bounty_board for target_home_sector = sectorId or open bounties
      const { data: bData } = await sb
        .from('bounty_board')
        .select('*')
        .or(`target_home_sector.eq.${sectorId},status.eq.open`)
        .order('reward_gold', { ascending: false })
        .limit(8);

      if (Array.isArray(bData) && bData.length > 0) {
        bounties = bData.map((b) => ({
          bountyId: b.bounty_id,
          targetId: b.target_id,
          targetName: b.target_name,
          targetHomeSector: b.target_home_sector,
          postedByName: b.posted_by_name,
          rewardGold: b.reward_gold || 0,
          reason: b.reason,
          status: b.status || 'open',
        }));
      }
    } catch (err) {
      console.warn('[Database] Could not query MMO tables for sector:', sectorId, err);
    }
  }

  // Realistic fallback defaults for Sector 8 if database row is empty or offline
  if (!sectorStateRow && sectorId === 8) {
    sectorStateRow = {
      sector_id: 8,
      last_phase_name: 'CONTESTED OUTPOST SIEGE (PHASE 3)',
      dominance: { alliance: 'ALLIANCE-DELTA', percentage: 68 },
      event_log: [
        {
          timestamp: new Date().toISOString(),
          type: 'killzone_combat',
          message: 'Sector 8 Outpost Crucible fortified by Vanguard Forces.',
          commander: 'Vanguard-Actual',
        },
      ],
    };
  }

  if (occupants.length === 0 && sectorId === 8) {
    occupants = [
      {
        username: 'VANGUARD-PRIME',
        baseName: 'Crucible Citadel HQ',
        baseHqLevel: 7,
        totalPower: 125000,
        powerTier: 'Fortress Class V',
        warPoints: 480,
        allianceId: 'ALLIANCE-DELTA',
        baseShielded: true,
      },
      {
        username: 'SHADOW-SPECTRE',
        baseName: 'Silent Outpost 08',
        baseHqLevel: 5,
        totalPower: 72000,
        powerTier: 'Bastion Class III',
        warPoints: 290,
        allianceId: 'IRON-LEGION',
        baseShielded: false,
      },
      {
        username: 'REAP_COMMANDER',
        baseName: 'Heavy Armory Sector 8',
        baseHqLevel: 6,
        totalPower: 98000,
        powerTier: 'Fortress Class IV',
        warPoints: 375,
        allianceId: 'ALLIANCE-DELTA',
        isBountyHunter: true,
      },
    ];
  }

  if (bounties.length === 0 && sectorId === 8) {
    bounties = [
      {
        bountyId: 'BOUNTY-801',
        targetName: 'SHADOW-SPECTRE',
        targetHomeSector: 8,
        postedByName: 'High Command',
        rewardGold: 1200,
        reason: 'Sabotaged Outpost Power Grid in Sector 8',
        status: 'open',
      },
      {
        bountyId: 'BOUNTY-802',
        targetName: 'CIPHER-NINE',
        targetHomeSector: 8,
        postedByName: 'Frontline Alliance',
        rewardGold: 850,
        reason: 'Intercepted Convoy across Crucible Canyon',
        status: 'open',
      },
    ];
  }

  return {
    sectorId,
    dominance: sectorStateRow?.dominance,
    occupancy: sectorStateRow?.occupancy,
    lastPhaseName: sectorStateRow?.last_phase_name || `Sector ${sectorId} Garrison Active`,
    lastUpdated: sectorStateRow?.last_updated || new Date().toISOString(),
    eventLog: Array.isArray(sectorStateRow?.event_log) ? sectorStateRow.event_log : [],
    occupants,
    bounties,
  };
}

/**
 * Synchronizes battle results from Omega Killzone 0 directly into the persistent MMO tables:
 * - Appends live battle log to public.sector_state.event_log
 * - Awards War Points, Gold, and Credits to public.players
 * - Updates public.weekly_leaderboard
 * - Automatically resolves and claims open bounties in public.bounty_board if a target is slain
 */
export async function syncMmoBattleOutcome(params: {
  roomId: string;
  sectorNumber?: string | number;
  playerName: string;
  score: number;
  kills: number;
  deaths: number;
  isWinner: boolean;
  coinsAwarded: number;
  victimNames?: string[];
}): Promise<void> {
  const sb = initSupabase();
  const sectorNum = params.sectorNumber
    ? Number(params.sectorNumber)
    : params.roomId.startsWith('sector-')
    ? Number(params.roomId.split('-')[1])
    : undefined;

  if (sectorNum && !isNaN(sectorNum)) {
    console.log(
      `[MMO Sync] Synchronizing battle outcome for Sector ${sectorNum} - Operative: ${params.playerName} (Winner: ${params.isWinner}, Kills: ${params.kills})`
    );

    if (sb) {
      try {
        // 1. Update sector_state event_log & last_updated
        const { data: sState } = await sb
          .from('sector_state')
          .select('event_log')
          .eq('sector_id', sectorNum)
          .maybeSingle();

        const currentLog = Array.isArray(sState?.event_log) ? sState.event_log : [];
        const battleLogEntry = {
          timestamp: new Date().toISOString(),
          type: 'killzone_combat',
          message: `[OMEGA KILLZONE 0] Sector ${sectorNum} Outpost skirmish: Commander ${params.playerName} ${
            params.isWinner ? 'secured tactical victory (+35 War Points)' : 'engaged hostile forces'
          }.`,
          commander: params.playerName,
          kills: params.kills,
          deaths: params.deaths,
          victory: params.isWinner,
        };
        const updatedLog = [battleLogEntry, ...currentLog].slice(0, 30);

        await sb.from('sector_state').upsert(
          {
            sector_id: sectorNum,
            event_log: updatedLog,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'sector_id' }
        );

        // 2. Update players table
        const { data: playerRow } = await sb
          .from('players')
          .select('id, user_id, war_points, wins, losses, credits, gold, hunter_kills, is_bounty_hunter')
          .ilike('username', params.playerName)
          .maybeSingle();

        if (playerRow) {
          const warPointsGain = params.isWinner ? 35 : 10;
          const goldGain = params.isWinner ? 25 : 5;
          await sb
            .from('players')
            .update({
              war_points: (playerRow.war_points || 0) + warPointsGain,
              wins: (playerRow.wins || 0) + (params.isWinner ? 1 : 0),
              losses: (playerRow.losses || 0) + (params.isWinner ? 0 : 1),
              credits: (playerRow.credits || 0) + params.coinsAwarded,
              gold: (playerRow.gold || 0) + goldGain,
              hunter_kills: playerRow.is_bounty_hunter
                ? (playerRow.hunter_kills || 0) + params.kills
                : playerRow.hunter_kills,
              updated_at: new Date().toISOString(),
            })
            .eq('id', playerRow.id);

          console.log(
            `[MMO Sync] Updated player ${params.playerName} in MMO table: +${warPointsGain} War Points, +${goldGain} Gold, +${params.coinsAwarded} Credits.`
          );
        }

        // 3. Update weekly_leaderboard table
        const { data: wLeader } = await sb
          .from('weekly_leaderboard')
          .select('user_id, weekly_points')
          .ilike('username', params.playerName)
          .maybeSingle();

        if (wLeader) {
          await sb
            .from('weekly_leaderboard')
            .update({
              weekly_points: (wLeader.weekly_points || 0) + (params.isWinner ? 35 : 10),
            })
            .eq('user_id', wLeader.user_id);
        }

        // 4. Check bounty_board for claimed bounties if kills occurred
        if (params.victimNames && params.victimNames.length > 0) {
          for (const victim of params.victimNames) {
            const { data: openBounty } = await sb
              .from('bounty_board')
              .select('*')
              .ilike('target_name', victim)
              .eq('status', 'open')
              .maybeSingle();

            if (openBounty) {
              await sb
                .from('bounty_board')
                .update({
                  status: 'claimed',
                  claimed_by_id: params.playerName,
                  claimed_at: new Date().toISOString(),
                })
                .eq('bounty_id', openBounty.bounty_id);

              console.log(
                `[MMO Sync] Bounty on ${victim} claimed by ${params.playerName}! Reward: ${openBounty.reward_gold} Gold.`
              );
            }
          }
        }
      } catch (err) {
        console.warn('[MMO Sync] Error syncing battle outcome with MMO tables:', err);
      }
    }
  }
}

/**
 * Fetch active bounties from public.bounty_board
 */
export async function getMmoBounties(sectorId?: number): Promise<MmoBounty[]> {
  const sb = initSupabase();
  if (sb) {
    try {
      let query = sb.from('bounty_board').select('*').eq('status', 'open');
      if (sectorId !== undefined) {
        query = query.eq('target_home_sector', sectorId);
      }
      const { data, error } = await query.order('reward_gold', { ascending: false }).limit(20);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((b) => ({
          bountyId: b.bounty_id,
          targetId: b.target_id,
          targetName: b.target_name,
          targetHomeSector: b.target_home_sector,
          postedByName: b.posted_by_name,
          rewardGold: b.reward_gold || 0,
          reason: b.reason,
          status: b.status || 'open',
        }));
      }
    } catch (err) {
      console.warn('[Database] Could not fetch bounties:', err);
    }
  }
  return [];
}

/**
 * Helper to identify bots: Bots must NEVER appear on any leaderboard!
 */
export function isBotPlayer(name: string, isBotFlag?: boolean): boolean {
  if (isBotFlag) return true;
  if (!name) return true;
  const clean = name.trim().toLowerCase();
  if (clean.startsWith('bot-') || clean.startsWith('bot_') || clean.startsWith('[bot]') || clean.startsWith('bot ')) {
    return true;
  }
  const standardBots = [
    'viper', 'spectre', 'phantom', 'reaper', 'nexus', 'ares', 'cortex',
    'sentinel', 'zero', 'titan', 'valkyrie', 'bastion', 'mirage', 'blitz', 'warden'
  ];
  return standardBots.includes(clean);
}

/**
 * Checks if an operative entering Sector 8 has an active open bounty on them.
 */
export async function checkPlayerBounty(
  playerName: string,
  sectorNumber: number = 8
): Promise<MmoBounty | null> {
  const sb = initSupabase();
  const cleanName = playerName.trim().toUpperCase();

  if (sb) {
    try {
      const { data, error } = await sb
        .from('bounty_board')
        .select('*')
        .ilike('target_name', cleanName)
        .eq('status', 'open')
        .maybeSingle();

      if (!error && data) {
        return {
          bountyId: data.bounty_id,
          targetId: data.target_id,
          targetName: data.target_name,
          targetHomeSector: data.target_home_sector,
          postedByName: data.posted_by_name,
          rewardGold: data.reward_gold || 250,
          reason: data.reason || 'Wanted by Sector 8 High Command',
          status: 'open',
        };
      }
    } catch (err) {
      console.warn('[Bounty Check] Error checking player bounty:', err);
    }
  }

  // Fallback check against known open high-profile rogue targets
  const fallbackBounties = [
    { targetName: 'VIPER_ONE', rewardGold: 750, reason: 'High-Value Outpost Infiltrator' },
    { targetName: 'COMMANDER_KANE', rewardGold: 500, reason: 'Rogue Sector 8 Warlord' },
    { targetName: 'CYBER_STORM', rewardGold: 400, reason: 'Hostile Dominance Assault' },
  ];
  const match = fallbackBounties.find((b) => b.targetName.toUpperCase() === cleanName);
  if (match) {
    return {
      bountyId: `bounty-${match.targetName.toLowerCase()}`,
      targetName: match.targetName,
      targetHomeSector: 8,
      postedByName: 'Sector 8 High Command',
      rewardGold: match.rewardGold,
      reason: match.reason,
      status: 'open',
    };
  }

  return null;
}

/**
 * Resolves a claimed bounty:
 * - Updates bounty_board row to 'claimed' with killer callsign and claimed_at timestamp
 * - Directly deposits reward gold, hunter kills, and war points into killer's record in public.players
 */
export async function claimMmoBounty(params: {
  bountyId?: string;
  targetName: string;
  killerName: string;
  rewardGold: number;
  isKillerBot?: boolean;
}): Promise<boolean> {
  console.log(
    `[Bounty System] Processing bounty claim on ${params.targetName} by ${params.killerName} (${params.rewardGold} Gold)`
  );
  const sb = initSupabase();
  if (sb) {
    try {
      if (params.bountyId) {
        await sb
          .from('bounty_board')
          .update({
            status: 'claimed',
            claimed_by_id: params.killerName,
            claimed_at: new Date().toISOString(),
          })
          .eq('bounty_id', params.bountyId);
      } else {
        await sb
          .from('bounty_board')
          .update({
            status: 'claimed',
            claimed_by_id: params.killerName,
            claimed_at: new Date().toISOString(),
          })
          .ilike('target_name', params.targetName)
          .eq('status', 'open');
      }

      // If killer is not a bot, deposit reward gold into public.players
      if (!params.isKillerBot) {
        const { data: pRow } = await sb
          .from('players')
          .select('id, gold, hunter_kills, war_points')
          .ilike('username', params.killerName)
          .maybeSingle();

        if (pRow) {
          await sb
            .from('players')
            .update({
              gold: (pRow.gold || 0) + params.rewardGold,
              hunter_kills: (pRow.hunter_kills || 0) + 1,
              war_points: (pRow.war_points || 0) + 50,
              updated_at: new Date().toISOString(),
            })
            .eq('id', pRow.id);
        }
      }
      return true;
    } catch (err) {
      console.warn('[Bounty System] Error resolving bounty in Supabase:', err);
    }
  }
  return false;
}

/**
 * =========================================================================
 * SECTOR 8 DEDICATED LEADERBOARD GROUP
 * - Tables:
 *    sector8_leaderboard_alltime
 *    sector8_leaderboard_weekly
 *    sector8_leaderboard_daily
 *    sector8_last_week_winners
 * - user_id is the player username in the game and across all sectors.
 * - Bots are NEVER present on the leaderboard!
 * =========================================================================
 */

export const SECTOR8_SQL_MIGRATION = `-- =========================================================================
-- SECTOR 8 DEDICATED LEADERBOARD GROUP MIGRATIONS (OMEGA KILLZONE 0)
-- Dedicated tournament tables specifically for Sector 8.
-- Note: user_id becomes the player username in the game and across all sectors.
-- Bots are never present on the leaderboard.
-- Run this in your Supabase SQL Editor:
-- =========================================================================

-- 1. Sector 8 All-Time Leaderboard
create table if not exists sector8_leaderboard_alltime (
  user_id text primary key, -- Player username in the game and across all sectors
  username text not null,
  hero_id text default 'assault',
  kills integer default 0,
  deaths integer default 0,
  wins integer default 0,
  matches integer default 0,
  score integer default 0,
  all_time_points integer default 0,
  war_points integer default 0,
  kd numeric(5,2) default 0.00,
  level integer default 1,
  badge text,
  title text default 'Sector 8 Veteran',
  last_active timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Sector 8 Weekly Tournament Leaderboard
create table if not exists sector8_leaderboard_weekly (
  user_id text primary key, -- Player username
  username text not null,
  hero_id text default 'assault',
  kills integer default 0,
  deaths integer default 0,
  wins integer default 0,
  matches integer default 0,
  weekly_points integer default 0,
  score integer default 0,
  kd numeric(5,2) default 0.00,
  level integer default 1,
  badge text,
  week_key text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Sector 8 Daily Combat Cycle Leaderboard
create table if not exists sector8_leaderboard_daily (
  user_id text primary key, -- Player username
  username text not null,
  hero_id text default 'assault',
  kills integer default 0,
  deaths integer default 0,
  wins integer default 0,
  daily_points integer default 0,
  score integer default 0,
  kd numeric(5,2) default 0.00,
  level integer default 1,
  badge text,
  day_key text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Sector 8 Last Week Winners Archive
create table if not exists sector8_last_week_winners (
  id bigserial primary key,
  user_id text not null, -- Player username
  username text not null,
  hero_id text default 'assault',
  rank integer not null,
  points integer not null,
  kills integer default 0,
  deaths integer default 0,
  wins integer default 0,
  kd numeric(5,2) default 0.00,
  level integer default 1,
  badge text default 'SECTOR 8 ACE',
  week_key text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row Level Security & Access Policies
alter table sector8_leaderboard_alltime enable row level security;
alter table sector8_leaderboard_weekly enable row level security;
alter table sector8_leaderboard_daily enable row level security;
alter table sector8_last_week_winners enable row level security;

create policy "Allow all read operations" on sector8_leaderboard_alltime for select using (true);
create policy "Allow all write operations" on sector8_leaderboard_alltime for all using (true);

create policy "Allow all read operations" on sector8_leaderboard_weekly for select using (true);
create policy "Allow all write operations" on sector8_leaderboard_weekly for all using (true);

create policy "Allow all read operations" on sector8_leaderboard_daily for select using (true);
create policy "Allow all write operations" on sector8_leaderboard_daily for all using (true);

create policy "Allow all read operations" on sector8_last_week_winners for select using (true);
create policy "Allow all write operations" on sector8_last_week_winners for all using (true);

-- High-Performance Indexes
create index if not exists idx_s8_alltime_score on sector8_leaderboard_alltime (score desc);
create index if not exists idx_s8_weekly_pts on sector8_leaderboard_weekly (weekly_points desc);
create index if not exists idx_s8_daily_pts on sector8_leaderboard_daily (daily_points desc);
create index if not exists idx_s8_lww_rank on sector8_last_week_winners (rank asc);
`;

// Initial human-only fallback cache for Sector 8 (Bots are strictly excluded!)
const sector8DefaultCache: LeaderboardData = {
  daily: [
    { id: 's8d-1', name: 'GHOST_REAPER', heroId: 'assault', kills: 42, deaths: 8, wins: 6, score: 2840, rank: 1, kd: '5.25', badge: 'OUTPOST DEFENDER #1', title: 'Level 28 Sector 8 Ace' },
    { id: 's8d-2', name: 'VANGUARD_8', heroId: 'sniper', kills: 38, deaths: 9, wins: 5, score: 2490, rank: 2, kd: '4.22', badge: 'APEX SNIPER', title: 'Level 25 Sharpshooter Lead' },
    { id: 's8d-3', name: 'IRON_CITADEL', heroId: 'shotgun', kills: 31, deaths: 11, wins: 4, score: 2150, rank: 3, kd: '2.81', badge: 'BREACH COMMANDER', title: 'Level 22 Heavy Breacher' },
    { id: 's8d-4', name: 'CYBER_VALKYRIE', heroId: 'marksman', kills: 27, deaths: 10, wins: 3, score: 1880, rank: 4, kd: '2.70', badge: 'RECON ELITE', title: 'Level 20 Deadeye Vanguard' },
    { id: 's8d-5', name: 'OMEGA_RAVEN', heroId: 'assault', kills: 24, deaths: 12, wins: 3, score: 1650, rank: 5, kd: '2.00', title: 'Level 18 Commando' },
  ],
  thisWeek: [
    { id: 's8w-1', name: 'GHOST_REAPER', heroId: 'assault', kills: 185, deaths: 36, wins: 28, score: 12450, rank: 1, kd: '5.14', badge: 'TOURNAMENT APEX', title: 'Level 28 Grand Commander' },
    { id: 's8w-2', name: 'VANGUARD_8', heroId: 'sniper', kills: 162, deaths: 41, wins: 24, score: 10920, rank: 2, kd: '3.95', badge: 'OUTPOST TITAN', title: 'Level 25 Sharpshooter Lead' },
    { id: 's8w-3', name: 'IRON_CITADEL', heroId: 'shotgun', kills: 139, deaths: 48, wins: 19, score: 9450, rank: 3, kd: '2.89', badge: 'CITADEL DEFENDER', title: 'Level 22 Heavy Lead' },
    { id: 's8w-4', name: 'CYBER_VALKYRIE', heroId: 'marksman', kills: 118, deaths: 45, wins: 17, score: 8120, rank: 4, kd: '2.62', title: 'Level 20 Recon Commander' },
  ],
  lastWeek: [
    { id: 's8lw-1', name: 'GHOST_REAPER', heroId: 'assault', kills: 240, deaths: 45, wins: 35, score: 15800, rank: 1, kd: '5.33', badge: 'SECTOR 8 CHAMPION', title: 'Tournament Gold Victor', weekKey: '2025-W10' },
    { id: 's8lw-2', name: 'VANGUARD_8', heroId: 'sniper', kills: 198, deaths: 52, wins: 30, score: 13400, rank: 2, kd: '3.80', badge: 'SILVER PODIUM', title: 'Tournament Silver Victor', weekKey: '2025-W10' },
    { id: 's8lw-3', name: 'IRON_CITADEL', heroId: 'shotgun', kills: 170, deaths: 60, wins: 24, score: 11200, rank: 3, kd: '2.83', badge: 'BRONZE PODIUM', title: 'Tournament Bronze Victor', weekKey: '2025-W10' },
  ],
  allTime: [
    { id: 's8at-1', name: 'GHOST_REAPER', heroId: 'assault', kills: 840, deaths: 160, wins: 140, score: 58900, rank: 1, kd: '5.25', badge: 'SECTOR 8 LEGEND #1', title: 'Level 35 Grand General' },
    { id: 's8at-2', name: 'VANGUARD_8', heroId: 'sniper', kills: 710, deaths: 180, wins: 115, score: 49800, rank: 2, kd: '3.94', badge: 'LEGENDARY SNIPER', title: 'Level 32 Sharpshooter Apex' },
    { id: 's8at-3', name: 'IRON_CITADEL', heroId: 'shotgun', kills: 630, deaths: 210, wins: 98, score: 43200, rank: 3, kd: '3.00', badge: 'CITADEL TITAN', title: 'Level 30 Fortress Commander' },
  ],
};

/**
 * Fetch dedicated Sector 8 leaderboards from Supabase or memory cache.
 * Excludes bots strictly!
 */
export async function getSector8Leaderboard(): Promise<LeaderboardData> {
  const sb = initSupabase();
  const s8Data: LeaderboardData = {
    daily: [...sector8DefaultCache.daily],
    thisWeek: [...sector8DefaultCache.thisWeek],
    lastWeek: [...sector8DefaultCache.lastWeek],
    allTime: [...sector8DefaultCache.allTime],
  };

  if (sb) {
    try {
      // 1. Daily
      const { data: dailyRows } = await sb
        .from('sector8_leaderboard_daily')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);

      if (Array.isArray(dailyRows) && dailyRows.length > 0) {
        const humanRows = dailyRows.filter((r) => !isBotPlayer(r.username || r.user_id));
        if (humanRows.length > 0) {
          s8Data.daily = humanRows.map((r, idx) => ({
            id: `s8-d-${r.user_id || idx}`,
            name: (r.username || r.user_id).toUpperCase(),
            heroId: (r.hero_id as HeroId) || 'assault',
            kills: r.kills || 0,
            deaths: r.deaths || 0,
            wins: r.wins || 0,
            score: r.score || r.daily_points || 0,
            rank: idx + 1,
            kd: String(r.kd || '0.00'),
            badge: idx === 0 ? 'SECTOR 8 #1' : idx < 3 ? 'OUTPOST DEFENDER' : undefined,
            title: r.badge || 'Sector 8 Combatant',
            level: r.level || 1,
          }));
        }
      }

      // 2. Weekly
      const { data: weeklyRows } = await sb
        .from('sector8_leaderboard_weekly')
        .select('*')
        .order('weekly_points', { ascending: false })
        .limit(20);

      if (Array.isArray(weeklyRows) && weeklyRows.length > 0) {
        const humanRows = weeklyRows.filter((r) => !isBotPlayer(r.username || r.user_id));
        if (humanRows.length > 0) {
          s8Data.thisWeek = humanRows.map((r, idx) => ({
            id: `s8-w-${r.user_id || idx}`,
            name: (r.username || r.user_id).toUpperCase(),
            heroId: (r.hero_id as HeroId) || 'assault',
            kills: r.kills || 0,
            deaths: r.deaths || 0,
            wins: r.wins || 0,
            score: r.weekly_points || r.score || 0,
            rank: idx + 1,
            kd: String(r.kd || '0.00'),
            badge: idx === 0 ? 'WEEKLY APEX CHAMPION' : idx < 3 ? 'OUTPOST TITAN' : undefined,
            title: r.badge || 'Sector 8 Vanguard',
            level: r.level || 1,
          }));
        }
      }

      // 3. Last Week Winners
      const { data: lwwRows } = await sb
        .from('sector8_last_week_winners')
        .select('*')
        .order('rank', { ascending: true })
        .limit(10);

      if (Array.isArray(lwwRows) && lwwRows.length > 0) {
        const humanRows = lwwRows.filter((r) => !isBotPlayer(r.username || r.user_id));
        if (humanRows.length > 0) {
          s8Data.lastWeek = humanRows.map((r, idx) => ({
            id: `s8-lww-${r.id || r.user_id || idx}`,
            name: (r.username || r.user_id).toUpperCase(),
            heroId: (r.hero_id as HeroId) || 'assault',
            kills: r.kills || 0,
            deaths: r.deaths || 0,
            wins: r.wins || 0,
            score: r.points || 0,
            rank: r.rank || (idx + 1),
            kd: String(r.kd || '0.00'),
            badge: r.badge || 'SECTOR 8 ACE',
            title: `Level ${r.level || 1} Outpost Victor`,
            level: r.level || 1,
            weekKey: r.week_key,
          }));
        }
      }

      // 4. All-Time
      const { data: allTimeRows } = await sb
        .from('sector8_leaderboard_alltime')
        .select('*')
        .order('score', { ascending: false })
        .limit(20);

      if (Array.isArray(allTimeRows) && allTimeRows.length > 0) {
        const humanRows = allTimeRows.filter((r) => !isBotPlayer(r.username || r.user_id));
        if (humanRows.length > 0) {
          s8Data.allTime = humanRows.map((r, idx) => ({
            id: `s8-at-${r.user_id || idx}`,
            name: (r.username || r.user_id).toUpperCase(),
            heroId: (r.hero_id as HeroId) || 'assault',
            kills: r.kills || 0,
            deaths: r.deaths || 0,
            wins: r.wins || 0,
            score: r.score || r.all_time_points || 0,
            rank: idx + 1,
            kd: String(r.kd || '0.00'),
            badge: idx === 0 ? 'SECTOR 8 LEGEND #1' : idx < 3 ? 'HALL OF FAME' : undefined,
            title: r.badge || 'Grand Sector Commander',
            level: r.level || 1,
          }));
        }
      }
    } catch (err) {
      console.warn('[Sector 8 Leaderboard] Query error (tables may not exist yet):', err);
    }
  }

  return s8Data;
}

/**
 * Record match score into Sector 8 Leaderboards:
 * - Bots are strictly excluded.
 * - user_id is the player's username.
 */
export async function recordSector8MatchScore(entry: {
  name: string;
  score: number;
  kills: number;
  deaths: number;
  wins: number;
  heroId: HeroId;
  isBot?: boolean;
}): Promise<void> {
  // CRITICAL RULE: Bots are never present on the leaderboard!
  if (isBotPlayer(entry.name, entry.isBot) || entry.score <= 0) {
    return;
  }

  const cleanUsername = entry.name.trim().toUpperCase();
  const kd = (entry.kills / Math.max(1, entry.deaths)).toFixed(2);

  // Update in-memory cache
  const updateList = (list: LeaderboardEntry[], isPoints: boolean) => {
    const existingIdx = list.findIndex((e) => e.name === cleanUsername);
    if (existingIdx !== -1) {
      if (entry.score > list[existingIdx].score) {
        list[existingIdx] = {
          ...list[existingIdx],
          score: entry.score,
          kills: Math.max(list[existingIdx].kills, entry.kills),
          kd: parseFloat(kd) > parseFloat(list[existingIdx].kd) ? kd : list[existingIdx].kd,
          heroId: entry.heroId,
          wins: list[existingIdx].wins + entry.wins,
        };
      }
    } else {
      list.push({
        id: `s8-entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanUsername,
        heroId: entry.heroId,
        kills: entry.kills,
        deaths: entry.deaths,
        wins: entry.wins,
        score: entry.score,
        rank: 1,
        kd,
        badge: entry.score >= 2500 ? 'OUTPOST DOMINATOR' : entry.score >= 1200 ? 'SECTOR 8 ACE' : undefined,
        title: 'Sector 8 Operative',
      });
    }
    list.sort((a, b) => b.score - a.score);
    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    return list.slice(0, 15);
  };

  sector8DefaultCache.daily = updateList(sector8DefaultCache.daily, false);
  sector8DefaultCache.thisWeek = updateList(sector8DefaultCache.thisWeek, true);
  sector8DefaultCache.allTime = updateList(sector8DefaultCache.allTime, true);

  // Async push to Supabase if configured
  const sb = initSupabase();
  if (sb) {
    try {
      // 1. Upsert into sector8_leaderboard_daily (user_id = cleanUsername)
      await sb.from('sector8_leaderboard_daily').upsert(
        {
          user_id: cleanUsername,
          username: cleanUsername,
          hero_id: entry.heroId,
          kills: entry.kills,
          deaths: entry.deaths,
          wins: entry.wins,
          score: entry.score,
          daily_points: entry.score,
          kd: Number(kd),
          badge: entry.score >= 2500 ? 'OUTPOST DOMINATOR' : 'SECTOR 8 VETERAN',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // 2. Upsert into sector8_leaderboard_weekly
      await sb.from('sector8_leaderboard_weekly').upsert(
        {
          user_id: cleanUsername,
          username: cleanUsername,
          hero_id: entry.heroId,
          kills: entry.kills,
          deaths: entry.deaths,
          wins: entry.wins,
          weekly_points: entry.score,
          score: entry.score,
          kd: Number(kd),
          badge: entry.score >= 2500 ? 'TOURNAMENT APEX' : 'OUTPOST TITAN',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      // 3. Upsert into sector8_leaderboard_alltime
      await sb.from('sector8_leaderboard_alltime').upsert(
        {
          user_id: cleanUsername,
          username: cleanUsername,
          hero_id: entry.heroId,
          kills: entry.kills,
          deaths: entry.deaths,
          wins: entry.wins,
          score: entry.score,
          all_time_points: entry.score,
          kd: Number(kd),
          badge: entry.score >= 2500 ? 'SECTOR 8 LEGEND' : 'OUTPOST DEFENDER',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } catch (err) {
      console.warn('[Database] Could not write score to Sector 8 Supabase tables:', err);
    }
  }
}


