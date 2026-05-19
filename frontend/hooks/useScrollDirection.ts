"use client";
import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 30, minSpeed = 0.3) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const lastTime = useRef(Date.now());

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const now = Date.now();
          const deltaY = window.scrollY - lastScrollY.current;
          const deltaT = now - lastTime.current;
          const speed = Math.abs(deltaY) / Math.max(deltaT, 1);

          if (window.scrollY < 100) {
            setVisible(true);
          } else if (deltaY > threshold && speed > minSpeed) {
            setVisible(false);
          } else if (deltaY < -10) {
            setVisible(true);
          }

          lastScrollY.current = window.scrollY;
          lastTime.current = now;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, minSpeed]);

  return visible;
}
