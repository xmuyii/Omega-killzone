import React, { useState } from 'react';
import { Shield, Crosshair, Zap, Heart, Plus, Check, ShoppingBag, X, Layers, Flame, RotateCcw } from 'lucide-react';
import { sounds } from '../game/audio';

export interface StrategicItem {
  id: string;
  name: string;
  category: 'ordnance' | 'defense' | 'tactical';
  cost: number;
  description: string;
  iconText: string;
  color: string;
  badge?: string;
}

export const STRATEGIC_ITEMS: StrategicItem[] = [
  {
    id: 'grenades',
    name: 'FRAG CONCUSSION GRENADES (x2)',
    category: 'ordnance',
    cost: 150,
    description: 'Timed high-explosive ordnance with a 170px radius blast inflicting 420 direct damage.',
    iconText: '💣',
    color: '#ef4444',
    badge: 'TACTICAL ORDNANCE',
  },
  {
    id: 'turret',
    name: 'AUTOMATED SENTRY TURRET',
    category: 'defense',
    cost: 220,
    description: 'Deployable 360-degree autonomous machine gun sentry with laser tracking and twin suppression barrels.',
    iconText: '⚙',
    color: '#f59e0b',
    badge: 'AREA DENIAL',
  },
  {
    id: 'ammo',
    name: 'TACTICAL COMBAT AMMO PACK',
    category: 'tactical',
    cost: 80,
    description: 'Emergency primary caliber reserve. Instantly refills your primary weapon magazine and returns you from sidearm pistol.',
    iconText: '⚡',
    color: '#eab308',
    badge: 'COMBAT RESUPPLY',
  },
  {
    id: 'armor',
    name: 'CERAMIC BALLISTIC VEST (+300)',
    category: 'defense',
    cost: 140,
    description: 'High-density composite armor plating that absorbs 50% of incoming kinetic bullet and blast impacts.',
    iconText: '🛡',
    color: '#3b82f6',
    badge: 'SURVIVABILITY',
  },
  {
    id: 'health',
    name: 'FIELD TRAUMA SYRINGE (+350 HP)',
    category: 'defense',
    cost: 120,
    description: 'Military-grade coagulant medkit for rapid in-field biological resuscitation and health repair.',
    iconText: '✚',
    color: '#22c55e',
    badge: 'FIELD TRIAGE',
  },
  {
    id: 'speed_stim',
    name: 'ADRENALINE SPEED STIMULANT',
    category: 'tactical',
    cost: 110,
    description: 'Neuro-stimulant compound boosting operational sprint and combat strafe velocity by +35% for 7 seconds.',
    iconText: '»',
    color: '#a855f7',
    badge: 'ENHANCEMENT',
  },
];

interface StrategicItemShopModalProps {
  playerCoins: number;
  onClose: () => void;
  onBuyItem: (itemId: string, cost: number) => void;
}

export const StrategicItemShopModal: React.FC<StrategicItemShopModalProps> = ({
  playerCoins,
  onClose,
  onBuyItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ordnance' | 'defense' | 'tactical'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredItems =
    selectedCategory === 'all'
      ? STRATEGIC_ITEMS
      : STRATEGIC_ITEMS.filter((item) => item.category === selectedCategory);

  const handlePurchase = (item: StrategicItem) => {
    if (playerCoins < item.cost) {
      setFeedback(`Insufficient combat credits for ${item.name}!`);
      setTimeout(() => setFeedback(null), 2000);
      return;
    }
    sounds.playAbility();
    onBuyItem(item.id, item.cost);
    setFeedback(`Acquired ${item.name}!`);
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#0a0f1d] border border-slate-700/80 rounded-xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                TACTICAL QUARTERMASTER
              </div>
              <h2 className="text-lg sm:text-xl font-black italic tracking-wide uppercase font-mono text-white">
                STRATEGIC ARMORY & SUPPLIES
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Player Credits Display */}
            <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded flex items-center gap-2 font-mono">
              <span className="text-[10px] text-slate-400 uppercase">CREDITS:</span>
              <span className="text-sm font-bold text-amber-400">🪙 {playerCoins.toLocaleString()}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-1.5 text-xs font-mono text-amber-300 text-center">
            {feedback}
          </div>
        )}

        {/* Category Filters */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 flex gap-2">
          {(['all', 'ordnance', 'defense', 'tactical'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-black border border-emerald-400 font-black'
                  : 'bg-slate-850 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const canAfford = playerCoins >= item.cost;
            return (
              <div
                key={item.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg p-3.5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg border"
                        style={{
                          backgroundColor: `${item.color}15`,
                          borderColor: `${item.color}40`,
                          color: item.color,
                        }}
                      >
                        {item.iconText}
                      </div>
                      <div>
                        <div className="text-xs font-black font-mono text-white group-hover:text-emerald-400 transition-colors uppercase">
                          {item.name}
                        </div>
                        {item.badge && (
                          <div className="text-[9px] font-mono text-slate-500 font-bold uppercase">
                            {item.badge}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-mono font-bold text-amber-400 whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      🪙 {item.cost}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed mb-3">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford}
                  className={`w-full py-2 rounded font-mono font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    canAfford
                      ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-800/40 border border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{canAfford ? 'PURCHASE ITEM' : 'INSUFFICIENT CREDITS'}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>SUPPLIES CAN ALSO BE SALVAGED FROM FLOOR DROPS IN COMBAT</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs uppercase cursor-pointer"
          >
            RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
