import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaderboardData, LeaderboardEntry, HeroId } from '../src/types/game';
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

  if (sb) {
    try {
      const { data, error } = await sb
        .from('player_profiles')
        .select('*')
        .eq('callsign', key)
        .maybeSingle();

      if (!error && data) {
        const prof: PlayerProfile = {
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
        playerProfilesCache.set(key, prof);
        persistProfilesToDisk();
        return prof;
      }
    } catch (err) {
      console.warn('[Database] Supabase query error, falling back to local storage:', err);
    }
  }

  // Fallback to cache/local persistent storage
  let profile = playerProfilesCache.get(key);
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
      updatedAt: Date.now(),
    };
    playerProfilesCache.set(key, profile);
    persistProfilesToDisk();
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
`;
