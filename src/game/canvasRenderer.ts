import { PlayerState, Wall, Bush, Pickup, SoundEcho, Bullet, HeroId, Turret, SafeZone, ActiveGrenade } from '../types/game';
import { HERO_DEFINITIONS, MAP_CONFIG } from './constants';
import { castRay, hasLineOfSight, filterWallsNear } from './raycast';

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  createdAt: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  decay: number;
}

export interface SplatterDecal {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
  points: { dx: number; dy: number; r: number }[];
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private floatingTexts: FloatingText[] = [];
  private particles: Particle[] = [];
  private splatterDecals: SplatterDecal[] = [];
  private screenShake: number = 0;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private hasInitializedCamera: boolean = false;
  private playerPrevPos: Map<string, { x: number; y: number; lastMove: number }> = new Map();
  private interpPlayers: Map<string, { x: number; y: number; angle: number }> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot acquire 2D context');
    this.ctx = context;
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public addDamageText(x: number, y: number, amount: number, isArmor: boolean, isCrit: boolean = false) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      x: x + (Math.random() - 0.5) * 20,
      y: y - 20,
      text: isCrit ? `${amount} CRIT!` : `-${amount}`,
      color: isCrit ? '#ef4444' : isArmor ? '#38bdf8' : '#fbbf24',
      createdAt: performance.now(),
      life: 800,
    });
  }

  public addJuicyKillSplatter(x: number, y: number, heroColor: string = '#ef4444') {
    // 1. Visceral camera punch shake
    this.screenShake = 18;

    // 2. High-impact blood splatter burst droplets (48-60 particles)
    const bloodColors = ['#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#7f1d1d', '#450a0a'];
    const count = 52;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 140 + Math.random() * 420;
      const size = 3 + Math.random() * 5.5;
      const color = bloodColors[Math.floor(Math.random() * bloodColors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        alpha: 1,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
      });
    }

    // 3. Persistent floor splatter decals (pools and drippings)
    const dripCount = 10 + Math.floor(Math.random() * 8);
    const points: { dx: number; dy: number; r: number }[] = [];
    for (let i = 0; i < dripCount; i++) {
      const dripAngle = Math.random() * Math.PI * 2;
      const dripDist = 12 + Math.random() * 38;
      points.push({
        dx: Math.cos(dripAngle) * dripDist,
        dy: Math.sin(dripAngle) * dripDist,
        r: 3 + Math.random() * 5,
      });
    }

    this.splatterDecals.push({
      x,
      y,
      radius: 28 + Math.random() * 14,
      alpha: 0.88,
      color: '#7f1d1d',
      points,
    });

    if (this.splatterDecals.length > 50) {
      this.splatterDecals.shift();
    }
  }

  public addMuzzleFlash(x: number, y: number, angle: number, color: string) {
    for (let i = 0; i < 6; i++) {
      const pAngle = angle + (Math.random() - 0.5) * 0.8;
      const speed = 100 + Math.random() * 200;
      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(pAngle) * speed,
        vy: Math.sin(pAngle) * speed,
        size: 3 + Math.random() * 3,
        color: color || '#f59e0b',
        alpha: 1,
        life: 1,
        decay: 0.08,
      });
    }
  }

  public addImpactSparks(x: number, y: number, color: string = '#f59e0b') {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 1,
        decay: 0.05,
      });
    }
  }

  public render(
    localPlayerId: string,
    players: Record<string, PlayerState>,
    bullets: Bullet[],
    pickups: Pickup[],
    walls: Wall[],
    bushes: Bush[],
    soundEchoes: SoundEcho[],
    radarActive: boolean = false,
    turrets: Turret[] = [],
    safeZone?: SafeZone,
    spectatedPlayerId?: string,
    grenades: ActiveGrenade[] = [],
    freeCamPos?: { x: number; y: number } | null
  ) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const now = performance.now();

    ctx.clearRect(0, 0, width, height);

    // Update smooth player interpolation to eliminate 25Hz stepping jitter
    for (const pId in players) {
      const p = players[pId];
      let interp = this.interpPlayers.get(pId);
      if (!interp) {
        interp = { x: p.x, y: p.y, angle: p.angle };
        this.interpPlayers.set(pId, interp);
      } else {
        const dist = Math.hypot(p.x - interp.x, p.y - interp.y);
        if (dist > 300) {
          interp.x = p.x;
          interp.y = p.y;
          interp.angle = p.angle;
        } else {
          interp.x += (p.x - interp.x) * 0.35;
          interp.y += (p.y - interp.y) * 0.35;
          let dAngle = p.angle - interp.angle;
          while (dAngle > Math.PI) dAngle -= Math.PI * 2;
          while (dAngle < -Math.PI) dAngle += Math.PI * 2;
          interp.angle += dAngle * 0.4;
        }
      }
    }
    for (const id of this.interpPlayers.keys()) {
      if (!players[id]) this.interpPlayers.delete(id);
    }

    const localPlayer = players[localPlayerId];
    const isSpectating = !localPlayer || localPlayerId.startsWith('spec-');

    // Determine target player for camera and fog of war: local player if alive, then spectated target, then any alive operative
    const targetPlayer = (localPlayer && localPlayer.isAlive)
      ? localPlayer
      : (spectatedPlayerId && players[spectatedPlayerId]?.isAlive)
      ? players[spectatedPlayerId]
      : (localPlayer || Object.values(players).find((p) => p.isAlive) || null);

    const targetInterp = targetPlayer ? this.interpPlayers.get(targetPlayer.id) : null;
    const targetPlayerX = targetInterp ? targetInterp.x : (targetPlayer?.x || 0);
    const targetPlayerY = targetInterp ? targetInterp.y : (targetPlayer?.y || 0);
    const targetPlayerAngle = targetInterp ? targetInterp.angle : (targetPlayer?.angle || 0);

    // Camera target: prioritize freeCamPos (if in free cam spectator mode), then targetPlayer
    if (freeCamPos) {
      const targetCamX = freeCamPos.x - width / 2;
      const targetCamY = freeCamPos.y - height / 2;
      const minCamX = 0;
      const maxCamX = Math.max(0, MAP_CONFIG.width - width);
      const minCamY = 0;
      const maxCamY = Math.max(0, MAP_CONFIG.height - height);
      this.cameraX += (Math.max(minCamX, Math.min(maxCamX, targetCamX)) - this.cameraX) * 0.25;
      this.cameraY += (Math.max(minCamY, Math.min(maxCamY, targetCamY)) - this.cameraY) * 0.25;
    } else {
      if (targetPlayer) {
        // Smooth camera leading towards aim direction
        const leadX = Math.cos(targetPlayerAngle) * (isSpectating ? 0 : 75);
        const leadY = Math.sin(targetPlayerAngle) * (isSpectating ? 0 : 75);
        const targetCamX = targetPlayerX + leadX - width / 2;
        const targetCamY = targetPlayerY + leadY - height / 2;

        // Constrain camera within map bounds
        const minCamX = 0;
        const maxCamX = Math.max(0, MAP_CONFIG.width - width);
        const minCamY = 0;
        const maxCamY = Math.max(0, MAP_CONFIG.height - height);
        const clampedX = Math.max(minCamX, Math.min(maxCamX, targetCamX));
        const clampedY = Math.max(minCamY, Math.min(maxCamY, targetCamY));

        if (!this.hasInitializedCamera) {
          this.cameraX = clampedX;
          this.cameraY = clampedY;
          this.hasInitializedCamera = true;
        } else {
          this.cameraX += (clampedX - this.cameraX) * 0.25;
          this.cameraY += (clampedY - this.cameraY) * 0.25;
        }
      }
    }

    // Apply visceral screen shake
    if (this.screenShake > 0) {
      this.cameraX += (Math.random() - 0.5) * this.screenShake;
      this.cameraY += (Math.random() - 0.5) * this.screenShake;
      this.screenShake *= 0.88;
      if (this.screenShake < 0.5) this.screenShake = 0;
    }

    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    // 1. Draw Arena Floor (Tactical Grid)
    this.drawFloor(ctx, width, height);

    // 1.5. Draw Visceral Blood Splatter Decals
    this.drawSplatterDecals(ctx);

    // 2. Draw Battle Royale Safe Zone (Behind walls/props)
    if (safeZone) {
      this.drawSafeZone(ctx, safeZone, now);
    }

    // 3. Draw Pickups
    this.drawPickups(ctx, pickups, now);

    // 4. Draw Bushes
    this.drawBushes(ctx, bushes);

    // 5. Draw Walls & Pillars
    this.drawWalls(ctx, walls);

    // 6. Draw Deployable Machine Gun Turrets
    if (turrets && turrets.length > 0) {
      this.drawTurrets(ctx, turrets, now, localPlayer);
    }

    // 7. Draw Fog of War & Flashlight Vision Cone for local player or tracked target (spectators have full tactical overview)
    if (targetPlayer && targetPlayer.isAlive && !isSpectating) {
      this.drawFogOfWar(ctx, targetPlayer, walls, width, height);
    }

    // 8. Draw Sound Echoes (Acoustic ripples through the fog)
    this.drawSoundEchoes(ctx, soundEchoes, now, localPlayerId);

    // 9. Draw Bullets
    this.drawBullets(ctx, bullets);

    // 9.5 Draw Active Flying Grenades
    if (grenades && grenades.length > 0) {
      this.drawGrenades(ctx, grenades, now);
    }

    // 10. Draw Particles & Sparks
    this.updateAndDrawParticles(ctx, 0.016);

    // 11. Draw Players (Check visibility vs local player)
    const offscreenEnemies: { p: PlayerState; angle: number; dist: number }[] = [];

    for (const pId in players) {
      const p = players[pId];
      if (!p.isAlive) {
        // If local player is dead, draw respawn marker
        if (p.id === localPlayerId) {
          this.drawRespawnBeacon(ctx, p, now);
        }
        continue;
      }

      const isLocal = p.id === localPlayerId;
      const isTeammate = Boolean(
        localPlayer &&
        localPlayer.team &&
        p.team === localPlayer.team &&
        !isLocal
      );
      let isDirectlyVisible = isSpectating || isLocal || isTeammate;

      if (!isDirectlyVisible && localPlayer) {
        if (radarActive) {
          isDirectlyVisible = true;
        } else {
          // Check line of sight
          const los = hasLineOfSight(localPlayer.x, localPlayer.y, p.x, p.y, walls);
          const dist = Math.hypot(p.x - localPlayer.x, p.y - localPlayer.y);
          const heroDef = HERO_DEFINITIONS[localPlayer.heroId];

          // Peripheral vision (close proximity)
          if (dist <= MAP_CONFIG.peripheralVisionDistance && los) {
            isDirectlyVisible = true;
          } else if (dist <= heroDef.fireRange * 1.25 && los) {
            // Check flashlight cone
            const angleToEnemy = Math.atan2(p.y - localPlayer.y, p.x - localPlayer.x);
            let dAngle = Math.abs(angleToEnemy - localPlayer.angle);
            while (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;

            if (dAngle <= MAP_CONFIG.flashlightAngle / 2) {
              if (p.abilityActive?.type === 'camo') {
                isDirectlyVisible = dist < 90 || p.isShooting;
              } else if (p.isInBush && !localPlayer.isInBush && !p.isShooting) {
                isDirectlyVisible = false;
              } else {
                isDirectlyVisible = true;
              }
            }
          }
        }
      }

      // Check if enemy is on-screen vs off-screen for radar chevrons
      const screenX = p.x - this.cameraX;
      const screenY = p.y - this.cameraY;
      const onScreen = screenX >= -50 && screenX <= width + 50 && screenY >= -50 && screenY <= height + 50;

      if (!isLocal && localPlayer && !onScreen && !isSpectating) {
        const dx = p.x - localPlayer.x;
        const dy = p.y - localPlayer.y;
        const dist = Math.hypot(dx, dy);
        offscreenEnemies.push({ p, angle: Math.atan2(dy, dx), dist });
      }

      // Render player: If directly visible, full render; if concealed/shadows, render as tactical acoustic silhouette
      const pInterp = this.interpPlayers.get(p.id) || { x: p.x, y: p.y, angle: p.angle };
      this.drawPlayer(ctx, p, isLocal, now, !isDirectlyVisible && !isTeammate, isTeammate, pInterp.x, pInterp.y, pInterp.angle);
    }

    // 12. Draw Floating Damage Numbers
    this.drawFloatingTexts(ctx, now);

    ctx.restore();

    // 13. Draw Offscreen Threat Chevrons (Radar HUD overlay in screen coordinates)
    if (localPlayer && !isSpectating) {
      this.drawOffscreenThreats(ctx, offscreenEnemies, width, height);
    }
  }

  private drawRespawnBeacon(ctx: CanvasRenderingContext2D, p: PlayerState, now: number) {
    const interp = this.interpPlayers.get(p.id) || { x: p.x, y: p.y };
    ctx.save();
    ctx.translate(interp.x, interp.y);
    const pulse = Math.sin(now * 0.008) * 0.3 + 0.7;
    ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fill();

    const wallClockNow = Date.now();
    const remainingSec = p.respawnAt > wallClockNow ? Math.ceil((p.respawnAt - wallClockNow) / 1000) : 0;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText(remainingSec > 0 ? `RESPAWNING: ${remainingSec}s` : 'DEPLOYING...', 0, -32);
    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D, screenW: number, screenH: number) {
    const W = MAP_CONFIG.width;
    const H = MAP_CONFIG.height;

    // Tactical dark base - only fill the visible screen viewport
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(this.cameraX - 10, this.cameraY - 10, screenW + 20, screenH + 20);

    // Floor tile grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)'; // slate-800
    ctx.lineWidth = 1.5;
    const gridSize = 100;

    const startX = Math.max(0, Math.floor(this.cameraX / gridSize) * gridSize);
    const endX = Math.min(W, Math.ceil((this.cameraX + screenW) / gridSize) * gridSize);
    const startY = Math.max(0, Math.floor(this.cameraY / gridSize) * gridSize);
    const endY = Math.min(H, Math.ceil((this.cameraY + screenH) / gridSize) * gridSize);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Subtle tactical center zone markings (only rendered if near viewport)
    const centerX = W / 2;
    const centerY = H / 2;
    const camCenterX = this.cameraX + screenW / 2;
    const camCenterY = this.cameraY + screenH / 2;
    if (Math.hypot(centerX - camCenterX, centerY - camCenterY) < 800) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)'; // cyan ring
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 280, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawSafeZone(ctx: CanvasRenderingContext2D, safeZone: SafeZone, now: number) {
    const { centerX, centerY, radius, targetRadius, isShrinking } = safeZone;

    ctx.save();

    // 1. Draw Storm Hazard tint outside safeZone.radius using viewport bounds
    ctx.beginPath();
    ctx.rect(this.cameraX - 10, this.cameraY - 10, this.canvas.width + 20, this.canvas.height + 20);
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.fill();

    // 2. Hazard boundary pulse ring
    const pulse = Math.sin(now * 0.006) * 0.2 + 0.8;
    ctx.strokeStyle = isShrinking ? `rgba(239, 68, 68, ${pulse})` : `rgba(56, 189, 248, ${pulse * 0.9})`;
    ctx.lineWidth = isShrinking ? 6 : 4;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright electric edge
    ctx.setLineDash([]);
    ctx.strokeStyle = isShrinking ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // If shrinking, draw target radius ghost circle
    if (isShrinking && targetRadius < radius) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, targetRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawTurrets(ctx: CanvasRenderingContext2D, turrets: Turret[], now: number, localPlayer?: PlayerState) {
    const left = this.cameraX - 60;
    const right = this.cameraX + this.canvas.width + 60;
    const top = this.cameraY - 60;
    const bottom = this.cameraY + this.canvas.height + 60;

    for (const t of turrets) {
      if (t.x < left || t.x > right || t.y < top || t.y > bottom) continue;
      ctx.save();
      ctx.translate(t.x, t.y);

      const isOwner = localPlayer && t.ownerId === localPlayer.id;
      const isTeammate = localPlayer && localPlayer.team && t.team === localPlayer.team && !isOwner;
      const teamColor = isOwner ? '#10b981' : isTeammate ? '#38bdf8' : '#ef4444';

      // Base: Fortified circular mount
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner metallic core ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      // Rotating Twin Turret Cannon Barrels
      ctx.rotate(t.angle);

      // Twin Gun Barrels
      ctx.fillStyle = '#475569';
      ctx.fillRect(4, -6, 16, 4);
      ctx.fillRect(4, 2, 16, 4);

      // Barrel tips
      ctx.fillStyle = '#64748b';
      ctx.fillRect(18, -6.5, 3, 5);
      ctx.fillRect(18, 1.5, 3, 5);

      // Center Gun Pod
      ctx.fillStyle = teamColor;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      // Laser aiming sight when targeting an enemy
      if (t.targetPlayerId) {
        ctx.strokeStyle = `rgba(239, 68, 68, ${Math.sin(now * 0.02) * 0.3 + 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(240, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.rotate(-t.angle);

      // Turret Health Bar
      const hpPercent = Math.max(0, Math.min(1, t.hp / t.maxHp));
      const barWidth = 32;
      const barHeight = 4;
      const barY = -26;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

      ctx.fillStyle = hpPercent > 0.4 ? teamColor : '#ef4444';
      ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);

      // Name label
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(isOwner ? 'YOUR SENTRY' : `${t.ownerName}'S TURRET`, 0, barY - 4);

      ctx.restore();
    }
  }

  private drawPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[], now: number) {
    const left = this.cameraX - 40;
    const right = this.cameraX + this.canvas.width + 40;
    const top = this.cameraY - 40;
    const bottom = this.cameraY + this.canvas.height + 40;

    for (const p of pickups) {
      if (p.x < left || p.x > right || p.y < top || p.y > bottom) continue;
      const bob = Math.sin(now * 0.005 + p.x) * 3;
      const y = p.y + bob;

      // Glow halo
      ctx.beginPath();
      ctx.arc(p.x, y, 22, 0, Math.PI * 2);
      let glowColor = 'rgba(56, 189, 248, 0.2)';
      let mainColor = '#38bdf8';
      let iconText = 'A';

      if (p.type === 'health') {
        glowColor = 'rgba(34, 197, 94, 0.25)';
        mainColor = '#22c55e';
        iconText = '+';
      } else if (p.type === 'armor') {
        glowColor = 'rgba(59, 130, 246, 0.25)';
        mainColor = '#3b82f6';
        iconText = '🛡';
      } else if (p.type === 'ammo') {
        glowColor = 'rgba(234, 179, 8, 0.35)';
        mainColor = '#eab308';
        iconText = '⚡';
      } else if (p.type === 'turret') {
        glowColor = 'rgba(245, 158, 11, 0.35)';
        mainColor = '#f59e0b';
        iconText = '⚙';
      } else if (p.type === 'grenade') {
        glowColor = 'rgba(239, 68, 68, 0.35)';
        mainColor = '#ef4444';
        iconText = '💣';
      } else if (p.type === 'speed_boost') {
        glowColor = 'rgba(168, 85, 247, 0.25)';
        mainColor = '#a855f7';
        iconText = '»';
      } else if (p.type === 'damage_boost') {
        glowColor = 'rgba(239, 68, 68, 0.25)';
        mainColor = '#ef4444';
        iconText = '⚔';
      }

      ctx.fillStyle = glowColor;
      ctx.fill();

      // Crate box
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - 14, y - 14, 28, 28, 6);
      ctx.fill();
      ctx.stroke();

      // Icon
      ctx.fillStyle = mainColor;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(iconText, p.x, y);
    }
  }

  private drawSplatterDecals(ctx: CanvasRenderingContext2D) {
    if (this.splatterDecals.length === 0) return;
    const left = this.cameraX - 60;
    const right = this.cameraX + this.canvas.width + 60;
    const top = this.cameraY - 60;
    const bottom = this.cameraY + this.canvas.height + 60;

    for (const d of this.splatterDecals) {
      if (d.x + d.radius < left || d.x - d.radius > right || d.y + d.radius < top || d.y - d.radius > bottom) {
        continue;
      }
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;

      ctx.beginPath();
      // Central puddle
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      // Dripping satellite splatters in same path
      for (const pt of d.points) {
        ctx.moveTo(d.x + pt.dx + pt.r, d.y + pt.dy);
        ctx.arc(d.x + pt.dx, d.y + pt.dy, pt.r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawGrenades(ctx: CanvasRenderingContext2D, grenades: ActiveGrenade[], now: number) {
    const left = this.cameraX - 60;
    const right = this.cameraX + this.canvas.width + 60;
    const top = this.cameraY - 60;
    const bottom = this.cameraY + this.canvas.height + 60;

    for (const g of grenades) {
      if (g.x < left || g.x > right || g.y < top || g.y > bottom) continue;
      ctx.save();
      ctx.translate(g.x, g.y);

      // Warning blast radius ring (growing in intensity before detonation)
      const timeLeft = Math.max(0, g.explodesAt - Date.now());
      const pulseRate = Math.sin(now * 0.03) * 0.25 + 0.75;
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulseRate * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Grenade body (metallic olive drab canister)
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Flashing fuse LED
      ctx.fillStyle = timeLeft < 400 || (Math.floor(now / 120) % 2 === 0) ? '#ef4444' : '#71717a';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawBushes(ctx: CanvasRenderingContext2D, bushes: Bush[]) {
    const left = this.cameraX - 60;
    const right = this.cameraX + this.canvas.width + 60;
    const top = this.cameraY - 60;
    const bottom = this.cameraY + this.canvas.height + 60;

    for (const b of bushes) {
      if (b.x + b.radius < left || b.x - b.radius > right || b.y + b.radius < top || b.y - b.radius > bottom) {
        continue;
      }
      // Multi-layer foliage
      ctx.fillStyle = 'rgba(20, 83, 45, 0.75)'; // deep forest green
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(22, 101, 52, 0.85)';
      ctx.beginPath();
      ctx.arc(b.x - 8, b.y - 8, b.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.beginPath();
      ctx.arc(b.x + 6, b.y + 6, b.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[]) {
    const left = this.cameraX - 60;
    const right = this.cameraX + this.canvas.width + 60;
    const top = this.cameraY - 60;
    const bottom = this.cameraY + this.canvas.height + 60;

    for (const w of walls) {
      if (w.x + w.width < left || w.x > right || w.y + w.height < top || w.y > bottom) {
        continue;
      }
      if (w.type === 'crate') {
        // Cargo crate styling
        ctx.fillStyle = '#334155';
        ctx.fillRect(w.x, w.y, w.width, w.height);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.width, w.height);

        // Cross pattern on crate
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x + w.width, w.y + w.height);
        ctx.moveTo(w.x + w.width, w.y);
        ctx.lineTo(w.x, w.y + w.height);
        ctx.stroke();
      } else if (w.type === 'pillar') {
        // Reinforced pillar
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(w.x, w.y, w.width, w.height, 8);
        ctx.fill();

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(w.x + w.width / 2, w.y + w.height / 2, w.width * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Heavy industrial wall
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(w.x, w.y, w.width, w.height);

        // Highlight upper edge
        ctx.fillStyle = '#475569';
        ctx.fillRect(w.x, w.y, w.width, 4);

        // Border
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(w.x, w.y, w.width, w.height);
      }
    }
  }

  private drawFogOfWar(ctx: CanvasRenderingContext2D, localPlayer: PlayerState, walls: Wall[], screenW: number, screenH: number) {
    const heroDef = HERO_DEFINITIONS[localPlayer.heroId];
    const flashDist = Math.max(heroDef.fireRange * 1.2, MAP_CONFIG.flashlightDistance);
    const flashAngle = MAP_CONFIG.flashlightAngle;
    const periphDist = MAP_CONFIG.peripheralVisionDistance;

    // Save context to draw dark shroud overlay
    ctx.save();

    // Pre-filter candidate walls near player
    const coneWalls = filterWallsNear(localPlayer.x, localPlayer.y, flashDist, walls);
    const periphWalls = filterWallsNear(localPlayer.x, localPlayer.y, periphDist, walls);

    // 1. Raycast the flashlight cone polygon (optimized 40 rays)
    const numRays = 40;
    const halfAngle = flashAngle / 2;
    const startAngle = localPlayer.angle - halfAngle;
    const stepAngle = flashAngle / (numRays - 1);

    const conePoints: { x: number; y: number }[] = [];
    for (let i = 0; i < numRays; i++) {
      const ang = startAngle + i * stepAngle;
      const hit = castRay(localPlayer.x, localPlayer.y, ang, flashDist, coneWalls);
      conePoints.push(hit);
    }

    // 2. Peripheral 360 circle rays
    const periphRays = 24;
    const periphPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < periphRays; i++) {
      const ang = (i / periphRays) * Math.PI * 2;
      const hit = castRay(localPlayer.x, localPlayer.y, ang, periphDist, periphWalls);
      periphPoints.push(hit);
    }

    // Draw ambient darkness over visible screen
    // First, draw a soft flashlight cone beam on the ground (tactical aesthetic)
    const flashGrad = ctx.createRadialGradient(
      localPlayer.x, localPlayer.y, 10,
      localPlayer.x, localPlayer.y, flashDist
    );
    flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    flashGrad.addColorStop(0.6, 'rgba(240, 249, 255, 0.08)');
    flashGrad.addColorStop(1, 'rgba(240, 249, 255, 0)');

    ctx.beginPath();
    ctx.moveTo(localPlayer.x, localPlayer.y);
    for (const pt of conePoints) {
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.fillStyle = flashGrad;
    ctx.fill();

    // Peripheral ambient glow
    const periphGrad = ctx.createRadialGradient(
      localPlayer.x, localPlayer.y, 5,
      localPlayer.x, localPlayer.y, periphDist
    );
    periphGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    periphGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(localPlayer.x, localPlayer.y, periphDist, 0, Math.PI * 2);
    ctx.fillStyle = periphGrad;
    ctx.fill();

    ctx.restore();
  }

  private drawSoundEchoes(ctx: CanvasRenderingContext2D, echoes: SoundEcho[], _now: number, localPlayerId: string) {
    const wallClockNow = Date.now();
    const left = this.cameraX - 100;
    const right = this.cameraX + this.canvas.width + 100;
    const top = this.cameraY - 100;
    const bottom = this.cameraY + this.canvas.height + 100;

    for (const echo of echoes) {
      if (echo.sourcePlayerId === localPlayerId) continue; // Don't show own echoes
      if (echo.x < left || echo.x > right || echo.y < top || echo.y > bottom) continue;
      const elapsed = wallClockNow - echo.timestamp;
      if (elapsed < 0 || elapsed > 1800) continue;

      const progress = Math.max(0, Math.min(1, elapsed / 1800)); // 0 to 1
      const alpha = (1 - progress) * 0.85;
      const radiusBase = typeof echo.radius === 'number' && Number.isFinite(echo.radius) && echo.radius > 0 ? echo.radius : 50;
      const currentRadius = Math.max(1, radiusBase * (0.3 + progress * 0.7));
      if (!Number.isFinite(currentRadius) || currentRadius <= 0) continue;

      ctx.save();
      ctx.lineWidth = 2.5;

      if (echo.type === 'gunfire') {
        // Red alarming gunfire echo ripple
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.arc(echo.x, echo.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.2})`;
        ctx.fill();

        // Acoustic icon
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ SHOTS', echo.x, echo.y);
      } else if (echo.type === 'footstep') {
        // Amber/Cyan footstep echo arcs
        ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
        ctx.beginPath();
        ctx.arc(echo.x, echo.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Footprint ripples
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(echo.x, echo.y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Blue reload / ability ping
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(echo.x, echo.y, currentRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]) {
    if (bullets.length === 0) return;
    const left = this.cameraX - 40;
    const right = this.cameraX + this.canvas.width + 40;
    const top = this.cameraY - 40;
    const bottom = this.cameraY + this.canvas.height + 40;

    ctx.save();
    for (const b of bullets) {
      if (b.x < left || b.x > right || b.y < top || b.y > bottom) continue;
      const len = 18;
      const backX = b.x - (b.vx / 600) * len;
      const backY = b.y - (b.vy / 600) * len;

      ctx.strokeStyle = b.color || '#f59e0b';
      ctx.lineWidth = b.isExplosive ? 4.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(backX, backY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Bullet head
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.isExplosive ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    p: PlayerState,
    isLocal: boolean,
    now: number,
    isShadowSilhouette: boolean = false,
    isTeammate: boolean = false,
    drawX?: number,
    drawY?: number,
    drawAngle?: number
  ) {
    const hero = HERO_DEFINITIONS[p.heroId] || HERO_DEFINITIONS.assault;
    const rad = MAP_CONFIG.playerRadius;
    const posX = drawX ?? p.x;
    const posY = drawY ?? p.y;
    const angle = drawAngle ?? p.angle;

    ctx.save();
    ctx.translate(posX, posY);

    // If teammate, render tactical squad marker
    if (isTeammate) {
      ctx.save();
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, rad + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // If enemy is in shadow / fog, render an acoustic thermal silhouette aura around them, but ALWAYS draw the full character model!
    if (isShadowSilhouette && !isLocal) {
      const pulse = Math.sin(now * 0.008 + p.x) * 0.25 + 0.6;
      ctx.save();
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      // Outer acoustic wave ring
      ctx.beginPath();
      ctx.arc(0, 0, rad + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();

      // Heading indicator
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * (rad + 14), Math.sin(angle) * (rad + 14));
      ctx.stroke();

      // Enemy label
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const label = p.isShooting ? '⚡ [FIRING]' : (Math.abs(p.vx) > 1 || Math.abs(p.vy) > 1) ? '» [MOVING]' : '[ENEMY]';
      ctx.fillText(label, 0, -rad - 12);
      ctx.restore();
    }

    // 1. Draw Auto-Fire Cone (Signature Bullet Echo feature!)
    this.drawAutoFireCone(ctx, p, hero, isLocal, now, angle);

    // 2. Active Special Ability Visuals
    if (p.abilityActive) {
      if (p.abilityActive.type === 'shield') {
        // Deployable energy barrier arc in front
        ctx.save();
        ctx.rotate(angle);
        // Outer glow arc
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, rad + 20, -Math.PI * 0.38, Math.PI * 0.38);
        ctx.stroke();
        // Inner core arc
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, rad + 20, -Math.PI * 0.38, Math.PI * 0.38);
        ctx.stroke();
        ctx.restore();
      } else if (p.abilityActive.type === 'camo') {
        ctx.globalAlpha = isLocal ? 0.45 : 0.25;
      }
    }

    // 3. Dynamic Walking Leg Strides (Visible movement feedback!)
    const prev = this.playerPrevPos.get(p.id);
    let isMoving = Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5;
    if (prev) {
      const movedDist = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (movedDist > 0.2) {
        isMoving = true;
        prev.lastMove = now;
      } else if (now - prev.lastMove < 250) {
        // Sustain walk cycle between network update ticks
        isMoving = true;
      }
      prev.x = p.x;
      prev.y = p.y;
    } else {
      this.playerPrevPos.set(p.id, { x: p.x, y: p.y, lastMove: isMoving ? now : 0 });
    }

    const strideFreq = 0.016;
    const stride = isMoving ? Math.sin(now * strideFreq) * 9 : 0;

    ctx.save();
    ctx.rotate(angle);

    // Left & Right Legs
    ctx.fillStyle = '#1e293b'; // Tactical combat pants
    // Left leg
    ctx.beginPath();
    ctx.roundRect(-rad * 0.5 + stride, -rad * 0.65, 14, 8, 3);
    ctx.fill();
    // Left combat boot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-rad * 0.5 + stride + 9, -rad * 0.65, 5, 8);

    // Right leg
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-rad * 0.5 - stride, rad * 0.65 - 8, 14, 8, 3);
    ctx.fill();
    // Right combat boot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-rad * 0.5 - stride + 9, rad * 0.65 - 8, 5, 8);

    // 4. Detailed Character Torso & Arms (Customized to 3 Hero Archetypes)
    const isTitan = p.heroId === 'titan' || p.heroId === 'bastion';
    const isValkyrie = p.heroId === 'valkyrie' || p.heroId === 'mirage';
    const recoil = p.isShooting ? -3.5 : 0;

    if (isTitan) {
      // --- CHARACTER 1: TITAN (CYBORG COMMANDO - Image 1) ---
      // Heavy Olive Camo Plate Carrier
      ctx.fillStyle = '#3f4f34';
      ctx.beginPath();
      ctx.ellipse(0, 0, rad * 1.1, rad * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ammo Chest Pouches & Webbing
      ctx.fillStyle = '#222d1d';
      ctx.fillRect(-rad * 0.5, -rad * 0.5, rad * 0.8, 6);
      ctx.fillRect(-rad * 0.5, rad * 0.15, rad * 0.8, 6);

      // Left Arm (Organic Muscular Arm with dark skin tone)
      ctx.fillStyle = '#3d2417';
      ctx.beginPath();
      ctx.ellipse(rad * 0.2, -rad * 0.75, 10, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // RIGHT ARM: SIGNATURE BIONIC CYBERNETIC MECHANICAL ARM (from Image 1!)
      ctx.fillStyle = '#64748b'; // Chrome/Steel base
      ctx.beginPath();
      ctx.ellipse(rad * 0.2, rad * 0.75, 12, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Glowing Cyan LED Conduit Lines
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rad * 0.05, rad * 0.75);
      ctx.lineTo(rad * 0.45, rad * 0.75);
      ctx.stroke();

      // Chrome Robotic Hand gripping chaingun
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(rad * 0.5, rad * 0.65, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Heavy Rotary Autocannon Weapon (Image 1)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(rad * 0.2 + recoil, -6, rad * 1.4, 12);
      // Twin Heavy Barrels
      ctx.fillStyle = '#334155';
      ctx.fillRect(rad * 0.9 + recoil, -5, rad * 0.8, 3.5);
      ctx.fillRect(rad * 0.9 + recoil, 1.5, rad * 0.8, 3.5);
      // Ammo Drum
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(rad * 0.4 + recoil, -9, 6, 0, Math.PI * 2);
      ctx.fill();

      // Head: Muscular Bald Head with Facial Combat Scar (Image 1)
      ctx.fillStyle = '#3d2417';
      ctx.beginPath();
      ctx.arc(rad * 0.05, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      // Facial combat scar
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rad * 0.1, -3);
      ctx.lineTo(rad * 0.25, 2);
      ctx.stroke();

    } else if (isValkyrie) {
      // --- CHARACTER 3: VALKYRIE (RECON COMMANDO - Image 3) ---
      // Hardened Segmented Angular Plate Armor
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, rad * 0.95, rad * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      // Emerald Armor Accents & Pauldrons
      ctx.fillStyle = '#047857';
      ctx.beginPath();
      ctx.arc(-rad * 0.1, -rad * 0.7, 6.5, 0, Math.PI * 2);
      ctx.arc(-rad * 0.1, rad * 0.7, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Arms: Armored gauntlets
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.ellipse(rad * 0.2, -rad * 0.65, 8, 5, 0.3, 0, Math.PI * 2);
      ctx.ellipse(rad * 0.2, rad * 0.65, 8, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // High-Velocity V-88 Rail-Carbine Weapon (Image 3)
      ctx.fillStyle = '#090d16';
      ctx.fillRect(rad * 0.1 + recoil, -3.5, rad * 1.6, 7);
      // Green Holographic Reflex Sight
      ctx.fillStyle = '#10b981';
      ctx.fillRect(rad * 0.5 + recoil, -5.5, 6, 2.5);

      // Head: Female Operative with Dark Ponytail & Scar (Image 3)
      ctx.fillStyle = '#e2b49a'; // Skin tone
      ctx.beginPath();
      ctx.arc(rad * 0.05, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      // Tied-back dark ponytail
      ctx.fillStyle = '#261711';
      ctx.beginPath();
      ctx.arc(-rad * 0.45, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      // Facial scar
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(rad * 0.1, -2);
      ctx.lineTo(rad * 0.2, 1);
      ctx.stroke();

      // SIGNATURE SILVER DOG TAGS GLINTING BETWEEN COLLARBONES (from Image 3!)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(rad * 0.3, 0, 2, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // --- CHARACTER 2: STALKER (ASSAULT TROOPER - Image 2) ---
      // Tactical Olive Assault Plate Carrier
      ctx.fillStyle = '#47553b';
      ctx.beginPath();
      ctx.ellipse(0, 0, rad, rad * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dual Mag Pouches & Sheath
      ctx.fillStyle = '#2e3a24';
      ctx.fillRect(-rad * 0.3, -rad * 0.45, rad * 0.6, 5);
      ctx.fillRect(-rad * 0.3, rad * 0.15, rad * 0.6, 5);

      // Arms: Muscular tactical rolled sleeves
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.ellipse(rad * 0.2, -rad * 0.7, 9, 5.5, 0.25, 0, Math.PI * 2);
      ctx.ellipse(rad * 0.2, rad * 0.7, 9, 5.5, -0.25, 0, Math.PI * 2);
      ctx.fill();

      // AR-7 Cobra Assault Rifle Weapon (Image 2)
      ctx.fillStyle = '#111827';
      ctx.fillRect(rad * 0.2 + recoil, -4, rad * 1.3, 8);
      // Foregrip & Suppressor
      ctx.fillStyle = '#374151';
      ctx.fillRect(rad * 0.6 + recoil, -5.5, 4, 3);
      ctx.fillRect(rad * 1.2 + recoil, -2.5, 7, 5);

      // Head: Cropped Military Buzzcut with Cheek Battle Scar (Image 2)
      ctx.fillStyle = '#d4a373';
      ctx.beginPath();
      ctx.arc(rad * 0.05, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      // Short cropped hair
      ctx.fillStyle = '#382618';
      ctx.beginPath();
      ctx.arc(rad * 0.02, 0, 6, Math.PI * 0.4, Math.PI * 1.6);
      ctx.fill();
      // Cheek combat scar
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rad * 0.08, -3);
      ctx.lineTo(rad * 0.22, 1);
      ctx.stroke();
    }

    // Muzzle flash when actively shooting
    if (p.isShooting) {
      const flashX = rad * 1.6 + recoil;
      // Outer bright flash halo
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.beginPath();
      ctx.arc(flashX, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      // Core flash
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(flashX, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Local player tactical ring
    if (isLocal) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, rad + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Directional aim arrow
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(rad + 7, 0);
      ctx.lineTo(rad + 2, -4);
      ctx.lineTo(rad + 2, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore(); // restore rotation

    // 5. Status Bars Above Player (HP & Armor)
    const barW = 46;
    const barH = 5;
    const barY = -rad - 22;

    // HP Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

    // HP Bar
    const hpRatio = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);

    // Armor Bar
    if (p.maxArmor > 0) {
      const armorRatio = Math.max(0, p.armor / p.maxArmor);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(-barW / 2 - 1, barY - 6, barW + 2, 4);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-barW / 2, barY - 5, barW * armorRatio, 3);
    }

    // Status / Name Label
    if (p.isReloading) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RELOADING...', 0, barY - 10);
    } else {
      ctx.fillStyle = isLocal ? '#38bdf8' : isTeammate ? '#4ade80' : '#f87171';
      ctx.font = isLocal ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      const teamTag = p.team ? (p.team === 'alpha' ? '[ALPHA] ' : '[BRAVO] ') : '';
      const displayName = p.isBot ? `[BOT] ${teamTag}${p.name}` : `${teamTag}${p.name}`;
      ctx.fillText(displayName, 0, barY - (p.maxArmor > 0 ? 10 : 8));
    }

    // 6. High-Value Bounty Target Overhead Indicator
    if (p.hasBounty && p.bountyReward) {
      const pulse = Math.sin(now * 0.008) * 0.25 + 0.75;
      const bountyY = barY - (p.maxArmor > 0 ? 25 : 22);

      ctx.save();
      // Tactical background pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
      ctx.lineWidth = 2;

      const tagText = `👑 WANTED: ${p.bountyReward} GOLD`;
      ctx.font = 'bold 9px monospace';
      const textMetrics = ctx.measureText(tagText);
      const pillW = textMetrics.width + 16;
      const pillH = 16;

      ctx.beginPath();
      ctx.roundRect(-pillW / 2, bountyY - pillH / 2, pillW, pillH, 4);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, 0, bountyY);
      ctx.restore();

      // Golden targeting reticle around the bounty character
      ctx.save();
      ctx.strokeStyle = `rgba(245, 158, 11, ${pulse * 0.8})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, rad + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawAutoFireCone(
    ctx: CanvasRenderingContext2D,
    p: PlayerState,
    hero: typeof HERO_DEFINITIONS[HeroId],
    isLocal: boolean,
    now: number,
    aimAngle?: number
  ) {
    const range = hero.fireRange;
    const halfAngle = hero.fireAngle / 2;
    const curAngle = aimAngle ?? p.angle;
    const startAngle = curAngle - halfAngle;
    const endAngle = curAngle + halfAngle;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, startAngle, endAngle);
    ctx.closePath();

    if (p.isShooting && p.targetPlayerId) {
      // TARGET ACQUIRED: Pulse bright red and lock on!
      const pulse = Math.sin(now * 0.02) * 0.1 + 0.25;
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.fill();

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Range indicator arc line
      ctx.strokeStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(0, 0, range, startAngle, endAngle);
      ctx.stroke();
    } else {
      // Passive search cone
      const alpha = isLocal ? 0.08 : 0.03;
      ctx.fillStyle = isLocal ? `rgba(56, 189, 248, ${alpha})` : 'rgba(255, 255, 255, 0.02)';
      ctx.fill();

      ctx.strokeStyle = isLocal ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Delineate Clear Firing Range and Projectile Speed for local player
    if (isLocal) {
      const midAngle = p.angle;
      const textX = Math.cos(midAngle) * (range + 14);
      const textY = Math.sin(midAngle) * (range + 14);

      ctx.fillStyle = p.isShooting ? '#f87171' : '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${range}px • ${hero.bulletSpeed}px/s`, textX, textY);
    }

    ctx.restore();
  }

  private drawOffscreenThreats(
    ctx: CanvasRenderingContext2D,
    threats: { p: PlayerState; angle: number; dist: number }[],
    screenW: number,
    screenH: number
  ) {
    const margin = 28;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    for (const t of threats) {
      // Calculate intersection of angle with screen boundary rectangle
      const cos = Math.cos(t.angle);
      const sin = Math.sin(t.angle);

      let edgeX = centerX;
      let edgeY = centerY;

      if (Math.abs(cos) * centerY > Math.abs(sin) * centerX) {
        // Intersects left or right edge
        edgeX = cos > 0 ? screenW - margin : margin;
        edgeY = centerY + (sin / Math.abs(cos)) * (centerX - margin);
      } else {
        // Intersects top or bottom edge
        edgeY = sin > 0 ? screenH - margin : margin;
        edgeX = centerX + (cos / Math.abs(sin)) * (centerY - margin);
      }

      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(t.angle);

      // Red Threat Chevron Arrow
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Distance tag
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(t.dist / 20)}m`, 0, 16);
      ctx.restore();
    }
  }

  private updateAndDrawParticles(ctx: CanvasRenderingContext2D, dt: number) {
    if (this.particles.length === 0) return;
    const left = this.cameraX - 40;
    const right = this.cameraX + this.canvas.width + 40;
    const top = this.cameraY - 40;
    const bottom = this.cameraY + this.canvas.height + 40;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.x < left || p.x > right || p.y < top || p.y > bottom) {
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.size > 0 && Number.isFinite(p.size)) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, now: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      const elapsed = now - ft.createdAt;
      if (elapsed > ft.life) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      const progress = elapsed / ft.life;
      const alpha = 1 - progress;
      const curY = ft.y - progress * 35; // float upwards

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      // Crisp outline without expensive canvas shadowBlur
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, curY);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, curY);
      ctx.restore();
    }
  }
}
