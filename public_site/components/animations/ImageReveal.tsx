"use client";

import { ReactNode, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function ImageReveal({
  children,
  className,
  direction = "bottom",
}: {
  children: ReactNode;
  className?: string;
  direction?: "bottom" | "left" | "center";
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const image = node.querySelector("img");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(node, { clipPath: "inset(0% 0% 0% 0%)" });
      if (image) gsap.set(image, { scale: 1, y: 0 });
      return;
    }

    const fromClip =
      direction === "left"
        ? "inset(0% 100% 0% 0%)"
        : direction === "center"
          ? "inset(45% 45% 45% 45%)"
          : "inset(100% 0% 0% 0%)";

    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { clipPath: fromClip },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: node,
            start: "top 84%",
            toggleActions: "play none none none",
          },
        },
      );

      if (image) {
        gsap.fromTo(
          image,
          { scale: 1.18, y: 24 },
          {
            scale: 1,
            y: 0,
            duration: 1.4,
            ease: "power4.out",
            scrollTrigger: {
              trigger: node,
              start: "top 86%",
              toggleActions: "play none none none",
            },
          },
        );

        gsap.to(image, {
          y: -36,
          ease: "none",
          scrollTrigger: {
            trigger: node,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      }
    }, node);

    return () => context.revert();
  }, [direction]);

  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ""}`}>
      {children}
    </div>
  );
}
