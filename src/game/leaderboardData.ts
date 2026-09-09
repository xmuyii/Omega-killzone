import { LeaderboardData, LeaderboardEntry, HeroId } from '../types/game';

// Seeded realistic leaderboards representing active tactical tournament circuits with Top 10 rankings
export const INITIAL_LEADERBOARD_DATA: LeaderboardData = {
  daily: [
    { id: 'lb-d-1', name: 'APEX_PREDATOR', heroId: 'sniper', kills: 48, deaths: 6, wins: 5, score: 3840, rank: 1, kd: '8.00', badge: 'TOP ELITE', title: 'Apex Marksman' },
    { id: 'lb-d-2', name: 'CYBER_VIPER', heroId: 'assault', kills: 42, deaths: 9, wins: 4, score: 3360, rank: 2, kd: '4.67', badge: 'DOMINATING', title: 'Ghost Raider' },
    { id: 'lb-d-3', name: 'BULLET_STORM', heroId: 'shotgun', kills: 39, deaths: 11, wins: 3, score: 3120, rank: 3, kd: '3.55', badge: 'RAMPAGE', title: 'Breach Breaker' },
    { id: 'lb-d-4', name: 'DEAD_EYE_Z', heroId: 'marksman', kills: 35, deaths: 10, wins: 3, score: 2800, rank: 4, kd: '3.50', title: 'Silent Hunter' },
    { id: 'lb-d-5', name: 'GHOST_PROTOCOL', heroId: 'sniper', kills: 31, deaths: 8, wins: 2, score: 2480, rank: 5, kd: '3.88', title: 'Recon Spectre' },
    { id: 'lb-d-6', name: 'TITAN_SLAYER', heroId: 'assault', kills: 27, deaths: 12, wins: 2, score: 2160, rank: 6, kd: '2.25', title: 'Field Sergeant' },
    { id: 'lb-d-7', name: 'IRON_CLAD', heroId: 'shotgun', kills: 24, deaths: 14, wins: 1, score: 1920, rank: 7, kd: '1.71', title: 'Vanguard Guard' },
    { id: 'lb-d-8', name: 'HELLHOUND', heroId: 'marksman', kills: 21, deaths: 13, wins: 1, score: 1680, rank: 8, kd: '1.62', title: 'Tactical Scout' },
    { id: 'lb-d-9', name: 'PHANTOM_9', heroId: 'sniper', kills: 19, deaths: 11, wins: 1, score: 1520, rank: 9, kd: '1.73', title: 'Ballistic Recon' },
    { id: 'lb-d-10', name: 'RED_DEVIL', heroId: 'shotgun', kills: 16, deaths: 12, wins: 1, score: 1340, rank: 10, kd: '1.33', title: 'Shock Operator' },
  ],
  thisWeek: [
    { id: 'lb-tw-1', name: 'CYBER_VIPER', heroId: 'assault', kills: 294, deaths: 48, wins: 32, score: 24500, rank: 1, kd: '6.13', badge: 'WEEKLY #1', title: 'Warlord' },
    { id: 'lb-tw-2', name: 'APEX_PREDATOR', heroId: 'sniper', kills: 278, deaths: 42, wins: 29, score: 23150, rank: 2, kd: '6.62', badge: 'GOLD OPERATIVE', title: 'Shadow Master' },
    { id: 'lb-tw-3', name: 'SHADOW_REAPER', heroId: 'marksman', kills: 245, deaths: 55, wins: 25, score: 20400, rank: 3, kd: '4.45', badge: 'BRONZE LION', title: 'Zone Executioner' },
    { id: 'lb-tw-4', name: 'BULLET_STORM', heroId: 'shotgun', kills: 220, deaths: 61, wins: 21, score: 18350, rank: 4, kd: '3.61', title: 'Riot Master' },
    { id: 'lb-tw-5', name: 'VALKYRIE_ONE', heroId: 'sniper', kills: 198, deaths: 49, wins: 19, score: 16500, rank: 5, kd: '4.04', title: 'Valkyrie Prime' },
    { id: 'lb-tw-6', name: 'WAR_MACHINE', heroId: 'assault', kills: 182, deaths: 58, wins: 17, score: 15200, rank: 6, kd: '3.14', title: 'Heavy Gunner' },
    { id: 'lb-tw-7', name: 'DEAD_EYE_Z', heroId: 'marksman', kills: 165, deaths: 52, wins: 15, score: 13750, rank: 7, kd: '3.17', title: 'Sharpshooter' },
    { id: 'lb-tw-8', name: 'ZERO_TRACE', heroId: 'sniper', kills: 144, deaths: 47, wins: 13, score: 12000, rank: 8, kd: '3.06', title: 'Phantom Operative' },
    { id: 'lb-tw-9', name: 'KINETIC_BOY', heroId: 'marksman', kills: 132, deaths: 44, wins: 11, score: 11100, rank: 9, kd: '3.00', title: 'Vanguard Ranger' },
    { id: 'lb-tw-10', name: 'DREADNOUGHT', heroId: 'shotgun', kills: 118, deaths: 49, wins: 10, score: 9950, rank: 10, kd: '2.41', title: 'Breach Pioneer' },
  ],
  lastWeek: [
    { id: 'lb-lw-1', name: 'VOX_OVERLORD', heroId: 'sniper', kills: 412, deaths: 51, wins: 46, score: 34350, rank: 1, kd: '8.08', badge: 'CHAMPION 🏆', title: 'Certified Zone Champion' },
    { id: 'lb-lw-2', name: 'RED_LINE', heroId: 'shotgun', kills: 388, deaths: 68, wins: 41, score: 32300, rank: 2, kd: '5.71', badge: 'RUNNER-UP 🥈', title: 'Master Breacher' },
    { id: 'lb-lw-3', name: 'CYBER_VIPER', heroId: 'assault', kills: 365, deaths: 62, wins: 38, score: 30400, rank: 3, kd: '5.89', badge: 'PODIUM 🥉', title: 'Sector Marshal' },
    { id: 'lb-lw-4', name: 'APEX_PREDATOR', heroId: 'marksman', kills: 340, deaths: 59, wins: 34, score: 28350, rank: 4, kd: '5.76', title: 'Marksman Prime' },
    { id: 'lb-lw-5', name: 'GHOST_PROTOCOL', heroId: 'sniper', kills: 310, deaths: 65, wins: 30, score: 25800, rank: 5, kd: '4.77', title: 'Ghost Scout' },
    { id: 'lb-lw-6', name: 'BULLET_STORM', heroId: 'shotgun', kills: 285, deaths: 72, wins: 27, score: 23750, rank: 6, kd: '3.96', title: 'Combat Breaker' },
    { id: 'lb-lw-7', name: 'RAVEN_SIGHT', heroId: 'marksman', kills: 250, deaths: 64, wins: 23, score: 20850, rank: 7, kd: '3.91', title: 'Tactical Recon' },
    { id: 'lb-lw-8', name: 'TERMINAL_SHOT', heroId: 'assault', kills: 224, deaths: 70, wins: 20, score: 18650, rank: 8, kd: '3.20', title: 'Field Commando' },
    { id: 'lb-lw-9', name: 'VIPER_FANG', heroId: 'sniper', kills: 206, deaths: 66, wins: 18, score: 17150, rank: 9, kd: '3.12', title: 'High Caliber Scout' },
    { id: 'lb-lw-10', name: 'HEAVY_IMPACT', heroId: 'shotgun', kills: 189, deaths: 71, wins: 16, score: 15800, rank: 10, kd: '2.66', title: 'Frontline Hazard' },
  ],
  allTime: [
    { id: 'lb-at-1', name: 'VOX_OVERLORD', heroId: 'sniper', kills: 4890, deaths: 620, wins: 540, score: 407500, rank: 1, kd: '7.89', badge: 'LEGEND ★★★', title: 'Grandmaster' },
    { id: 'lb-at-2', name: 'CYBER_VIPER', heroId: 'assault', kills: 4350, deaths: 710, wins: 480, score: 362500, rank: 2, kd: '6.13', badge: 'IMMORTAL ★★', title: 'Zone Overlord' },
    { id: 'lb-at-3', name: 'APEX_PREDATOR', heroId: 'sniper', kills: 3980, deaths: 580, wins: 440, score: 331700, rank: 3, kd: '6.86', badge: 'WARLORD ★', title: 'Death Dealer' },
    { id: 'lb-at-4', name: 'RED_LINE', heroId: 'shotgun', kills: 3620, deaths: 790, wins: 395, score: 301700, rank: 4, kd: '4.58', title: 'Demolitions King' },
    { id: 'lb-at-5', name: 'SHADOW_REAPER', heroId: 'marksman', kills: 3240, deaths: 680, wins: 360, score: 270000, rank: 5, kd: '4.76', title: 'Phantom Assassin' },
    { id: 'lb-at-6', name: 'BULLET_STORM', heroId: 'shotgun', kills: 2950, deaths: 810, wins: 310, score: 245800, rank: 6, kd: '3.64', title: 'Breacher Supreme' },
    { id: 'lb-at-7', name: 'DEAD_EYE_Z', heroId: 'marksman', kills: 2680, deaths: 730, wins: 285, score: 223300, rank: 7, kd: '3.67', title: 'Deadeye Elite' },
    { id: 'lb-at-8', name: 'VALKYRIE_ONE', heroId: 'sniper', kills: 2420, deaths: 605, wins: 255, score: 201700, rank: 8, kd: '4.00', title: 'Aerial Vanguard' },
    { id: 'lb-at-9', name: 'BLACKOUT', heroId: 'assault', kills: 2190, deaths: 580, wins: 230, score: 182500, rank: 9, kd: '3.78', title: 'Assault Master' },
    { id: 'lb-at-10', name: 'IRON_SIGHTS', heroId: 'marksman', kills: 1980, deaths: 540, wins: 210, score: 165000, rank: 10, kd: '3.67', title: 'Sharpshooter Veteran' },
  ],
};

