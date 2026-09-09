import { CustomWeaponDef, CustomEffectDef, WeaponId, EffectId } from '../types/game';

export const CUSTOM_WEAPONS: Record<WeaponId, CustomWeaponDef> = {
  standard: {
    id: 'standard',
    name: 'Operative Standard Issue',
    category: 'Class Weapon',
    cost: 0,
    damage: 65,
    fireRate: 6.0,
    fireRange: 420,
    bulletSpeed: 950,
    bulletSpread: 0.04,
    pellets: 1,
    maxAmmo: 30,
    reloadTime: 1.6,
    color: '#38bdf8',
    description: 'Reliable military-spec service firearm tuned to operative specifications.',
  },
  ar15_elite: {
    id: 'ar15_elite',
    name: 'AR-15 SpecOps Elite',
    category: 'Assault Rifle',
    cost: 250,
    damage: 75,
    fireRate: 7.2,
    fireRange: 460,
    bulletSpeed: 1050,
    bulletSpread: 0.03,
    pellets: 1,
    maxAmmo: 35,
    reloadTime: 1.4,
    color: '#06b6d4',
    description: 'Precision rifled tactical carbine with integrated muzzle brake and extended magazine.',
  },
  dual_smg: {
    id: 'dual_smg',
    name: 'Dual Vector Vipers',
    category: 'Rapid SMG',
    cost: 320,
    damage: 42,
    fireRate: 11.5,
    fireRange: 320,
    bulletSpeed: 880,
    bulletSpread: 0.09,
    pellets: 1,
    maxAmmo: 50,
    reloadTime: 1.3,
    color: '#10b981',
    description: 'Akimbo twin submachine guns delivering blistering close-range fire suppression.',
  },
  dragonfire_shotgun: {
    id: 'dragonfire_shotgun',
    name: 'Dragonfire Incendiary 12G',
    category: 'Heavy Shotgun',
    cost: 450,
    damage: 36, // x 8 pellets = 288 max damage
    fireRate: 2.4,
    fireRange: 240,
    bulletSpeed: 750,
    bulletSpread: 0.20,
    pellets: 8,
    maxAmmo: 6,
    reloadTime: 1.5,
    color: '#f97316',
    description: 'Breaching combat shotgun loaded with magnesium flechettes for lethal room clearing.',
  },
  plasma_carbine: {
    id: 'plasma_carbine',
    name: 'Helios Plasma Carbine',
    category: 'Energy Rifle',
    cost: 500,
    damage: 92,
    fireRate: 5.5,
    fireRange: 480,
    bulletSpeed: 1180,
    bulletSpread: 0.025,
    pellets: 1,
    maxAmmo: 28,
    reloadTime: 1.7,
    color: '#3b82f6',
    description: 'Superheated ionized plasma accelerator that vaporizes enemy kinetic plating.',
  },
  void_railgun: {
    id: 'void_railgun',
    name: 'Void Piercer Heavy Railgun',
    category: 'Sniper Hyper-Weapon',
    cost: 650,
    damage: 175,
    fireRate: 1.9,
    fireRange: 680,
    bulletSpeed: 1600,
    bulletSpread: 0.008,
    pellets: 1,
    maxAmmo: 8,
    reloadTime: 2.1,
    color: '#a855f7',
    description: 'Extreme-velocity electromagnetic hyper-rail driving depleted uranium slugs across sectors.',
  },
  arc_blaster: {
    id: 'arc_blaster',
    name: 'Arc Tesla Blaster',
    category: 'Special Prototype',
    cost: 580,
    damage: 110,
    fireRate: 3.8,
    fireRange: 400,
    bulletSpeed: 980,
    bulletSpread: 0.045,
    pellets: 2,
    maxAmmo: 18,
    reloadTime: 1.8,
    color: '#eab308',
    description: 'Experimental directed energy weapon firing twin synchronized electrical arcs.',
  },
};

export const SPECIAL_EFFECTS: Record<EffectId, CustomEffectDef> = {
  neon_cyan: {
    id: 'neon_cyan',
    name: 'Cyber Cyan Core',
    cost: 0,
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    description: 'Default high-visibility kinetic cyber-luminescent ballistic rounds.',
  },
  crimson_blood: {
    id: 'crimson_blood',
    name: 'Crimson Bloodfire',
    cost: 220,
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.75)',
    description: 'Intense crimson tracer fire with smoke trails and deep red impact sparks.',
  },
  void_purple: {
    id: 'void_purple',
    name: 'Dark Matter Void',
    cost: 300,
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.75)',
    description: 'Pulsing violet dark energy signature with distorting particle trails.',
  },
  golden_royale: {
    id: 'golden_royale',
    name: 'Golden Champion Muzzle',
    cost: 480,
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.8)',
    description: 'Gilded gold munitions leaving shimmering particle sparks on trajectory.',
  },
};

export const TURRET_CONFIG = {
  cost: 120, // Cost to buy 1 turret charge in shop
  bundleCost: 300, // 3 turrets bundle
  maxInventory: 5,
  hp: 380,
  range: 440,
  fireRate: 7.5,
  damage: 20,
  bulletSpeed: 850,
};

// Map Descriptions for Voting
export interface MapVoteOption {
  id: 'cyber-complex' | 'bunker-9' | 'neon-slums' | 'desert-outpost';
  name: string;
  theme: string;
  description: string;
  badgeColor: string;
}

