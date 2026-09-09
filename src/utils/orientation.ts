/**
 * Screen orientation and fullscreen management utility for mobile & tactical web games.
 */

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function isMobilePhone(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isCurrentlyLandscape(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.screen?.orientation?.type) {
    return window.screen.orientation.type.startsWith('landscape');
  }
  return window.innerWidth >= window.innerHeight;
}

/**
 * Attempts to automatically lock the screen orientation to landscape.
 * In Chromium/Android, browsers require entering Fullscreen mode before allowing screen.orientation.lock().
 */
export async function requestLandscapeMode(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false };

  try {
    const docEl = document.documentElement as any;

    // Step 1: Request Fullscreen if not already active (required by Android Chrome for orientation lock)
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen().catch(() => {});
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen().catch(() => {});
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen().catch(() => {});
      }
    }

    // Step 2: Request Screen Orientation lock
    const screenAny = window.screen as any;
    if (screenAny?.orientation && typeof screenAny.orientation.lock === 'function') {
      try {
        await screenAny.orientation.lock('landscape');
        return { success: true };
      } catch (err: any) {
        // Some devices support 'landscape-primary'
        try {
          await screenAny.orientation.lock('landscape-primary');
          return { success: true };
        } catch (innerErr: any) {
          return { success: false, error: innerErr?.message || err?.message };
        }
      }
    } else if (typeof screenAny?.lockOrientation === 'function') {
      screenAny.lockOrientation('landscape');
      return { success: true };
    } else if (typeof screenAny?.mozLockOrientation === 'function') {
      screenAny.mozLockOrientation('landscape');
      return { success: true };
    } else if (typeof screenAny?.msLockOrientation === 'function') {
      screenAny.msLockOrientation('landscape');
      return { success: true };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export function exitFullscreen(): void {
  try {
    const doc = document as any;
    if (doc.exitFullscreen) {
      doc.exitFullscreen().catch(() => {});
    } else if (doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen().catch(() => {});
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen().catch(() => {});
    } else if (doc.msExitFullscreen) {
      doc.msExitFullscreen().catch(() => {});
    }
  } catch {
    // Ignore error
  }
}
