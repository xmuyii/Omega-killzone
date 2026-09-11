import { SectorMmoInfo } from '../types/game';

export const KNOWN_MMO_SECTORS: Record<string, SectorMmoInfo> = {
  '8': {
    sectorId: 'sector-8',
    sectorNumber: '8',
    sectorName: 'SECTOR 8 // OUTPOST CRUCIBLE',
    mmoContext:
      'The designated battleground where unfriendly scores will be settled. Persistent combat zone with active high-command bounties, contested tactical outposts, and live high-stakes teleports.',
    baseStatus: 'Forward Citadel Outpost Tier-2 (Contested War Frontline)',
    resourceNode: 'Deep Core Titanium & High-Grade Deuterium Synthesizers',
    isFrontlineCombatZone: true,
  },
  'sector-8': {
    sectorId: 'sector-8',
    sectorNumber: '8',
    sectorName: 'SECTOR 8 // OUTPOST CRUCIBLE',
    mmoContext:
      'The designated battleground where unfriendly scores will be settled. Persistent combat zone with active high-command bounties, contested tactical outposts, and live high-stakes teleports.',
    baseStatus: 'Forward Citadel Outpost Tier-2 (Contested War Frontline)',
    resourceNode: 'Deep Core Titanium & High-Grade Deuterium Synthesizers',
    isFrontlineCombatZone: true,
  },
};

export function resolveSectorMmoInfo(inputSectorOrRoom: string = '8'): SectorMmoInfo {
  // This game is strictly and exclusively for Sector 8
  return KNOWN_MMO_SECTORS['8'];
}

