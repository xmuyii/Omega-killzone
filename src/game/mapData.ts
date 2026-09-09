import { Wall, Bush, Pickup, MapId } from '../types/game';
import { MAP_CONFIG } from './constants';

export function generateMap(mapId: MapId = 'cyber-complex'): {
  walls: Wall[];
  bushes: Bush[];
  pickups: Pickup[];
  spawnPoints: { x: number; y: number }[];
} {
  switch (mapId) {
    case 'bunker-9':
      return generateBunker9Map();
    case 'neon-slums':
      return generateNeonSlumsMap();
    case 'desert-outpost':
      return generateDesertOutpostMap();
    case 'cyber-complex':
    default:
      return generateDefaultMap();
  }
}

export function generateDefaultMap(): { walls: Wall[]; bushes: Bush[]; pickups: Pickup[]; spawnPoints: { x: number; y: number }[] } {
  const W = MAP_CONFIG.width;
  const H = MAP_CONFIG.height;
  const walls: Wall[] = [];

  // Outer boundary walls
  const wallThick = 40;
  walls.push({ id: 'b-top', x: 0, y: 0, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-bottom', x: 0, y: H - wallThick, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-left', x: 0, y: 0, width: wallThick, height: H, type: 'wall' });
  walls.push({ id: 'b-right', x: W - wallThick, y: 0, width: wallThick, height: H, type: 'wall' });

  // Tactical Central Complex (Courtyard & Storage)
  // Center bunker structure (openings on 4 sides)
  const cx = W / 2;
  const cy = H / 2;
  const cSize = 480;

  // Center room walls with doorways
  // Top center wall with door
  walls.push({ id: 'c-top-1', x: cx - cSize / 2, y: cy - cSize / 2, width: 170, height: 32, type: 'wall' });
  walls.push({ id: 'c-top-2', x: cx + cSize / 2 - 170, y: cy - cSize / 2, width: 170, height: 32, type: 'wall' });

  // Bottom center wall with door
  walls.push({ id: 'c-bot-1', x: cx - cSize / 2, y: cy + cSize / 2 - 32, width: 170, height: 32, type: 'wall' });
  walls.push({ id: 'c-bot-2', x: cx + cSize / 2 - 170, y: cy + cSize / 2 - 32, width: 170, height: 32, type: 'wall' });

  // Left center wall with door
  walls.push({ id: 'c-left-1', x: cx - cSize / 2, y: cy - cSize / 2, width: 32, height: 170, type: 'wall' });
  walls.push({ id: 'c-left-2', x: cx - cSize / 2, y: cy + cSize / 2 - 170, width: 32, height: 170, type: 'wall' });

  // Right center wall with door
  walls.push({ id: 'c-right-1', x: cx + cSize / 2 - 32, y: cy - cSize / 2, width: 32, height: 170, type: 'wall' });
  walls.push({ id: 'c-right-2', x: cx + cSize / 2 - 32, y: cy + cSize / 2 - 170, width: 32, height: 170, type: 'wall' });

  // Central tactical pillars
  walls.push({ id: 'c-pillar-1', x: cx - 100, y: cy - 100, width: 50, height: 50, type: 'pillar' });
  walls.push({ id: 'c-pillar-2', x: cx + 50, y: cy - 100, width: 50, height: 50, type: 'pillar' });
  walls.push({ id: 'c-pillar-3', x: cx - 100, y: cy + 50, width: 50, height: 50, type: 'pillar' });
  walls.push({ id: 'c-pillar-4', x: cx + 50, y: cy + 50, width: 50, height: 50, type: 'pillar' });

  // North-West Sector: Warehouses & Shipping Crates
  walls.push({ id: 'nw-w1', x: 250, y: 350, width: 380, height: 32, type: 'wall' });
  walls.push({ id: 'nw-w2', x: 250, y: 350, width: 32, height: 420, type: 'wall' });
  walls.push({ id: 'nw-w3', x: 250, y: 770, width: 220, height: 32, type: 'wall' });
  // NW Crates
  walls.push({ id: 'nw-crate-1', x: 380, y: 460, width: 64, height: 64, type: 'crate' });
  walls.push({ id: 'nw-crate-2', x: 480, y: 460, width: 64, height: 64, type: 'crate' });
  walls.push({ id: 'nw-crate-3', x: 380, y: 600, width: 90, height: 50, type: 'crate' });
  walls.push({ id: 'nw-pillar', x: 750, y: 550, width: 44, height: 44, type: 'pillar' });

  // North-East Sector: Power Station & Alleyways
  walls.push({ id: 'ne-w1', x: W - 680, y: 300, width: 420, height: 32, type: 'wall' });
  walls.push({ id: 'ne-w2', x: W - 300, y: 300, width: 32, height: 450, type: 'wall' });
  walls.push({ id: 'ne-w3', x: W - 680, y: 550, width: 280, height: 32, type: 'wall' });
  walls.push({ id: 'ne-crate-1', x: W - 520, y: 400, width: 60, height: 60, type: 'crate' });
  walls.push({ id: 'ne-crate-2', x: W - 420, y: 400, width: 60, height: 60, type: 'crate' });
  walls.push({ id: 'ne-pillar', x: W - 800, y: 620, width: 44, height: 44, type: 'pillar' });

  // South-West Sector: Hangar & Storage Rooms
  walls.push({ id: 'sw-w1', x: 300, y: H - 750, width: 450, height: 32, type: 'wall' });
  walls.push({ id: 'sw-w2', x: 300, y: H - 750, width: 32, height: 400, type: 'wall' });
  walls.push({ id: 'sw-w3', x: 500, y: H - 450, width: 32, height: 250, type: 'wall' });
  walls.push({ id: 'sw-crate-1', x: 420, y: H - 650, width: 70, height: 50, type: 'crate' });
  walls.push({ id: 'sw-crate-2', x: 600, y: H - 600, width: 50, height: 70, type: 'crate' });
  walls.push({ id: 'sw-pillar', x: 800, y: H - 700, width: 44, height: 44, type: 'pillar' });

  // South-East Sector: Cargo Docks & Barriers
  walls.push({ id: 'se-w1', x: W - 720, y: H - 700, width: 32, height: 450, type: 'wall' });
  walls.push({ id: 'se-w2', x: W - 720, y: H - 400, width: 420, height: 32, type: 'wall' });
  walls.push({ id: 'se-crate-1', x: W - 550, y: H - 550, width: 80, height: 60, type: 'crate' });
  walls.push({ id: 'se-crate-2', x: W - 420, y: H - 650, width: 60, height: 80, type: 'crate' });
  walls.push({ id: 'se-pillar', x: W - 820, y: H - 750, width: 44, height: 44, type: 'pillar' });

  // Mid-way chokepoint barriers
  walls.push({ id: 'mid-n', x: cx - 20, y: 380, width: 40, height: 320, type: 'wall' });
  walls.push({ id: 'mid-s', x: cx - 20, y: H - 700, width: 40, height: 320, type: 'wall' });
  walls.push({ id: 'mid-w', x: 380, y: cy - 20, width: 320, height: 40, type: 'wall' });
  walls.push({ id: 'mid-e', x: W - 700, y: cy - 20, width: 320, height: 40, type: 'wall' });

  // Perimeter cover crates
  walls.push({ id: 'cov-1', x: 850, y: 950, width: 60, height: 60, type: 'crate' });
  walls.push({ id: 'cov-2', x: W - 910, y: 950, width: 60, height: 60, type: 'crate' });
  walls.push({ id: 'cov-3', x: 850, y: H - 1010, width: 60, height: 60, type: 'crate' });
  walls.push({ id: 'cov-4', x: W - 910, y: H - 1010, width: 60, height: 60, type: 'crate' });

  // Bushes (Ambush zones & tactical hiding spots)
  const bushes: Bush[] = [
    // Center surroundings
    { id: 'b-c1', x: cx - 320, y: cy - 320, radius: 65 },
    { id: 'b-c2', x: cx + 320, y: cy - 320, radius: 65 },
    { id: 'b-c3', x: cx - 320, y: cy + 320, radius: 65 },
    { id: 'b-c4', x: cx + 320, y: cy + 320, radius: 65 },

    // North corridors
    { id: 'b-n1', x: cx - 180, y: 720, radius: 55 },
    { id: 'b-n2', x: cx + 180, y: 720, radius: 55 },
    { id: 'b-nw', x: 700, y: 380, radius: 70 },
    { id: 'b-ne', x: W - 700, y: 380, radius: 70 },

    // South corridors
    { id: 'b-s1', x: cx - 180, y: H - 720, radius: 55 },
    { id: 'b-s2', x: cx + 180, y: H - 720, radius: 55 },
    { id: 'b-sw', x: 720, y: H - 420, radius: 70 },
    { id: 'b-se', x: W - 720, y: H - 420, radius: 70 },

    // Flanks
    { id: 'b-w1', x: 420, y: cy - 180, radius: 60 },
    { id: 'b-w2', x: 420, y: cy + 180, radius: 60 },
    { id: 'b-e1', x: W - 420, y: cy - 180, radius: 60 },
    { id: 'b-e2', x: W - 420, y: cy + 180, radius: 60 },
  ];

  // Pickups scattered across the arena
  const pickups: Pickup[] = [
    // Center prizes
    { id: 'p-c-ammo', type: 'ammo', x: cx, y: cy, amount: 50 },
    { id: 'p-c-boost', type: 'damage_boost', x: cx, y: cy - 140, amount: 1 },
    { id: 'p-c-speed', type: 'speed_boost', x: cx, y: cy + 140, amount: 1 },

    // NW wing
    { id: 'p-nw-hp', type: 'health', x: 320, y: 440, amount: 400 },
    { id: 'p-nw-ammo', type: 'ammo', x: 580, y: 640, amount: 30 },
    { id: 'p-nw-armor', type: 'armor', x: 720, y: 720, amount: 350 },

    // NE wing
    { id: 'p-ne-armor', type: 'armor', x: W - 380, y: 480, amount: 350 },
    { id: 'p-ne-ammo', type: 'ammo', x: W - 580, y: 620, amount: 30 },
    { id: 'p-ne-speed', type: 'speed_boost', x: W - 740, y: 450, amount: 1 },

    // SW wing
    { id: 'p-sw-hp', type: 'health', x: 450, y: H - 400, amount: 400 },
    { id: 'p-sw-armor', type: 'armor', x: 620, y: H - 650, amount: 350 },
    { id: 'p-sw-ammo', type: 'ammo', x: 780, y: H - 550, amount: 30 },

    // SE wing
    { id: 'p-se-hp', type: 'health', x: W - 480, y: H - 450, amount: 400 },
    { id: 'p-se-ammo', type: 'ammo', x: W - 620, y: H - 650, amount: 30 },
    { id: 'p-se-armor', type: 'armor', x: W - 780, y: H - 520, amount: 350 },

    // Midfield caches
    { id: 'p-mid-n', type: 'ammo', x: cx, y: 800, amount: 40 },
    { id: 'p-mid-s', type: 'ammo', x: cx, y: H - 800, amount: 40 },
    { id: 'p-mid-w', type: 'health', x: 800, y: cy, amount: 300 },
    { id: 'p-mid-e', type: 'health', x: W - 800, y: cy, amount: 300 },
    // Strategic Deployables
    { id: 'p-turret-1', type: 'turret', x: cx - 220, y: cy, amount: 1 },
    { id: 'p-turret-2', type: 'turret', x: cx + 220, y: cy, amount: 1 },
    { id: 'p-grenade-1', type: 'grenade', x: cx, y: cy - 220, amount: 2 },
    { id: 'p-grenade-2', type: 'grenade', x: cx, y: cy + 220, amount: 2 },
  ];

  // Tactical spawn locations spread out across the map
  const spawnPoints = [
    { x: 180, y: 180 },
    { x: W - 180, y: 180 },
    { x: 180, y: H - 180 },
    { x: W - 180, y: H - 180 },
    { x: cx, y: 180 },
    { x: cx, y: H - 180 },
    { x: 180, y: cy },
    { x: W - 180, y: cy },
    { x: 850, y: 650 },
    { x: W - 850, y: 650 },
    { x: 850, y: H - 650 },
    { x: W - 850, y: H - 650 },
  ];

  return { walls, bushes, pickups, spawnPoints };
}

