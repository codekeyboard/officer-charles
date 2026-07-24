"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const timer = window.setTimeout(() => ScrollTrigger.refresh(), 80);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
