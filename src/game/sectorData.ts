import { SectorMmoInfo } from '../types/game';

export const KNOWN_MMO_SECTORS: Record<string, SectorMmoInfo> = {
  '8': {
    sectorId: 'sector-8',
    sectorNumber: '8',
    sectorName: 'SECTOR 8 // OUTPOST CRUCIBLE',
    mmoContext:
      'Frontline Combat Skirmish Zone for your persistent MMO. Battles in Omega Killzone 0 directly defend and secure Sector 8 base outposts, resource extraction pipelines, and territorial dominance.',
    baseStatus: 'Forward Citadel Outpost Tier-2 (Contested Frontline Siege)',
    resourceNode: 'Deep Core Titanium & High-Grade Deuterium Synthesizers',
    isFrontlineCombatZone: true,
  },
  'sector-8': {
    sectorId: 'sector-8',
    sectorNumber: '8',
    sectorName: 'SECTOR 8 // OUTPOST CRUCIBLE',
    mmoContext:
      'Frontline Combat Skirmish Zone for your persistent MMO. Battles in Omega Killzone 0 directly defend and secure Sector 8 base outposts, resource extraction pipelines, and territorial dominance.',
    baseStatus: 'Forward Citadel Outpost Tier-2 (Contested Frontline Siege)',
    resourceNode: 'Deep Core Titanium & High-Grade Deuterium Synthesizers',
    isFrontlineCombatZone: true,
  },
  '1': {
    sectorId: 'sector-1',
    sectorNumber: '1',
    sectorName: 'SECTOR 1 // PRIME CITADEL GARRISON',
    mmoContext:
      'Capital Base Territory. Highly fortified base installations providing strategic command relays and manufacturing for allied sector operations.',
    baseStatus: 'Command Headquarters (Fortified Perimeter)',
    resourceNode: 'Central Nano-Fabricator Matrix',
    isFrontlineCombatZone: false,
  },
  'sector-1': {
    sectorId: 'sector-1',
    sectorNumber: '1',
    sectorName: 'SECTOR 1 // PRIME CITADEL GARRISON',
    mmoContext:
      'Capital Base Territory. Highly fortified base installations providing strategic command relays and manufacturing for allied sector operations.',
    baseStatus: 'Command Headquarters (Fortified Perimeter)',
    resourceNode: 'Central Nano-Fabricator Matrix',
    isFrontlineCombatZone: false,
  },
  '4': {
    sectorId: 'sector-4',
    sectorNumber: '4',
    sectorName: 'SECTOR 4 // INDUSTRIAL FOUNDRY COMPLEX',
    mmoContext:
      'Heavy manufacturing district. Controlling Sector 4 accelerates vehicle construction and defensive turret production across the MMO universe.',
    baseStatus: 'Smelting Outpost Tier-1 (Active Operations)',
    resourceNode: 'Heavy Mineral Processing & Hydrocarbon Refineries',
    isFrontlineCombatZone: false,
  },
  'sector-4': {
    sectorId: 'sector-4',
    sectorNumber: '4',
    sectorName: 'SECTOR 4 // INDUSTRIAL FOUNDRY COMPLEX',
    mmoContext:
      'Heavy manufacturing district. Controlling Sector 4 accelerates vehicle construction and defensive turret production across the MMO universe.',
    baseStatus: 'Smelting Outpost Tier-1 (Active Operations)',
    resourceNode: 'Heavy Mineral Processing & Hydrocarbon Refineries',
    isFrontlineCombatZone: false,
  },
  '12': {
    sectorId: 'sector-12',
    sectorNumber: '12',
    sectorName: 'SECTOR 12 // DEEP RIM EXCAVATION',
    mmoContext:
      'High-risk frontier mining sector. Hostile incursions frequently contest valuable rare-earth mineral nodes.',
    baseStatus: 'Perimeter Mining Camp (Alert Status: Yellow)',
    resourceNode: 'Rare Crystalline Asteroid Veins',
    isFrontlineCombatZone: true,
  },
  'sector-12': {
    sectorId: 'sector-12',
    sectorNumber: '12',
    sectorName: 'SECTOR 12 // DEEP RIM EXCAVATION',
    mmoContext:
      'High-risk frontier mining sector. Hostile incursions frequently contest valuable rare-earth mineral nodes.',
    baseStatus: 'Perimeter Mining Camp (Alert Status: Yellow)',
    resourceNode: 'Rare Crystalline Asteroid Veins',
    isFrontlineCombatZone: true,
  },
};

export function resolveSectorMmoInfo(inputSectorOrRoom: string): SectorMmoInfo {
  const clean = inputSectorOrRoom.trim().toLowerCase();
  
  // Direct match
  if (KNOWN_MMO_SECTORS[clean]) {
    return KNOWN_MMO_SECTORS[clean];
  }

  // Check if string contains a number (e.g. "sector-8", "room-8", "8")
  const match = clean.match(/\b\d+\b/);
  if (match && KNOWN_MMO_SECTORS[match[0]]) {
    return KNOWN_MMO_SECTORS[match[0]];
  }

  const num = match ? match[0] : '8';
  return {
    sectorId: `sector-${num}`,
    sectorNumber: num,
    sectorName: `SECTOR ${num} // PERSISTENT COMBAT ZONE`,
    mmoContext: `Real-time frontline combat skirmish for Sector ${num} in your persistent base-building MMO. Outcomes directly influence sector control, outpost defense, and resource flow.`,
    baseStatus: `Tactical Base Outpost Sector ${num}`,
    resourceNode: `Sector ${num} Resource Grid & Strategic Node`,
    isFrontlineCombatZone: num === '8',
  };
}
