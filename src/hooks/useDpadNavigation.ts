'use client';

import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

type Direction = 'up' | 'down' | 'left' | 'right';

const ARROW_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

function centerOf(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function findNext(
  items: HTMLElement[],
  current: HTMLElement,
  direction: Direction
): HTMLElement | null {
  const from = centerOf(current.getBoundingClientRect());

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const item of items) {
    if (item === current) continue;
    const to = centerOf(item.getBoundingClientRect());
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const primary =
      direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
    // Ignore candidates that are not actually in the requested direction.
    if (primary < 8) continue;

    const secondary =
      direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 1.5;

    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return best;
}

function findStartingItem(items: HTMLElement[], container: HTMLElement) {
  const containerCenter = centerOf(container.getBoundingClientRect());
  let best = items[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const item of items) {
    const center = centerOf(item.getBoundingClientRect());
    const distance = Math.hypot(center.x - containerCenter.x, center.y - containerCenter.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }

  return best;
}

/**
 * TV / remote friendly navigation: arrow keys move DOM focus between the
 * interactive elements inside `containerRef`. Enter/Space then activate the
 * focused element natively, just like on a desktop browser.
 */
export function useDpadNavigation(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = ARROW_KEYS[event.key];
      const isActivation =
        event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space';
      if (!direction && !isActivation) return;

      const container = containerRef.current;
      if (!container) return;

      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) return;

      const current = document.activeElement as HTMLElement | null;

      // Phaser captures Enter/Space globally, which suppresses the browser's
      // native button activation. Trigger it ourselves for the focused control.
      if (isActivation) {
        if (!current || !container.contains(current) || !items.includes(current)) return;
        event.preventDefault();
        current.click();
        return;
      }

      event.preventDefault();

      if (!current || !container.contains(current) || !items.includes(current)) {
        findStartingItem(items, container).focus();
        return;
      }

      const next = findNext(items, current, direction);
      if (next) next.focus();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [active, containerRef]);
}
