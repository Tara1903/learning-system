import { motion, useReducedMotion } from "motion/react";

interface BrandSceneSurfaceProps {
  sceneUrl?: string;
  heightClassName?: string;
  eyebrow?: string;
  title?: string;
  caption: string;
}

function buildSceneEmbedUrl(sceneUrl: string): string | null {
  if (/^https?:\/\//i.test(sceneUrl)) {
    return sceneUrl;
  }

  return null;
}

export function BrandSceneSurface({
  sceneUrl,
  heightClassName = "h-[360px]",
  eyebrow = "Brand scene",
  title = "Immersive learning surface",
  caption
}: BrandSceneSurfaceProps) {
  const reduceMotion = useReducedMotion();
  const embedUrl = sceneUrl ? buildSceneEmbedUrl(sceneUrl) : null;

  if (!sceneUrl || !embedUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-[2rem] border border-soft bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.28),_transparent_34%),linear-gradient(135deg,rgba(15,61,46,0.97),rgba(7,21,17,0.97))] ${heightClassName}`}
      >
        <div className="absolute inset-0 opacity-80">
          <div className="absolute left-10 top-8 h-24 w-24 rounded-full bg-[rgba(212,175,55,0.26)] blur-2xl" />
          <div className="absolute right-12 top-10 h-40 w-40 rounded-full border border-white/10 bg-white/6 blur-sm" />
          <div className="absolute bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-[36px] border border-white/10 bg-white/6 backdrop-blur-md" />
          <motion.div
            className="absolute left-[14%] top-[30%] h-28 w-28 rounded-[2rem] border border-white/15 bg-[rgba(255,255,255,0.06)]"
            animate={reduceMotion ? undefined : { y: [0, -10, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[18%] right-[16%] h-24 w-24 rounded-full border border-[rgba(212,175,55,0.32)] bg-[rgba(212,175,55,0.08)]"
            animate={reduceMotion ? undefined : { y: [0, 8, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="relative flex h-full flex-col justify-end p-6 text-white">
          <p className="text-xs uppercase tracking-[0.34em] text-white/70">{eyebrow}</p>
          <h3 className="heading-serif mt-3 max-w-lg text-3xl leading-tight">{title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/82">{caption}</p>
          <p className="mt-2 max-w-xl text-xs text-white/58">
            Add any trusted hosted scene URL later if you want a live 3D or animated surface. The default experience stays premium without it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`overflow-hidden rounded-[2rem] border border-soft bg-surface ${heightClassName}`}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <iframe title={title} src={embedUrl} loading="lazy" className="h-full w-full border-0" allow="fullscreen" />
    </motion.div>
  );
}
