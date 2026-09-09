import React, { useEffect, useRef, useState } from 'react';
import { PlayerState, Wall, SoundEcho, GameMode, TeamId, Turret, SafeZone } from '../types/game';
import { MAP_CONFIG } from '../game/constants';
import { Maximize2, Minimize2, Users, Target, Shield } from 'lucide-react';

interface MiniMapProps {
  player: PlayerState | null;
  players: Record<string, PlayerState>;
  walls: Wall[];
  soundEchoes: SoundEcho[];
  gameMode?: GameMode;
  teamScores?: { alpha: number; bravo: number };
  radarActive?: boolean;
  safeZone?: SafeZone;
  turrets?: Turret[];
}

export const MiniMap: React.FC<MiniMapProps> = ({
  player,
  players,
  walls,
  soundEchoes,
  gameMode = 'ffa',
  teamScores,
  radarActive = false,
  safeZone,
  turrets = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFullMap, setIsFullMap] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const now = Date.now();
      const size = canvas.width; // 200px or 240px
      const center = size / 2;

      ctx.clearRect(0, 0, size, size);

      // Radar background
      ctx.fillStyle = 'rgba(10, 15, 29, 0.85)';
      ctx.fillRect(0, 0, size, size);

      // Radar grid rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center, center, center * 0.35, 0, Math.PI * 2);
      ctx.arc(center, center, center * 0.7, 0, Math.PI * 2);
      ctx.arc(center, center, center * 0.95, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(center, 0);
      ctx.lineTo(center, size);
      ctx.moveTo(0, center);
      ctx.lineTo(size, center);
      ctx.stroke();

      // Dynamic radar sweep
      const sweepAngle = (now * 0.0025) % (Math.PI * 2);
      const sweepGradient = ctx.createRadialGradient(center, center, 0, center, center, center * 0.95);
      sweepGradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
      sweepGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, center * 0.95, sweepAngle - 0.5, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();
      ctx.restore();

      // Transform calculation
      // Mode 1: Sector Radar (centered on local player, zoomed in ~750px scan radius)
      // Mode 2: Full Arena Overview (fits entire 3200x3200 arena)
      const scale = isFullMap ? size / MAP_CONFIG.width : size / 1400;
      const offsetX = isFullMap ? 0 : center - (player ? player.x * scale : 0);
      const offsetY = isFullMap ? 0 : center - (player ? player.y * scale : 0);

      // Draw Walls
      ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1;

      for (const w of walls) {
        const wx = w.x * scale + offsetX;
        const wy = w.y * scale + offsetY;
        const ww = w.width * scale;
        const wh = w.height * scale;

        // Skip walls completely outside view
        if (wx + ww < 0 || wx > size || wy + wh < 0 || wy > size) continue;

        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeRect(wx, wy, ww, wh);
      }

      // Draw Sound Echoes (Acoustic ripples)
      for (const echo of soundEchoes) {
        if (now - echo.timestamp > 1500) continue;
        const ageRatio = (now - echo.timestamp) / 1500;
        const ex = echo.x * scale + offsetX;
        const ey = echo.y * scale + offsetY;

        ctx.save();
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.8 * (1 - ageRatio)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ex, ey, (echo.radius * 0.15 + ageRatio * 18) * (isFullMap ? 0.3 : 1), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Battle Royale Safe Zone on Minimap
      if (safeZone) {
        const sx = safeZone.centerX * scale + offsetX;
        const sy = safeZone.centerY * scale + offsetY;
        const sRad = safeZone.radius * scale;

        ctx.save();
        // Safe zone boundary
        ctx.strokeStyle = safeZone.isShrinking ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(2, sRad), 0, Math.PI * 2);
        ctx.stroke();

        if (safeZone.isShrinking && safeZone.targetRadius < safeZone.radius) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(sx, sy, Math.max(2, safeZone.targetRadius * scale), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Deployable Turrets on Minimap
      if (turrets && turrets.length > 0) {
        for (const t of turrets) {
          const tx = t.x * scale + offsetX;
          const ty = t.y * scale + offsetY;
          if (tx < 2 || tx > size - 2 || ty < 2 || ty > size - 2) continue;

          const isMyTurret = Boolean(player && t.ownerId === player.id);
          const isFriendly = Boolean(player && player.team && t.team === player.team);

          ctx.save();
          ctx.fillStyle = isMyTurret ? '#10b981' : isFriendly ? '#38bdf8' : '#ef4444';
          // Diamond shape
          ctx.beginPath();
          ctx.moveTo(tx, ty - 3.5);
          ctx.lineTo(tx + 3.5, ty);
          ctx.lineTo(tx, ty + 3.5);
          ctx.lineTo(tx - 3.5, ty);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw other players
      for (const pId in players) {
        const other = players[pId];
        if (!other.isAlive || (player && other.id === player.id)) continue;

        const isTeammate = Boolean(
          player &&
          player.team &&
          other.team === player.team
        );

        // Visibility determination:
        // Teammates are ALWAYS visible on minimap
        // Enemies are visible if:
        // 1. Valkyrie scan active (radarActive)
        // 2. Close scan proximity (within 600px of player)
        // 3. Actively shooting (revealed on acoustic radar)
        let isEnemyVisible = radarActive || other.isShooting;
        if (player && !isEnemyVisible) {
          const dist = Math.hypot(other.x - player.x, other.y - player.y);
          if (dist < 650) {
            isEnemyVisible = true;
          }
        }

        if (!isTeammate && !isEnemyVisible && !isFullMap) continue;

        const px = other.x * scale + offsetX;
        const py = other.y * scale + offsetY;

        // Skip if outside minimap frame
        if (px < 4 || px > size - 4 || py < 4 || py > size - 4) continue;

        ctx.save();
        if (isTeammate) {
          // Teammate: Friendly Emerald/Cyan Blip
          ctx.fillStyle = '#4ade80';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          // Teammate heading pointer
          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(other.angle) * 7, py + Math.sin(other.angle) * 7);
          ctx.stroke();
        } else {
          // Enemy: Pulsing Crimson Threat Blip
          const pulse = Math.sin(now * 0.01 + other.x) * 0.2 + 0.8;
          ctx.fillStyle = other.isShooting ? '#f59e0b' : '#ef4444';
          ctx.shadowColor = '#dc2626';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(px, py, 4 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Heading line
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + Math.cos(other.angle) * 6, py + Math.sin(other.angle) * 6);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Local Player Position
      if (player) {
        const px = player.x * scale + offsetX;
        const py = player.y * scale + offsetY;

        ctx.save();
        // Local player vision cone on minimap
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        const coneHalfAngle = 0.55;
        const coneRange = isFullMap ? 18 : 34;
        ctx.arc(px, py, coneRange, player.angle - coneHalfAngle, player.angle + coneHalfAngle);
        ctx.closePath();
        ctx.fill();

        // Direction pointer
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(player.angle) * 11, py + Math.sin(player.angle) * 11);
        ctx.stroke();

        // Local Player Core Blip
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Outer pulse ring
        const ringPulse = (now % 1000) / 1000;
        ctx.strokeStyle = `rgba(56, 189, 248, ${1 - ringPulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, 4.5 + ringPulse * 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [player, players, walls, soundEchoes, isFullMap, radarActive, safeZone, turrets]);

  if (isCollapsed) {
    return (
      <div className="fixed top-3 left-3 sm:top-4 sm:left-4 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md cursor-pointer transition-all"
          title="Expand Tactical Mini-Map"
        >
          <Target className="w-3.5 h-3.5 text-amber-400" />
          <span>RADAR [M]</span>
        </button>
      </div>
    );
  }

  const teamAlphaScore = teamScores?.alpha ?? 0;
  const teamBravoScore = teamScores?.bravo ?? 0;
  const myTeam = player?.team;

  return (
    <div className="fixed top-3 left-3 sm:top-4 sm:left-4 z-40 pointer-events-auto select-none">
      <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md w-48 sm:w-56 transition-all ring-1 ring-white/5">
        {/* Radar Header */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="font-bold text-slate-200 tracking-wider">
              {gameMode === 'tdm' ? 'TDM RADAR' : 'FFA RADAR'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullMap(!isFullMap)}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title={isFullMap ? 'Switch to Sector Scan' : 'Switch to Full Arena Map'}
            >
              {isFullMap ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-slate-500 hover:text-slate-300 px-1 py-0.5 text-[9px] font-bold"
              title="Collapse"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Team Score Ticker (In Team Deathmatch) */}
        {gameMode === 'tdm' && (
          <div className="bg-slate-900/70 border-b border-slate-800/80 px-2.5 py-1 flex items-center justify-between text-[9px] font-mono font-bold">
            <div className={`flex items-center gap-1 ${myTeam === 'alpha' ? 'text-sky-400 ring-1 ring-sky-400/30 px-1 rounded' : 'text-slate-400'}`}>
              <span>ALPHA:</span>
              <span className="text-white">{teamAlphaScore}</span>
            </div>
            <span className="text-slate-600">VS</span>
            <div className={`flex items-center gap-1 ${myTeam === 'bravo' ? 'text-rose-400 ring-1 ring-rose-400/30 px-1 rounded' : 'text-slate-400'}`}>
              <span>BRAVO:</span>
              <span className="text-white">{teamBravoScore}</span>
            </div>
          </div>
        )}

        {/* Canvas Screen */}
        <div className="relative flex items-center justify-center p-1.5 bg-slate-950">
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            className="w-full aspect-square rounded-lg border border-slate-800 bg-[#090e1a]"
          />

          {/* Mode Overlay Pill */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 border border-slate-800/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-slate-400 pointer-events-none">
            {isFullMap ? 'ARENA 1:1' : 'SECTOR SCAN'}
          </div>

          {/* Player Grid Position */}
          {player && (
            <div className="absolute bottom-2.5 right-2.5 bg-black/70 border border-slate-800/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-sky-400 pointer-events-none">
              {Math.round(player.x)},{Math.round(player.y)}
            </div>
          )}
        </div>

        {/* Radar Legend Footer */}
        <div className="bg-slate-900/80 border-t border-slate-800 px-2 py-1 flex items-center justify-between text-[8px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" /> YOU
            </span>
            {gameMode === 'tdm' && (
              <span className="flex items-center gap-0.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> SQUAD
              </span>
            )}
            <span className="flex items-center gap-0.5 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> HOSTILE
            </span>
          </div>
          <span className="text-slate-500">ZOOM: [M]</span>
        </div>
      </div>
    </div>
  );
};
