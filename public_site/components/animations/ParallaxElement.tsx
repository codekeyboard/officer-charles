"use client";

import { ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ParallaxElement({
  children,
  className,
  y = -80,
  rotate = 0,
}: {
  children?: ReactNode;
  className?: string;
  y?: number;
  rotate?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const context = gsap.context(() => {
      gsap.to(node, {
        y,
        rotate,
        ease: "none",
        scrollTrigger: {
          trigger: node,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
          // Increase y/rotate props to strengthen parallax on desktop.
        },
      });
    }, node);

    return () => context.revert();
  }, [rotate, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
