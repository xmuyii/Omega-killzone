import React, { useEffect, useState } from 'react';
import { KillEvent } from '../types/game';
import { Skull } from 'lucide-react';

interface KillBannerProps {
  lastKill: KillEvent | null;
  localPlayerId: string;
}

export const KillBanner: React.FC<KillBannerProps> = ({ lastKill, localPlayerId }) => {
  const [activeKill, setActiveKill] = useState<KillEvent | null>(null);

  useEffect(() => {
    if (!lastKill) return;
    if (lastKill.killerId === localPlayerId) {
      setActiveKill(lastKill);
      const timer = setTimeout(() => {
        setActiveKill(null);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [lastKill, localPlayerId]);

  if (!activeKill) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-bounce">
      <div className="bg-red-950/90 border border-red-500 rounded-xl px-5 py-2 shadow-[0_0_25px_rgba(239,68,68,0.6)] backdrop-blur-md flex items-center gap-3 text-white font-mono">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md">
          <Skull className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-red-300 uppercase tracking-widest font-black">
            ENEMY ELIMINATED
          </div>
          <div className="text-sm font-black tracking-wide text-white">
            {activeKill.victimName} <span className="text-amber-400 font-bold ml-1">+100 PTS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
