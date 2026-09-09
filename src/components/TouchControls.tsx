import React, { useRef, useState, useEffect } from 'react';
import { RotateCw, Zap } from 'lucide-react';

interface TouchControlsProps {
  onMove: (x: number, y: number) => void;
  onAim: (angle: number) => void;
  onUseAbility: () => void;
  onReload: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onMove, onAim, onUseAbility, onReload }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Left joystick (Movement)
  const leftStickRef = useRef<HTMLDivElement>(null);
  const [leftTouch, setLeftTouch] = useState<{ active: boolean; startX: number; startY: number; curX: number; curY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
  });

  // Right joystick (Aiming)
  const rightStickRef = useRef<HTMLDivElement>(null);
  const [rightTouch, setRightTouch] = useState<{ active: boolean; startX: number; startY: number; curX: number; curY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
  });

  useEffect(() => {
    // Detect touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
    }
  }, []);

  if (!isTouchDevice) return null;

  const handleLeftTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = leftStickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setLeftTouch({
      active: true,
      startX: cx,
      startY: cy,
      curX: touch.clientX,
      curY: touch.clientY,
    });
  };

  const handleLeftTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!leftTouch.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - leftTouch.startX;
    const dy = touch.clientY - leftTouch.startY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 45;
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    setLeftTouch((prev) => ({
      ...prev,
      curX: prev.startX + Math.cos(angle) * clampedDist,
      curY: prev.startY + Math.sin(angle) * clampedDist,
    }));

    // Send normalized move vector
    onMove(Math.cos(angle) * (clampedDist / maxRadius), Math.sin(angle) * (clampedDist / maxRadius));
  };

  const handleLeftTouchEnd = () => {
    setLeftTouch((prev) => ({ ...prev, active: false }));
    onMove(0, 0);
  };

  const handleRightTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = rightStickRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setRightTouch({
      active: true,
      startX: cx,
      startY: cy,
      curX: touch.clientX,
      curY: touch.clientY,
    });
  };

  const handleRightTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!rightTouch.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - rightTouch.startX;
    const dy = touch.clientY - rightTouch.startY;
    const angle = Math.atan2(dy, dx);

    setRightTouch((prev) => ({
      ...prev,
      curX: touch.clientX,
      curY: touch.clientY,
    }));

    onAim(angle);
  };

  const handleRightTouchEnd = () => {
    setRightTouch((prev) => ({ ...prev, active: false }));
  };

  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none z-30 flex justify-between items-end p-4 pb-8">
      {/* Left Move Stick */}
      <div
        ref={leftStickRef}
        onTouchStart={handleLeftTouchStart}
        onTouchMove={handleLeftTouchMove}
        onTouchEnd={handleLeftTouchEnd}
        onTouchCancel={handleLeftTouchEnd}
        className="pointer-events-auto relative w-32 h-32 rounded-full bg-slate-900/50 border-2 border-slate-700/60 flex items-center justify-center backdrop-blur-sm touch-none"
      >
        <span className="text-[10px] text-slate-400 font-mono select-none">MOVE</span>
        {leftTouch.active && (
          <div
            className="absolute w-12 h-12 rounded-full bg-sky-500/80 border border-white shadow-lg pointer-events-none"
            style={{
              transform: `translate(${leftTouch.curX - leftTouch.startX}px, ${leftTouch.curY - leftTouch.startY}px)`,
            }}
          />
        )}
      </div>

      {/* Quick Mobile Action Buttons */}
      <div className="flex flex-col gap-3 pointer-events-auto mb-2">
        <button
          onClick={onReload}
          className="w-12 h-12 rounded-full bg-slate-800/90 border border-slate-600 flex items-center justify-center text-slate-200 active:scale-95 shadow-lg"
        >
          <RotateCw className="w-5 h-5 text-amber-400" />
        </button>
        <button
          onClick={onUseAbility}
          className="w-14 h-14 rounded-full bg-sky-600/90 border-2 border-sky-300 flex items-center justify-center text-white active:scale-95 shadow-[0_0_15px_rgba(56,189,248,0.5)]"
        >
          <Zap className="w-6 h-6" />
        </button>
      </div>

      {/* Right Aim Stick */}
      <div
        ref={rightStickRef}
        onTouchStart={handleRightTouchStart}
        onTouchMove={handleRightTouchMove}
        onTouchEnd={handleRightTouchEnd}
        onTouchCancel={handleRightTouchEnd}
        className="pointer-events-auto relative w-32 h-32 rounded-full bg-slate-900/50 border-2 border-slate-700/60 flex items-center justify-center backdrop-blur-sm touch-none"
      >
        <span className="text-[10px] text-slate-400 font-mono select-none">AIM / LIGHT</span>
        {rightTouch.active && (
          <div
            className="absolute w-12 h-12 rounded-full bg-amber-500/80 border border-white shadow-lg pointer-events-none"
            style={{
              transform: `translate(${rightTouch.curX - rightTouch.startX}px, ${rightTouch.curY - rightTouch.startY}px)`,
            }}
          />
        )}
      </div>
    </div>
  );
};
