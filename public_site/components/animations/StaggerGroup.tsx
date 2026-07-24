"use client";

import { ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function StaggerGroup({
  children,
  className,
  selector = "[data-stagger-item]",
  stagger = 0.12,
}: {
  children: ReactNode;
  className?: string;
  selector?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(node.querySelectorAll(selector));
    if (targets.length === 0) return;

    if (reduceMotion) {
      gsap.set(targets, { opacity: 1, y: 0, filter: "blur(0px)" });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: 44, filter: "blur(10px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.82,
          ease: "power3.out",
          stagger,
          scrollTrigger: {
            trigger: node,
            start: "top 84%",
            toggleActions: "play none none none",
          },
        },
      );
    }, node);

    return () => context.revert();
  }, [selector, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
