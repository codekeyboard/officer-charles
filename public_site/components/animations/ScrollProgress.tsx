"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const context = gsap.context(() => {
      gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
      gsap.to(bar, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          start: 0,
          end: "max",
          scrub: 0.4,
        },
      });
    }, bar);

    return () => context.revert();
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[90] h-1 bg-transparent">
      <div ref={barRef} className="h-full w-full bg-[#0f766e]" />
    </div>
  );
}
