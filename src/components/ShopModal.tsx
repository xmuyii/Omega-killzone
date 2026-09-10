import React, { useState } from 'react';
import { WeaponId, EffectId } from '../types/game';
import {
  CUSTOM_WEAPONS,
  SPECIAL_EFFECTS,
  TURRET_CONFIG,
  getPlayerCoins,
  spendPlayerCoins,
  unlockWeapon,
  unlockEffect,
  getUnlockedWeapons,
  getUnlockedEffects,
  getEquippedLoadout,
  saveEquippedLoadout,
  getTurretInventory,
  addTurretInventory,
} from '../game/loadoutData';
import {
  Coins,
  Shield,
  Crosshair,
  Zap,
  Gauge,
  Sparkles,
  Check,
  Lock,
  Flame,
  Radio,
  X,
  Plus,
  Layers,
  Award,
} from 'lucide-react';
import { sounds } from '../game/audio';

interface ShopModalProps {
  onClose: () => void;
  onEquipChange?: (weaponId: WeaponId, effectId: EffectId) => void;
  onTurretBuy?: (newCount: number) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  onClose,
  onEquipChange,
  onTurretBuy,
}) => {
  const [coins, setCoins] = useState<number>(getPlayerCoins());
  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponId[]>(getUnlockedWeapons());
  const [unlockedEffects, setUnlockedEffects] = useState<EffectId[]>(getUnlockedEffects());
  const [equipped, setEquipped] = useState<{ weaponId: WeaponId; effectId: EffectId }>(getEquippedLoadout());
  const [turretCount, setTurretCount] = useState<number>(getTurretInventory());
  const [activeTab, setActiveTab] = useState<'weapons' | 'effects' | 'turrets'>('weapons');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const showFeedback = (text: string, isError: boolean = false) => {
    setFeedbackMsg({ text, isError });
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleBuyWeapon = (weaponId: WeaponId) => {
    const weapon = CUSTOM_WEAPONS[weaponId];
    if (!weapon) return;
    if (coins < weapon.cost) {
      showFeedback('Not enough coins to acquire this weapon!', true);
      return;
    }
    const success = unlockWeapon(weaponId);
    if (success) {
      sounds.playAbility();
      setCoins(getPlayerCoins());
      setUnlockedWeapons(getUnlockedWeapons());
      // Auto-equip upon purchase
      saveEquippedLoadout(weaponId, equipped.effectId);
      setEquipped({ ...equipped, weaponId });
      onEquipChange?.(weaponId, equipped.effectId);
      showFeedback(`Acquired & Equipped ${weapon.name}!`);
    } else {
      showFeedback('Transaction failed.', true);
    }
  };

  const handleEquipWeapon = (weaponId: WeaponId) => {
    saveEquippedLoadout(weaponId, equipped.effectId);
    setEquipped({ ...equipped, weaponId });
    onEquipChange?.(weaponId, equipped.effectId);
    sounds.playReload();
    showFeedback(`Equipped ${CUSTOM_WEAPONS[weaponId].name}`);
  };

  const handleBuyEffect = (effectId: EffectId) => {
    const effect = SPECIAL_EFFECTS[effectId];
    if (!effect) return;
    if (coins < effect.cost) {
      showFeedback('Not enough coins for this special tracer effect!', true);
      return;
    }
    const success = unlockEffect(effectId);
    if (success) {
      sounds.playAbility();
      setCoins(getPlayerCoins());
      setUnlockedEffects(getUnlockedEffects());
      saveEquippedLoadout(equipped.weaponId, effectId);
      setEquipped({ ...equipped, effectId });
      onEquipChange?.(equipped.weaponId, effectId);
      showFeedback(`Unlocked & Equipped ${effect.name}!`);
    } else {
      showFeedback('Transaction failed.', true);
    }
  };

  const handleEquipEffect = (effectId: EffectId) => {
    saveEquippedLoadout(equipped.weaponId, effectId);
    setEquipped({ ...equipped, effectId });
    onEquipChange?.(equipped.weaponId, effectId);
    sounds.playReload();
    showFeedback(`Equipped ${SPECIAL_EFFECTS[effectId].name}`);
  };

  const handleBuyTurrets = (count: number, cost: number) => {
    if (turretCount >= TURRET_CONFIG.maxInventory) {
      showFeedback('Turret inventory is at maximum capacity (5/5)!', true);
      return;
    }
    if (coins < cost) {
      showFeedback('Not enough coins for deployable turrets!', true);
      return;
    }
    if (spendPlayerCoins(cost)) {
      const updatedCount = addTurretInventory(count);
      sounds.playAbility();
      setCoins(getPlayerCoins());
      setTurretCount(updatedCount);
      onTurretBuy?.(updatedCount);
      showFeedback(`Purchased ${count} Machine Gun Turret(s)! Stock: ${updatedCount}`);
    } else {
      showFeedback('Transaction failed.', true);
    }
  };

  return (
    <div
      id="shop-modal-overlay"
      className="fixed inset-0 z-50 bg-[#04060d]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans select-none"
    >
      <div className="bg-slate-950/95 border border-amber-500/40 rounded-2xl w-full max-w-4xl p-5 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.2)] relative overflow-hidden backdrop-blur-xl my-auto">
        {/* Ambient Top Glow Strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 shadow-[0_0_15px_rgba(245,158,11,0.6)]" />

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-bold bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                Black Market Armory
              </span>
              <span className="text-xs text-slate-400 font-mono">Special Issue Arsenal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-wide text-white flex items-center gap-2 mt-1">
              <span>TACTICAL</span>
              <span className="text-amber-500 not-italic">STORE</span>
            </h2>
          </div>

          {/* Current Coins Wallet & Close */}
          <div className="flex items-center gap-3">
            <div className="bg-[#0b1020] border border-amber-500/40 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-inner">
              <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block leading-none">
                  Operative Funds
                </span>
                <span className="text-lg font-black font-mono text-amber-400 tabular-nums">
                  {coins.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer"
              title="Close Armory"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {feedbackMsg && (
          <div
            className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 animate-fade-in ${
              feedbackMsg.isError
                ? 'bg-rose-950/80 border border-rose-600/50 text-rose-300'
                : 'bg-emerald-950/80 border border-emerald-600/50 text-emerald-300'
            }`}
          >
            <span>{feedbackMsg.isError ? '✕' : '✓'}</span>
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('weapons')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'weapons'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Guns & Special Weapons ({Object.keys(CUSTOM_WEAPONS).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'effects'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tracers & Special Effects</span>
          </button>

          <button
            onClick={() => setActiveTab('turrets')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'turrets'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Deployable Turrets ({turretCount}/5)</span>
          </button>
        </div>

        {/* Tab 1: Weapons & Special Guns */}
        {activeTab === 'weapons' && (
          <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1 space-y-3">
            {/* Tactical Intel Explaining Upgraded Weapons & Operative Synergies */}
            <div className="bg-amber-950/25 border border-amber-500/40 rounded-xl p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] font-mono leading-relaxed">
                <span className="text-amber-300 font-bold uppercase block mb-0.5">
                  Armory Protocol // Tier-2 Enhanced Weapon Systems
                </span>
                <p className="text-slate-300">
                  Every weapon in the Armory is an <strong className="text-amber-400">upgraded version</strong> of default firearms with superior damage, fire-rate, or magazine capacity. While each gun features a designated <strong className="text-sky-400">Operative Synergy</strong>, all operatives can equip any weapon to gain enhanced frontline lethality.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.values(CUSTOM_WEAPONS) as typeof CUSTOM_WEAPONS[WeaponId][]).map((w) => {
                const isUnlocked = unlockedWeapons.includes(w.id);
                const isEquipped = equipped.weaponId === w.id;
                const canAfford = coins >= w.cost;

                return (
                  <div
                    key={w.id}
                    className={`p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-slate-900/90 border-amber-400 ring-2 ring-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        : isUnlocked
                        ? 'bg-slate-900/50 border-slate-700/80 hover:border-slate-600'
                        : 'bg-[#080c16]/70 border-slate-800/80'
                    }`}
                  >
                    <div>
                      {/* Weapon Header */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span
                              className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${w.color}20`,
                                color: w.color,
                                border: `1px solid ${w.color}40`,
                              }}
                            >
                              {w.category}
                            </span>
                            {w.upgradeTier && (
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {w.upgradeTier}
                              </span>
                            )}
                          </div>
                          <h3 className="text-base font-black text-white tracking-tight">
                            {w.name}
                          </h3>
                        </div>

                        {/* Status Badges */}
                        {isEquipped ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.8)] shrink-0">
                            EQUIPPED
                          </span>
                        ) : isUnlocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            OWNED
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/60 border border-amber-600/50 text-amber-400 flex items-center gap-1 shrink-0">
                            <Coins className="w-3 h-3" />
                            {w.cost}
                          </span>
                        )}
                      </div>

                      {/* Operative Synergy Tag */}
                      {w.specializedHeroName && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-300 bg-sky-950/40 border border-sky-800/50 px-2 py-0.5 rounded mb-2">
                          <span className="text-slate-400 uppercase text-[8px] tracking-wider font-bold">Synergy:</span>
                          <span className="font-semibold">{w.specializedHeroName}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                        {w.description}
                      </p>

                      {/* Enhanced Stat Advantage Callout */}
                      {w.statBonusText && (
                        <div className="text-[10px] font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 px-2 py-1 rounded mb-2.5 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{w.statBonusText}</span>
                        </div>
                      )}

                      {/* Stat Bars */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-slate-800/80 pt-2 mb-3">
                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Damage</span>
                            <span className="text-white font-bold">{w.damage * w.pellets}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-red-500 h-full"
                              style={{ width: `${Math.min(100, (w.damage * w.pellets / 280) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Fire Rate</span>
                            <span className="text-white font-bold">{w.fireRate}/s</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-amber-400 h-full"
                              style={{ width: `${Math.min(100, (w.fireRate / 12) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Range</span>
                            <span className="text-white font-bold">{w.fireRange}px</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-sky-400 h-full"
                              style={{ width: `${Math.min(100, (w.fireRange / 700) * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Magazine</span>
                            <span className="text-white font-bold">{w.maxAmmo} rds</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full"
                              style={{ width: `${Math.min(100, (w.maxAmmo / 50) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full py-2 bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold rounded-lg cursor-default flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Currently In Loadout</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquipWeapon(w.id)}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Equip Weapon</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyWeapon(w.id)}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock for {w.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Tracers & Special Effects */}
        {activeTab === 'effects' && (
          <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.values(SPECIAL_EFFECTS) as typeof SPECIAL_EFFECTS[EffectId][]).map((ef) => {
                const isUnlocked = unlockedEffects.includes(ef.id);
                const isEquipped = equipped.effectId === ef.id;
                const canAfford = coins >= ef.cost;

                return (
                  <div
                    key={ef.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-slate-900/90 border-sky-400 ring-2 ring-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                        : isUnlocked
                        ? 'bg-slate-900/50 border-slate-700/80 hover:border-slate-600'
                        : 'bg-[#080c16]/70 border-slate-800/80'
                    }`}
                  >
                    <div>
                      {/* Effect Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full shadow-md"
                            style={{
                              backgroundColor: ef.color,
                              boxShadow: `0 0 12px ${ef.color}`,
                            }}
                          />
                          <h3 className="text-sm font-black text-white">{ef.name}</h3>
                        </div>

                        {isEquipped ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black bg-sky-400 text-black">
                            ACTIVE TRACER
                          </span>
                        ) : isUnlocked ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 border border-amber-600/50 text-amber-400 flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {ef.cost}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mb-3">{ef.description}</p>

                      {/* Visual Preview Swatch */}
                      <div className="p-3 bg-black/60 rounded-lg border border-slate-800 mb-3 flex items-center justify-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500">Tracer Preview:</span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-12 h-1 rounded-full"
                            style={{
                              background: `linear-gradient(to right, transparent, ${ef.color})`,
                              boxShadow: `0 0 8px ${ef.color}`,
                            }}
                          />
                          <span
                            className="w-2 h-2 rounded-full bg-white shadow-sm"
                            style={{ boxShadow: `0 0 6px ${ef.color}` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div>
                      {isEquipped ? (
                        <button
                          disabled
                          className="w-full py-2 bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-xs font-bold rounded-lg cursor-default flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Equipped</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleEquipEffect(ef.id)}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Equip Tracer</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyEffect(ef.id)}
                          disabled={!canAfford}
                          className={`w-full py-2 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 shadow cursor-pointer'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock ({ef.cost} Coins)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Placeable Machine Gun Turrets */}
        {activeTab === 'turrets' && (
          <div className="mt-4 max-h-[50vh] overflow-y-auto pr-1 space-y-4">
            <div className="bg-[#080d1a] border border-emerald-500/30 rounded-xl p-4 sm:p-6 shadow-inner">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-emerald-950/80 border border-emerald-600/60 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <Shield className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                      Defensive Hardware
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Placeable Machine Gun Turret
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Autonomous 360° robotic sentry. Automatically locks onto enemy operatives within 440px.
                    </p>
                  </div>
                </div>

                {/* Current Stock */}
                <div className="bg-slate-900 border border-slate-700/80 px-4 py-2.5 rounded-xl text-center">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Current Inventory
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {turretCount} <span className="text-xs text-slate-500 font-normal">/ 5 max</span>
                  </span>
                </div>
              </div>

              {/* Turret Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono bg-black/40 border border-slate-800 p-3 rounded-lg mb-5">
                <div>
                  <span className="text-slate-500 text-[10px] block">Durability</span>
                  <span className="font-bold text-emerald-400">{TURRET_CONFIG.hp} HP</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Sentry Range</span>
                  <span className="font-bold text-sky-400">{TURRET_CONFIG.range}px (360°)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Fire Rate</span>
                  <span className="font-bold text-amber-400">{TURRET_CONFIG.fireRate} rds/sec</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Deployment Key</span>
                  <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                    [T] Key / HUD Button
                  </span>
                </div>
              </div>

              {/* Purchase Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleBuyTurrets(1, TURRET_CONFIG.cost)}
                  disabled={turretCount >= TURRET_CONFIG.maxInventory || coins < TURRET_CONFIG.cost}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    turretCount < TURRET_CONFIG.maxInventory && coins >= TURRET_CONFIG.cost
                      ? 'bg-slate-900 hover:bg-slate-800 border-amber-500/40 text-white cursor-pointer hover:border-amber-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm text-white block">1x Sentry Turret</span>
                    <span className="text-[11px] text-slate-400">Standard single deployment unit</span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400 font-mono font-bold text-xs flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    {TURRET_CONFIG.cost}
                  </span>
                </button>

                <button
                  onClick={() => handleBuyTurrets(3, TURRET_CONFIG.bundleCost)}
                  disabled={turretCount + 3 > TURRET_CONFIG.maxInventory || coins < TURRET_CONFIG.bundleCost}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    turretCount + 3 <= TURRET_CONFIG.maxInventory && coins >= TURRET_CONFIG.bundleCost
                      ? 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-500/50 text-white cursor-pointer hover:border-emerald-400 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white block">3x Squad Sentry Bundle</span>
                      <span className="text-[9px] bg-emerald-500 text-black font-black px-1.5 py-0.2 rounded font-mono">
                        SAVE 60
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">3x placeable sentry turrets</span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400 font-mono font-bold text-xs flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    {TURRET_CONFIG.bundleCost}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Coins are earned by scoring kills (+10), assists (+5), and winning matches.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