// 2. BUNKER 9: Subterranean Vault with heavy blast walls, trenches and pillars
function generateBunker9Map(): { walls: Wall[]; bushes: Bush[]; pickups: Pickup[]; spawnPoints: { x: number; y: number }[] } {
  const W = MAP_CONFIG.width;
  const H = MAP_CONFIG.height;
  const walls: Wall[] = [];
  const wallThick = 40;

  walls.push({ id: 'b-top', x: 0, y: 0, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-bottom', x: 0, y: H - wallThick, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-left', x: 0, y: 0, width: wallThick, height: H, type: 'wall' });
  walls.push({ id: 'b-right', x: W - wallThick, y: 0, width: wallThick, height: H, type: 'wall' });

  const cx = W / 2;
  const cy = H / 2;

  // Central Octagonal Missile Silo
  walls.push({ id: 'silo-top', x: cx - 220, y: cy - 240, width: 440, height: 36, type: 'wall' });
  walls.push({ id: 'silo-bot', x: cx - 220, y: cy + 204, width: 440, height: 36, type: 'wall' });
  walls.push({ id: 'silo-left', x: cx - 240, y: cy - 140, width: 36, height: 280, type: 'wall' });
  walls.push({ id: 'silo-right', x: cx + 204, y: cy - 140, width: 36, height: 280, type: 'wall' });

  // Center Silo Core Pillars
  walls.push({ id: 'core-p1', x: cx - 60, y: cy - 60, width: 45, height: 45, type: 'pillar' });
  walls.push({ id: 'core-p2', x: cx + 15, y: cy - 60, width: 45, height: 45, type: 'pillar' });
  walls.push({ id: 'core-p3', x: cx - 60, y: cy + 15, width: 45, height: 45, type: 'pillar' });
  walls.push({ id: 'core-p4', x: cx + 15, y: cy + 15, width: 45, height: 45, type: 'pillar' });

  // Heavy Blast Corridors
  walls.push({ id: 'corridor-n1', x: cx - 350, y: 400, width: 260, height: 36, type: 'wall' });
  walls.push({ id: 'corridor-n2', x: cx + 90, y: 400, width: 260, height: 36, type: 'wall' });
  walls.push({ id: 'corridor-s1', x: cx - 350, y: H - 436, width: 260, height: 36, type: 'wall' });
  walls.push({ id: 'corridor-s2', x: cx + 90, y: H - 436, width: 260, height: 36, type: 'wall' });

  // West & East Command Centers
  walls.push({ id: 'cmd-w1', x: 380, y: cy - 350, width: 36, height: 700, type: 'wall' });
  walls.push({ id: 'cmd-w-crate1', x: 260, y: cy - 120, width: 70, height: 70, type: 'crate' });
  walls.push({ id: 'cmd-w-crate2', x: 260, y: cy + 50, width: 70, height: 70, type: 'crate' });

  walls.push({ id: 'cmd-e1', x: W - 416, y: cy - 350, width: 36, height: 700, type: 'wall' });
  walls.push({ id: 'cmd-e-crate1', x: W - 330, y: cy - 120, width: 70, height: 70, type: 'crate' });
  walls.push({ id: 'cmd-e-crate2', x: W - 330, y: cy + 50, width: 70, height: 70, type: 'crate' });

  // Heavy Defensive Pillboxes
  walls.push({ id: 'pb-nw', x: 620, y: 650, width: 60, height: 60, type: 'pillar' });
  walls.push({ id: 'pb-ne', x: W - 680, y: 650, width: 60, height: 60, type: 'pillar' });
  walls.push({ id: 'pb-sw', x: 620, y: H - 710, width: 60, height: 60, type: 'pillar' });
  walls.push({ id: 'pb-se', x: W - 680, y: H - 710, width: 60, height: 60, type: 'pillar' });

  const bushes: Bush[] = [
    { id: 'b-steam-1', x: cx - 400, y: cy, radius: 65 },
    { id: 'b-steam-2', x: cx + 400, y: cy, radius: 65 },
    { id: 'b-steam-3', x: cx, y: cy - 400, radius: 65 },
    { id: 'b-steam-4', x: cx, y: cy + 400, radius: 65 },
    { id: 'b-cor-nw', x: 500, y: 500, radius: 60 },
    { id: 'b-cor-ne', x: W - 500, y: 500, radius: 60 },
    { id: 'b-cor-sw', x: 500, y: H - 500, radius: 60 },
    { id: 'b-cor-se', x: W - 500, y: H - 500, radius: 60 },
  ];

  const pickups: Pickup[] = [
    { id: 'b-p-silo', type: 'damage_boost', x: cx, y: cy, amount: 1 },
    { id: 'b-p-n', type: 'armor', x: cx, y: 260, amount: 400 },
    { id: 'b-p-s', type: 'armor', x: cx, y: H - 260, amount: 400 },
    { id: 'b-p-w', type: 'health', x: 240, y: cy, amount: 450 },
    { id: 'b-p-e', type: 'health', x: W - 240, y: cy, amount: 450 },
    { id: 'b-p-ammo1', x: 680, y: 800, type: 'ammo', amount: 50 },
    { id: 'b-p-ammo2', x: W - 680, y: 800, type: 'ammo', amount: 50 },
    { id: 'b-p-ammo3', x: 680, y: H - 800, type: 'ammo', amount: 50 },
    { id: 'b-p-ammo4', x: W - 680, y: H - 800, type: 'ammo', amount: 50 },
    { id: 'b-p-turret', x: cx, y: cy - 200, type: 'turret', amount: 1 },
    { id: 'b-p-grenade', x: cx, y: cy + 200, type: 'grenade', amount: 2 },
  ];

  const spawnPoints = [
    { x: 220, y: 220 },
    { x: W - 220, y: 220 },
    { x: 220, y: H - 220 },
    { x: W - 220, y: H - 220 },
    { x: cx - 500, y: cy },
    { x: cx + 500, y: cy },
    { x: cx, y: cy - 600 },
    { x: cx, y: cy + 600 },
  ];

  return { walls, bushes, pickups, spawnPoints };
}

