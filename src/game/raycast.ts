import { Wall } from '../types/game';

// Check intersection of two line segments (p1 -> p2) and (p3 -> p4)
export function getLineIntersection(
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  p4x: number, p4y: number
): { x: number; y: number; distSq: number } | null {
  const d = (p2x - p1x) * (p4y - p3y) - (p2y - p1y) * (p4x - p3x);
  if (Math.abs(d) < 0.00001) return null;

  const u = ((p3x - p1x) * (p4y - p3y) - (p3y - p1y) * (p4x - p3x)) / d;
  const v = ((p3x - p1x) * (p2y - p1y) - (p3y - p1y) * (p2x - p1x)) / d;

  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
    const ix = p1x + u * (p2x - p1x);
    const iy = p1y + u * (p2y - p1y);
    const distSq = (ix - p1x) * (ix - p1x) + (iy - p1y) * (iy - p1y);
    return { x: ix, y: iy, distSq };
  }
  return null;
}

// Raycast against all walls from (x1, y1) to (x2, y2)
export function hasLineOfSight(x1: number, y1: number, x2: number, y2: number, walls: Wall[]): boolean {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    // Quick AABB check to skip distant walls
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    if (maxX < w.x || minX > w.x + w.width || maxY < w.y || minY > w.y + w.height) {
      continue;
    }

    const wx1 = w.x;
    const wy1 = w.y;
    const wx2 = w.x + w.width;
    const wy2 = w.y + w.height;

    // Test the 4 segments of the rectangle
    if (getLineIntersection(x1, y1, x2, y2, wx1, wy1, wx2, wy1)) return false;
    if (getLineIntersection(x1, y1, x2, y2, wx2, wy1, wx2, wy2)) return false;
    if (getLineIntersection(x1, y1, x2, y2, wx2, wy2, wx1, wy2)) return false;
    if (getLineIntersection(x1, y1, x2, y2, wx1, wy2, wx1, wy1)) return false;
  }
  return true;
}

// Find closest intersection of ray from (ox, oy) in direction (dx, dy) up to maxDist
export function castRay(ox: number, oy: number, angle: number, maxDist: number, walls: Wall[]): { x: number; y: number; dist: number } {
  const targetX = ox + Math.cos(angle) * maxDist;
  const targetY = oy + Math.sin(angle) * maxDist;

  let closestDistSq = maxDist * maxDist;
  let hitX = targetX;
  let hitY = targetY;

  const minX = Math.min(ox, targetX);
  const maxX = Math.max(ox, targetX);
  const minY = Math.min(oy, targetY);
  const maxY = Math.max(oy, targetY);

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (maxX < w.x || minX > w.x + w.width || maxY < w.y || minY > w.y + w.height) {
      continue;
    }

    const wx1 = w.x;
    const wy1 = w.y;
    const wx2 = w.x + w.width;
    const wy2 = w.y + w.height;

    const segs = [
      [wx1, wy1, wx2, wy1],
      [wx2, wy1, wx2, wy2],
      [wx2, wy2, wx1, wy2],
      [wx1, wy2, wx1, wy1],
    ];

    for (const [x3, y3, x4, y4] of segs) {
      const hit = getLineIntersection(ox, oy, targetX, targetY, x3, y3, x4, y4);
      if (hit && hit.distSq < closestDistSq) {
        closestDistSq = hit.distSq;
        hitX = hit.x;
        hitY = hit.y;
      }
    }
  }

  return { x: hitX, y: hitY, dist: Math.sqrt(closestDistSq) };
}

// Circle to AABB collision resolver for players against walls
export function resolveWallCollision(x: number, y: number, radius: number, walls: Wall[]): { x: number; y: number } {
  let newX = x;
  let newY = y;

  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    // Find closest point on rectangle to circle center
    const closestX = Math.max(w.x, Math.min(newX, w.x + w.width));
    const closestY = Math.max(w.y, Math.min(newY, w.y + w.height));

    const distX = newX - closestX;
    const distY = newY - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < radius * radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      newX += (distX / dist) * overlap;
      newY += (distY / dist) * overlap;
    } else if (distSq === 0) {
      // Center inside rectangle, push out along shortest axis
      const dl = Math.abs(newX - w.x);
      const dr = Math.abs(w.x + w.width - newX);
      const dt = Math.abs(newY - w.y);
      const db = Math.abs(w.y + w.height - newY);
      const minVal = Math.min(dl, dr, dt, db);
      if (minVal === dl) newX = w.x - radius;
      else if (minVal === dr) newX = w.x + w.width + radius;
      else if (minVal === dt) newY = w.y - radius;
      else newY = w.y + w.height + radius;
    }
  }

  return { x: newX, y: newY };
}

// Calculate angle difference normalized to [-PI, PI]
export function angleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
