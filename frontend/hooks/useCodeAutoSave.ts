"use client";
import { useCallback, useEffect, useRef } from "react";

const SAVE_DELAY = 2000;

export function getSavedCode(problemId: string, language: string): string | null {
  if (typeof window === "undefined") return null;
  const key = `code:${problemId}:${language}`;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveCode(problemId: string, language: string, code: string) {
  if (typeof window === "undefined") return;
  const key = `code:${problemId}:${language}`;
  try { localStorage.setItem(key, code); } catch { /* quota exceeded */ }
}

export function useCodeAutoSave(problemId: string, language: string, code: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!code) return;
    timerRef.current = setTimeout(() => {
      saveCode(problemId, language, code);
    }, SAVE_DELAY);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [code, problemId, language]);
}
