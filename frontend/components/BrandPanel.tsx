import { motion, useReducedMotion } from "motion/react";

import { BrandSceneSurface } from "./BrandSceneSurface";

const highlights = [
  "AI doubt guidance that teaches before it answers",
  "Attendance, analytics, and parent visibility in one system",
  "Institution-grade product language for school operations"
];

export function BrandPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col justify-between gap-8 rounded-[2rem] border border-soft bg-[linear-gradient(180deg,rgba(15,61,46,0.98),rgba(8,24,19,0.94))] p-6 text-white shadow-card">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-xs uppercase tracking-[0.4em] text-white/65">Adhyayan Brilliant Classes</p>
        <h1 className="heading-serif mt-4 text-4xl leading-tight md:text-5xl">
          Premium digital infrastructure for modern coaching institutes.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-white/78">
          Teaching continuity from classroom to home, supported by guided AI, analytics intelligence, and parent trust.
        </p>
      </motion.div>

      <BrandSceneSurface
        sceneUrl={process.env.NEXT_PUBLIC_LOGIN_SCENE_URL}
        eyebrow="Institution brand surface"
        title="Editorial-grade onboarding atmosphere"
        caption="A premium login surface is built in by default. Add an optional hosted scene later with NEXT_PUBLIC_LOGIN_SCENE_URL."
      />

      <div className="grid gap-3 md:grid-cols-3">
        {highlights.map((highlight, index) => (
          <motion.div
            key={highlight}
            className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-white/80"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index, duration: 0.55 }}
          >
            {highlight}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
