import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, Smartphone, Maximize2, ShieldAlert } from 'lucide-react';
import { isTouchDevice, isCurrentlyLandscape, requestLandscapeMode } from '../utils/orientation';

interface OrientationGuardProps {
  onOrientationChange?: (isLandscape: boolean) => void;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({ onOrientationChange }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [isLocking, setIsLocking] = useState<boolean>(false);

  const checkOrientation = useCallback(() => {
    const isTouch = isTouchDevice();
    const isLand = isCurrentlyLandscape();
    const shouldShow = isTouch && !isLand;
    setIsPortrait(shouldShow);
    if (onOrientationChange) {
      onOrientationChange(isLand);
    }
  }, [onOrientationChange]);

  useEffect(() => {
    checkOrientation();

    // Listen to resize, orientation changes, and screen orientation events
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    const screenAny = window.screen as any;
    if (screenAny?.orientation && typeof screenAny.orientation.addEventListener === 'function') {
      screenAny.orientation.addEventListener('change', checkOrientation);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (screenAny?.orientation && typeof screenAny.orientation.removeEventListener === 'function') {
        screenAny.orientation.removeEventListener('change', checkOrientation);
      }
    };
  }, [checkOrientation]);

  // Attempt automatic switch when player taps button
  const handleForceLandscape = async () => {
    setIsLocking(true);
    await requestLandscapeMode();
    // Short delay to allow browser to complete orientation lock or fullscreen transition
    setTimeout(() => {
      checkOrientation();
      setIsLocking(false);
    }, 400);
  };

  // If already in landscape, or if dismissed by user, do not show
  if (!isPortrait || dismissed) {
    return null;
  }

  return (
    <aside aria-label="Orientation Notice" className="fixed inset-0 z-[100] bg-[#060609]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      {/* Tactical Radar Sweep Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="w-[500px] h-[500px] rounded-full border border-amber-500/30 absolute -top-20 -left-20 animate-spin" style={{ animationDuration: '20s' }} />
        <div className="w-[400px] h-[400px] rounded-full border border-amber-500/20 absolute -bottom-20 -right-20 animate-spin" style={{ animationDuration: '15s' }} />
      </div>

      <div className="relative z-10 max-w-sm w-full bg-slate-900/95 border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-amber-950/40 flex flex-col items-center">
        {/* Animated Phone Rotate Graphic */}
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping opacity-30" />
          <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-500/50 flex items-center justify-center shadow-inner">
            <Smartphone className="w-10 h-10 text-amber-400 animate-bounce" style={{ animationDuration: '2s' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1.5 rounded-full shadow-lg">
            <RotateCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Warning Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>ORIENTATION ALERT // PORTRAIT</span>
        </div>

        {/* Tactical Message */}
        <h2 className="text-lg font-bold text-white font-mono tracking-tight uppercase mb-2">
          ROTATE DEVICE TO LANDSCAPE
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed font-mono mb-6">
          Killzone Zero requires <span className="text-amber-400 font-semibold">Landscape Orientation</span> for dual-stick tactical combat, full-map peripheral radar, and rapid-fire response.
        </p>

        {/* Action Controls */}
        <div className="w-full space-y-3">
          <button
            onClick={handleForceLandscape}
            disabled={isLocking}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Maximize2 className="w-4 h-4" />
            <span>{isLocking ? 'SWITCHING...' : 'LOCK TO LANDSCAPE NOW'}</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-full py-2.5 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[11px] uppercase transition-colors cursor-pointer"
          >
            Continue in portrait mode
          </button>
        </div>

        {/* Helper Note */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
          <RotateCw className="w-3 h-3 text-amber-400/80" />
          <span>Or turn your phone sideways to auto-resume</span>
        </div>
      </div>
    </aside>
  );
};