// 3. NEON SLUMS: Urban Alleyways & Marketplace
function generateNeonSlumsMap(): { walls: Wall[]; bushes: Bush[]; pickups: Pickup[]; spawnPoints: { x: number; y: number }[] } {
  const W = MAP_CONFIG.width;
  const H = MAP_CONFIG.height;
  const walls: Wall[] = [];
  const wallThick = 40;

  walls.push({ id: 'b-top', x: 0, y: 0, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-bottom', x: 0, y: H - wallThick, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-left', x: 0, y: 0, width: wallThick, height: H, type: 'wall' });
  walls.push({ id: 'b-right', x: W - wallThick, y: 0, width: wallThick, height: H, type: 'wall' });

  const cx = W / 2;
  const cy = H / 2;

  // Central Neon Plaza (Crossroads)
  // Vendor Shacks and Stalls
  const shacks = [
    { x: cx - 360, y: cy - 360, w: 140, h: 90 },
    { x: cx + 220, y: cy - 360, w: 140, h: 90 },
    { x: cx - 360, y: cy + 270, w: 140, h: 90 },
    { x: cx + 220, y: cy + 270, w: 140, h: 90 },
    // Alley Barricades
    { x: cx - 18, y: 320, w: 36, h: 260 },
    { x: cx - 18, y: H - 580, w: 36, h: 260 },
    { x: 320, y: cy - 18, w: 260, h: 36 },
    { x: W - 580, y: cy - 18, w: 260, h: 36 },
  ];

  shacks.forEach((s, idx) => {
    walls.push({ id: `slum-w-${idx}`, x: s.x, y: s.y, width: s.w, height: s.h, type: 'wall' });
  });

  // Dense Marketplace Shipping Crates
  const crates = [
    { x: cx - 120, y: cy - 120, w: 60, h: 60 },
    { x: cx + 60, y: cy - 120, w: 60, h: 60 },
    { x: cx - 120, y: cy + 60, w: 60, h: 60 },
    { x: cx + 60, y: cy + 60, w: 60, h: 60 },
    { x: 600, y: 600, w: 80, h: 50 },
    { x: W - 680, y: 600, w: 80, h: 50 },
    { x: 600, y: H - 650, w: 80, h: 50 },
    { x: W - 680, y: H - 650, w: 80, h: 50 },
  ];

  crates.forEach((c, idx) => {
    walls.push({ id: `slum-crate-${idx}`, x: c.x, y: c.y, width: c.w, height: c.h, type: 'crate' });
  });

  // Plentiful Canopies / Smoke Stacks for concealment
  const bushes: Bush[] = [
    { id: 'slum-b1', x: cx - 220, y: cy - 80, radius: 70 },
    { id: 'slum-b2', x: cx + 220, y: cy + 80, radius: 70 },
    { id: 'slum-b3', x: cx, y: cy - 240, radius: 65 },
    { id: 'slum-b4', x: cx, y: cy + 240, radius: 65 },
    { id: 'slum-b5', x: 450, y: 450, radius: 75 },
    { id: 'slum-b6', x: W - 450, y: 450, radius: 75 },
    { id: 'slum-b7', x: 450, y: H - 450, radius: 75 },
    { id: 'slum-b8', x: W - 450, y: H - 450, radius: 75 },
  ];

  const pickups: Pickup[] = [
    { id: 'slum-p-speed', type: 'speed_boost', x: cx, y: cy, amount: 1 },
    { id: 'slum-p-hp1', type: 'health', x: cx - 400, y: cy, amount: 350 },
    { id: 'slum-p-hp2', type: 'health', x: cx + 400, y: cy, amount: 350 },
    { id: 'slum-p-arm1', type: 'armor', x: cx, y: cy - 450, amount: 300 },
    { id: 'slum-p-arm2', type: 'armor', x: cx, y: cy + 450, amount: 300 },
    { id: 'slum-p-ammo1', type: 'ammo', x: 350, y: 350, amount: 40 },
    { id: 'slum-p-ammo2', type: 'ammo', x: W - 350, y: 350, amount: 40 },
    { id: 'slum-p-ammo3', type: 'ammo', x: 350, y: H - 350, amount: 40 },
    { id: 'slum-p-ammo4', type: 'ammo', x: W - 350, y: H - 350, amount: 40 },
    { id: 'slum-p-turret', type: 'turret', x: cx - 200, y: cy - 100, amount: 1 },
    { id: 'slum-p-grenade', type: 'grenade', x: cx + 200, y: cy + 100, amount: 2 },
  ];

  const spawnPoints = [
    { x: 240, y: 240 },
    { x: W - 240, y: 240 },
    { x: 240, y: H - 240 },
    { x: W - 240, y: H - 240 },
    { x: cx, y: 200 },
    { x: cx, y: H - 200 },
    { x: 200, y: cy },
    { x: W - 200, y: cy },
  ];

  return { walls, bushes, pickups, spawnPoints };
}

