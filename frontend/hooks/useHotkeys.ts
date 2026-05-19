"use client";
import { useEffect } from "react";

interface HotkeyDef {
  key: string;
  ctrl?: boolean;
  handler: () => void;
  enabled?: boolean;
}

export function useHotkeys(hotkeys: HotkeyDef[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const hk of hotkeys) {
        if (hk.enabled === false) continue;
        const ctrlMatch = hk.ctrl ? (e.ctrlKey || e.metaKey) : true;
        if (e.key === hk.key && ctrlMatch) {
          e.preventDefault();
          hk.handler();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hotkeys]);
}