const STORAGE_KEY = 'killstrike_leaderboard_data_v2';
const WINNERS_SEEN_KEY = 'killstrike_last_week_winners_seen_v1';

export function getLeaderboardData(): LeaderboardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load local leaderboard:', e);
  }
  return INITIAL_LEADERBOARD_DATA;
}

export function saveLeaderboardData(data: LeaderboardData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save leaderboard data:', e);
  }
}

export function recordPlayerMatchResult(params: {
  playerName: string;
  heroId: HeroId;
  kills: number;
  deaths: number;
  score: number;
  isWin: boolean;
}): LeaderboardData {
  const current = getLeaderboardData();
  const { playerName, heroId, kills, deaths, score, isWin } = params;
  if (!playerName || (kills === 0 && score === 0)) return current;

  const updateList = (list: LeaderboardEntry[]): LeaderboardEntry[] => {
    const idx = list.findIndex((e) => e.name.toLowerCase() === playerName.toLowerCase());
    if (idx >= 0) {
      const existing = list[idx];
      const newKills = existing.kills + kills;
      const newDeaths = existing.deaths + deaths;
      const newWins = existing.wins + (isWin ? 1 : 0);
      const newScore = existing.score + score;
      const kd = (newKills / Math.max(1, newDeaths)).toFixed(2);
      list[idx] = {
        ...existing,
        heroId,
        kills: newKills,
        deaths: newDeaths,
        wins: newWins,
        score: newScore,
        kd,
      };
    } else {
      const kd = (kills / Math.max(1, deaths)).toFixed(2);
      list.push({
        id: `player-${Date.now()}`,
        name: playerName,
        heroId,
        kills,
        deaths,
        wins: isWin ? 1 : 0,
        score,
        rank: list.length + 1,
        kd,
        title: 'Tactical Operator',
      });
    }

    // Sort by score descending and recalculate ranks
    list.sort((a, b) => b.score - a.score);
    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  };

  current.daily = updateList(current.daily);
  current.thisWeek = updateList(current.thisWeek);
  current.allTime = updateList(current.allTime);

  saveLeaderboardData(current);
  return current;
}

export function hasSeenLastWeekWinners(): boolean {
  try {
    return sessionStorage.getItem(WINNERS_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markLastWeekWinnersAsSeen(): void {
  try {
    sessionStorage.setItem(WINNERS_SEEN_KEY, 'true');
  } catch (e) {
    console.warn(e);
  }
}
