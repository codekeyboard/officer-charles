"use client";

import { ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type FadeUpProps = {
  children: ReactNode;
  className?: string;
  y?: number;
  start?: string;
  once?: boolean;
};

export function FadeUp({
  children,
  className,
  y = 72,
  start = "top 82%",
  once = true,
}: FadeUpProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(node, { opacity: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power4.out",
          clearProps: "willChange",
          scrollTrigger: {
            trigger: node,
            start,
            toggleActions: once ? "play none none none" : "play none none reverse",
            // Adjust start above to reveal earlier/later. Use "top 75%" for earlier reveals.
          },
        },
      );
    }, node);

    return () => context.revert();
  }, [once, start, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
