"use client";
import { useEffect, useRef, useCallback } from "react";

interface SSEOptions {
  onMessage: (data: unknown) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useSSE(url: string, options: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!options.enabled) return;
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        optionsRef.current.onMessage(parsed);
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = (event) => {
      optionsRef.current.onError?.(event);
      es.close();
    };
    eventSourceRef.current = es;
  }, [url, options.enabled]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return {
    close: () => eventSourceRef.current?.close(),
    reconnect: connect,
  };
}
