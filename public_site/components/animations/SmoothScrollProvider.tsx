"use client";

import Lenis from "lenis";
import { ReactNode, useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.08,
      lerp: 0.09,
      smoothWheel: true,
      touchMultiplier: 1,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      ScrollTrigger.update();
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("load", refresh);
      lenis.destroy();
    };
  }, []);

  return children;
}
