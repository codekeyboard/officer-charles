"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const frame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(frame);
    }

    const state = { n: 0 };
    const context = gsap.context(() => {
      gsap.to(state, {
        n: value,
        duration: 1.3,
        ease: "power3.out",
        onUpdate: () => setDisplay(Math.round(state.n)),
        scrollTrigger: {
          trigger: node,
          start: "top 86%",
          once: true,
        },
      });
    }, node);

    return () => context.revert();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {new Intl.NumberFormat("en-US").format(display)}
      {suffix}
    </span>
  );
}
