import { cn } from '../lib/utils';
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className,
  hover = true,
  strong = false,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  strong?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        strong ? "glass-strong" : "glass",
        hover && "glass-hover",
        "rounded-2xl",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
