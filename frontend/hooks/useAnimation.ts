"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface AnimationState<T> {
  data: T;
  step: number;
  totalSteps: number;
  playing: boolean;
  speed: number; // ms per step
}

export function useAnimation<T>(initialData: T, totalSteps: number) {
  const [state, setState] = useState<AnimationState<T>>({
    data: initialData,
    step: 0,
    totalSteps,
    playing: false,
    speed: 500,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsRef = useRef<{ step: number; data: T }[]>([]);

  const registerSteps = useCallback((steps: { step: number; data: T }[]) => {
    stepsRef.current = steps;
    setState((prev) => ({ ...prev, totalSteps: steps.length - 1 }));
  }, []);

  const goToStep = useCallback((step: number) => {
    const target = stepsRef.current[step];
    if (target) {
      setState((prev) => ({ ...prev, step, data: target.data }));
    }
  }, []);

  const play = useCallback(() => {
    setState((prev) => ({ ...prev, playing: true }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, playing: false }));
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      const nextStep = Math.min(prev.step + 1, prev.totalSteps);
      const target = stepsRef.current[nextStep];
      if (target) return { ...prev, step: nextStep, data: target.data };
      return { ...prev, playing: false };
    });
  }, []);

  const prev = useCallback(() => {
    setState((prev) => {
      const prevStep = Math.max(prev.step - 1, 0);
      const target = stepsRef.current[prevStep];
      if (target) return { ...prev, step: prevStep, data: target.data };
      return prev;
    });
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: 0,
      playing: false,
      data: stepsRef.current[0]?.data ?? initialData,
    }));
  }, [initialData]);

  useEffect(() => {
    if (state.playing) {
      timerRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.step >= prev.totalSteps) {
            return { ...prev, playing: false };
          }
          const nextStep = prev.step + 1;
          const target = stepsRef.current[nextStep];
          if (target) return { ...prev, step: nextStep, data: target.data };
          return prev;
        });
      }, state.speed);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [state.playing, state.speed, state.totalSteps]);

  return { state, registerSteps, play, pause, next, prev, reset, setSpeed, goToStep };
}