export const MAP_OPTIONS: MapVoteOption[] = [
  {
    id: 'cyber-complex',
    name: 'Cyber Complex',
    theme: 'High-Tech Courtyard',
    description: 'Central fortified hub surrounded by high-tech corridors and perimeter shipping yards.',
    badgeColor: '#38bdf8',
  },
  {
    id: 'bunker-9',
    name: 'Bunker 9',
    theme: 'Subterranean Vault',
    description: 'Heavily reinforced concrete tunnels, tight blast doors, and high-intensity close combat.',
    badgeColor: '#f59e0b',
  },
  {
    id: 'neon-slums',
    name: 'Neon Slums',
    theme: 'Urban Alleys & Market',
    description: 'Dense marketplace maze with abundant concealment, multiple flank routes, and narrow chokepoints.',
    badgeColor: '#ec4899',
  },
  {
    id: 'desert-outpost',
    name: 'Desert Outpost',
    theme: 'Ruins & Long Sightlines',
    description: 'Sunken temple ruins with sweeping perimeter sightlines ideal for precision marksmen.',
    badgeColor: '#10b981',
  },
];

// Local Storage Economy & Loadout Management
const COINS_KEY = 'be_player_coins';
const UNLOCKED_WEAPONS_KEY = 'be_unlocked_weapons';
const UNLOCKED_EFFECTS_KEY = 'be_unlocked_effects';
const TURRETS_KEY = 'be_turret_inventory';
const EQUIPPED_LOADOUT_KEY = 'be_equipped_loadout';

export function getPlayerCoins(): number {
  try {
    const saved = localStorage.getItem(COINS_KEY);
    if (saved === null) {
      // Starting bonus so player can immediately explore the shop!
      localStorage.setItem(COINS_KEY, '400');
      return 400;
    }
    return Math.max(0, parseInt(saved, 10) || 0);
  } catch {
    return 400;
  }
}

export function addPlayerCoins(amount: number): number {
  try {
    const current = getPlayerCoins();
    const updated = current + amount;
    localStorage.setItem(COINS_KEY, updated.toString());
    return updated;
  } catch {
    return getPlayerCoins();
  }
}

export function spendPlayerCoins(amount: number): boolean {
  try {
    const current = getPlayerCoins();
    if (current < amount) return false;
    const updated = current - amount;
    localStorage.setItem(COINS_KEY, updated.toString());
    return true;
  } catch {
    return false;
  }
}

export function getUnlockedWeapons(): WeaponId[] {
  try {
    const saved = localStorage.getItem(UNLOCKED_WEAPONS_KEY);
    if (!saved) {
      const defaults: WeaponId[] = ['standard', 'ar15_elite'];
      localStorage.setItem(UNLOCKED_WEAPONS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(saved) as WeaponId[];
    if (!parsed.includes('standard')) parsed.push('standard');
    return parsed;
  } catch {
    return ['standard', 'ar15_elite'];
  }
}

export function unlockWeapon(weaponId: WeaponId): boolean {
  try {
    const unlocked = getUnlockedWeapons();
    if (unlocked.includes(weaponId)) return true;
    const def = CUSTOM_WEAPONS[weaponId];
    if (!def) return false;
    if (spendPlayerCoins(def.cost)) {
      unlocked.push(weaponId);
      localStorage.setItem(UNLOCKED_WEAPONS_KEY, JSON.stringify(unlocked));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getUnlockedEffects(): EffectId[] {
  try {
    const saved = localStorage.getItem(UNLOCKED_EFFECTS_KEY);
    if (!saved) {
      const defaults: EffectId[] = ['neon_cyan'];
      localStorage.setItem(UNLOCKED_EFFECTS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(saved) as EffectId[];
    if (!parsed.includes('neon_cyan')) parsed.push('neon_cyan');
    return parsed;
  } catch {
    return ['neon_cyan'];
  }
}

export function unlockEffect(effectId: EffectId): boolean {
  try {
    const unlocked = getUnlockedEffects();
    if (unlocked.includes(effectId)) return true;
    const def = SPECIAL_EFFECTS[effectId];
    if (!def) return false;
    if (spendPlayerCoins(def.cost)) {
      unlocked.push(effectId);
      localStorage.setItem(UNLOCKED_EFFECTS_KEY, JSON.stringify(unlocked));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getTurretInventory(): number {
  try {
    const saved = localStorage.getItem(TURRETS_KEY);
    if (saved === null) {
      // Default 1 free deployable turret to try immediately
      localStorage.setItem(TURRETS_KEY, '2');
      return 2;
    }
    return Math.max(0, parseInt(saved, 10) || 0);
  } catch {
    return 2;
  }
}

export function addTurretInventory(count: number): number {
  try {
    const current = getTurretInventory();
    const updated = Math.min(TURRET_CONFIG.maxInventory, current + count);
    localStorage.setItem(TURRETS_KEY, updated.toString());
    return updated;
  } catch {
    return getTurretInventory();
  }
}

export function consumeTurretInventory(): boolean {
  try {
    const current = getTurretInventory();
    if (current <= 0) return false;
    localStorage.setItem(TURRETS_KEY, (current - 1).toString());
    return true;
  } catch {
    return false;
  }
}

export function setTurretInventory(count: number): void {
  try {
    const updated = Math.max(0, Math.min(TURRET_CONFIG.maxInventory, count));
    localStorage.setItem(TURRETS_KEY, updated.toString());
  } catch {
    // ignore
  }
}

export function getEquippedLoadout(): { weaponId: WeaponId; effectId: EffectId } {
  try {
    const saved = localStorage.getItem(EQUIPPED_LOADOUT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        weaponId: parsed.weaponId || 'ar15_elite',
        effectId: parsed.effectId || 'neon_cyan',
      };
    }
  } catch {
    // fallback
  }
  return { weaponId: 'ar15_elite', effectId: 'neon_cyan' };
}

export function saveEquippedLoadout(weaponId: WeaponId, effectId: EffectId) {
  try {
    localStorage.setItem(EQUIPPED_LOADOUT_KEY, JSON.stringify({ weaponId, effectId }));
  } catch {
    // ignore
  }
}
