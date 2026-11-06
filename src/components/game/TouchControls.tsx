'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Move, Package } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { soundFx } from '@/utils/audio';

const STORAGE_KEY = 'gq-virtual-controls';
const BASE_SIZE = 132;
const KNOB_SIZE = 56;
const DEADZONE = 0.16;

/**
 * Optional on-screen gamepad for phones/tablets and touch laptops.
 * Enabled automatically on coarse-pointer devices; can be toggled from the HUD
 * (or with [G]) on any device.
 */
export default function TouchControls() {
  const {
    activeOverlay,
    virtualControlsEnabled,
    setVirtualControlsEnabled,
    setVirtualInput,
    requestInteraction,
    setOverlay,
    interactionPrompt,
  } = useGameStore();

  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [engaged, setEngaged] = useState(false);

  const visible = virtualControlsEnabled && activeOverlay === 'none';
  const canInteract = Boolean(interactionPrompt);

  // Restore the saved preference, or switch on automatically for touch screens.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage may be blocked; fall back to auto-detection for this session.
    }

    if (stored === 'on') {
      setVirtualControlsEnabled(true);
    } else if (stored === 'off') {
      setVirtualControlsEnabled(false);
    } else {
      const isTouchDevice =
        window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
      if (isTouchDevice) setVirtualControlsEnabled(true);
    }
  }, [setVirtualControlsEnabled]);

  // Never leave the hero drifting when the controls are hidden.
  useEffect(() => {
    if (!visible) {
      setVirtualInput(0, 0);
      setKnob({ x: 0, y: 0 });
      setEngaged(false);
    }
  }, [visible, setVirtualInput]);

  const moveStick = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const radius = rect.width / 2 - KNOB_SIZE / 2;
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);

    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }

    setKnob({ x: dx, y: dy });

    const nx = dx / radius;
    const ny = dy / radius;
    const magnitude = Math.hypot(nx, ny);
    if (magnitude < DEADZONE) {
      setVirtualInput(0, 0);
    } else {
      setVirtualInput(nx, ny);
    }
  };

  const releaseStick = () => {
    pointerIdRef.current = null;
    setEngaged(false);
    setKnob({ x: 0, y: 0 });
    setVirtualInput(0, 0);
  };

  if (!visible) return null;

  const bottom = 'calc(1.25rem + env(safe-area-inset-bottom, 0px))';

  return (
    <div className="pointer-events-none fixed inset-0 z-30 font-pixel select-none">
      {/* Movement joystick */}
      <div className="pointer-events-auto absolute left-4" style={{ bottom, width: BASE_SIZE }}>
        <div
          ref={baseRef}
          role="application"
          aria-label="Bewegungsjoystick"
          onPointerDown={(e) => {
            e.preventDefault();
            pointerIdRef.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            setEngaged(true);
            moveStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (pointerIdRef.current === e.pointerId) moveStick(e.clientX, e.clientY);
          }}
          onPointerUp={releaseStick}
          onPointerCancel={releaseStick}
          onLostPointerCapture={() => {
            if (pointerIdRef.current !== null) releaseStick();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="relative rounded-full border-4 border-black bg-slate-900/85 shadow-pixel"
          style={{ width: BASE_SIZE, height: BASE_SIZE, touchAction: 'none' }}
        >
          <Move className="pointer-events-none absolute inset-0 m-auto h-10 w-10 text-slate-700" />

          <div
            className={`pointer-events-none absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border-4 border-black bg-amber-400 shadow-pixel-sm ${
              engaged ? '' : 'transition-transform duration-150'
            }`}
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-black/30" />
          </div>
        </div>

        <div className="mt-1.5 text-center text-[8px] font-bold tracking-widest text-slate-400">
          BEWEGEN
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="pointer-events-auto absolute right-4 flex flex-col items-center gap-3"
        style={{ bottom }}
      >
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setOverlay('inventory');
          }}
          aria-label="Rucksack öffnen"
          className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-4 border-black bg-slate-900 text-amber-300 shadow-pixel-sm active:translate-y-0.5"
        >
          <Package className="h-5 w-5" />
          <span className="mt-0.5 text-[6px] font-bold uppercase tracking-wide">Rucksack</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!canInteract) return;
            soundFx.playClick();
            requestInteraction();
          }}
          disabled={!canInteract}
          aria-label="Interagieren"
          className={`flex h-20 w-20 flex-col items-center justify-center rounded-full border-4 border-black shadow-pixel transition-all active:translate-y-1 ${
            canInteract
              ? 'bg-amber-400 text-black ring-4 ring-amber-300/40'
              : 'bg-slate-800 text-slate-500 opacity-70'
          }`}
        >
          <span className="text-xl font-bold leading-none">A</span>
          <span className="mt-0.5 text-[7px] font-bold uppercase tracking-wide">Aktion</span>
        </button>
      </div>
    </div>
  );
}
