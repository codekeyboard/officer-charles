import { motion } from "motion/react";

export function VoiceMetricsCard({ metrics }: { metrics: Record<string, number> }) {
  const entries = Object.entries(metrics);
  return (
    <div className="dashboard-card p-5">
      <div className="text-sm font-semibold">Speaking Metrics</div>
      <div className="mt-1 text-xs text-muted-foreground">Live analysis of your delivery</div>
      <div className="mt-4 space-y-3.5">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{k}</span>
              <span className="font-semibold text-foreground">{v}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full purple-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${v}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}