// 4. DESERT OUTPOST: Sunken Temple Ruins & Long Sightlines
function generateDesertOutpostMap(): { walls: Wall[]; bushes: Bush[]; pickups: Pickup[]; spawnPoints: { x: number; y: number }[] } {
  const W = MAP_CONFIG.width;
  const H = MAP_CONFIG.height;
  const walls: Wall[] = [];
  const wallThick = 40;

  walls.push({ id: 'b-top', x: 0, y: 0, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-bottom', x: 0, y: H - wallThick, width: W, height: wallThick, type: 'wall' });
  walls.push({ id: 'b-left', x: 0, y: 0, width: wallThick, height: H, type: 'wall' });
  walls.push({ id: 'b-right', x: W - wallThick, y: 0, width: wallThick, height: H, type: 'wall' });

  const cx = W / 2;
  const cy = H / 2;

  // Central Sunken Altar (open square with stone column perimeter)
  const columns = [
    { x: cx - 200, y: cy - 200 },
    { x: cx - 70, y: cy - 200 },
    { x: cx + 70, y: cy - 200 },
    { x: cx + 200, y: cy - 200 },

    { x: cx - 200, y: cy + 200 },
    { x: cx - 70, y: cy + 200 },
    { x: cx + 70, y: cy + 200 },
    { x: cx + 200, y: cy + 200 },

    { x: cx - 200, y: cy - 70 },
    { x: cx - 200, y: cy + 70 },
    { x: cx + 200, y: cy - 70 },
    { x: cx + 200, y: cy + 70 },
  ];

  columns.forEach((col, idx) => {
    walls.push({ id: `altar-col-${idx}`, x: col.x - 22, y: col.y - 22, width: 44, height: 44, type: 'pillar' });
  });

  // Long Perimeter Ruins
  walls.push({ id: 'ruin-nw', x: 450, y: 400, width: 420, height: 36, type: 'wall' });
  walls.push({ id: 'ruin-ne', x: W - 870, y: 400, width: 420, height: 36, type: 'wall' });
  walls.push({ id: 'ruin-sw', x: 450, y: H - 436, width: 420, height: 36, type: 'wall' });
  walls.push({ id: 'ruin-se', x: W - 870, y: H - 436, width: 420, height: 36, type: 'wall' });

  // Stone Slabs / Ancient Cover
  walls.push({ id: 'slab-1', x: cx - 550, y: cy - 30, width: 140, height: 60, type: 'crate' });
  walls.push({ id: 'slab-2', x: cx + 410, y: cy - 30, width: 140, height: 60, type: 'crate' });
  walls.push({ id: 'slab-3', x: cx - 30, y: cy - 550, width: 60, height: 140, type: 'crate' });
  walls.push({ id: 'slab-4', x: cx - 30, y: cy + 410, width: 60, height: 140, type: 'crate' });

  // Desert Oases & Cacti
  const bushes: Bush[] = [
    { id: 'oasis-1', x: 350, y: cy, radius: 85 },
    { id: 'oasis-2', x: W - 350, y: cy, radius: 85 },
    { id: 'oasis-3', x: cx, y: 350, radius: 85 },
    { id: 'oasis-4', x: cx, y: H - 350, radius: 85 },
    { id: 'oasis-c1', x: cx - 350, y: cy - 350, radius: 65 },
    { id: 'oasis-c2', x: cx + 350, y: cy - 350, radius: 65 },
    { id: 'oasis-c3', x: cx - 350, y: cy + 350, radius: 65 },
    { id: 'oasis-c4', x: cx + 350, y: cy + 350, radius: 65 },
  ];

  const pickups: Pickup[] = [
    { id: 'd-p-boost', type: 'damage_boost', x: cx, y: cy, amount: 1 },
    { id: 'd-p-hp1', type: 'health', x: 350, y: 350, amount: 400 },
    { id: 'd-p-hp2', type: 'health', x: W - 350, y: 350, amount: 400 },
    { id: 'd-p-hp3', type: 'health', x: 350, y: H - 350, amount: 400 },
    { id: 'd-p-hp4', type: 'health', x: W - 350, y: H - 350, amount: 400 },
    { id: 'd-p-ammo1', type: 'ammo', x: cx - 450, y: cy, amount: 45 },
    { id: 'd-p-ammo2', type: 'ammo', x: cx + 450, y: cy, amount: 45 },
    { id: 'd-p-armor1', type: 'armor', x: cx, y: cy - 400, amount: 350 },
    { id: 'd-p-armor2', type: 'armor', x: cx, y: cy + 400, amount: 350 },
    { id: 'd-p-turret', type: 'turret', x: cx - 180, y: cy - 180, amount: 1 },
    { id: 'd-p-grenade', type: 'grenade', x: cx + 180, y: cy + 180, amount: 2 },
  ];

  const spawnPoints = [
    { x: 220, y: 220 },
    { x: W - 220, y: 220 },
    { x: 220, y: H - 220 },
    { x: W - 220, y: H - 220 },
    { x: cx, y: 240 },
    { x: cx, y: H - 240 },
    { x: 240, y: cy },
    { x: W - 240, y: cy },
  ];

  return { walls, bushes, pickups, spawnPoints };
}

