import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { motion, useReducedMotion, Variants } from "motion/react";
import { 
  ArrowRight, 
  BrainCircuit, 
  LineChart, 
  GraduationCap, 
  Target,
  ShieldCheck,
  BookOpenCheck,
  Smartphone
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { routeForRole } from "@/utils/routes";
import { LoadingPanel } from "@/components/LoadingPanel";

export default function LandingPage() {
  const router = useRouter();
  const { user, status } = useAuth();
  const reduceMotion = useReducedMotion();

  // Redirect only if authenticated. If anonymous or error, let them view the landing page!
  useEffect(() => {
    if (status === "authenticated" && user) {
      void router.replace(routeForRole(user.role));
    }
  }, [router, status, user]);

  if (status === "loading") {
    return <LoadingPanel label="Loading Adhyayan..." />;
  }

  // Animation variants
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  return (
    <>
      <Head>
        <title>Adhyayan Brilliant Classes - AI Powered Coaching</title>
        <meta name="description" content="Where Traditional Excellence Meets AI-Powered Learning" />
      </Head>

      <div className="min-h-screen bg-[var(--background)] text-[var(--text)] overflow-hidden selection:bg-[var(--accent)] selection:text-white">
        
        {/* Navigation Bar */}
        <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <Link href="/" className="flex items-center">
                <span className="font-bold text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] uppercase">
                  <span className="hidden sm:inline">ADHYAYAN BRILLIANT CLASSES</span>
                  <span className="sm:hidden">ADHYAYAN</span>
                </span>
              </Link>
              <div className="flex items-center gap-4">
                <Link 
                  href="/login" 
                  className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105 shadow-card"
                >
                  Portal Login
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="relative pt-32 pb-16 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] pointer-events-none -z-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-[100px]" />
            <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[var(--primary)]/20 rounded-full blur-[120px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <motion.div 
              className="text-center max-w-4xl mx-auto"
              initial={reduceMotion ? "visible" : "hidden"}
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)] text-xs font-semibold uppercase tracking-widest mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                </span>
                Admissions Now Open
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="heading-serif text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
                Where Traditional Excellence <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]">Meets AI Learning.</span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-text mb-10 max-w-2xl mx-auto leading-relaxed">
                Join Adhyayan Brilliant Classes for expert offline faculty, personalized AI doubt-solving, and comprehensive parent tracking all in one premium ecosystem.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="/login"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-full bg-[var(--primary)] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#0a2e22] hover:-translate-y-1 shadow-lg shadow-[var(--primary)]/20"
                >
                  Student & Parent Portal <ArrowRight size={18} />
                </Link>
                <a 
                  href="#features"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-full border-2 border-[var(--primary)]/10 px-8 py-4 text-base font-semibold transition-all hover:bg-[var(--primary)]/5"
                >
                  Explore Features
                </a>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-6 flex justify-center">
                <Link 
                  href="/download"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-full bg-surface-strong px-8 py-4 text-base font-semibold text-text-main border-2 border-[var(--primary)]/20 transition-all hover:bg-[var(--primary)]/10 hover:-translate-y-1"
                >
                  <Smartphone size={20} className="text-[var(--primary)]" /> Download Our App
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </main>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-surface-strong border-y border-soft relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="heading-serif text-3xl md:text-5xl font-bold mb-4">Why choose Adhyayan?</h2>
              <p className="text-muted-text max-w-2xl mx-auto">We combine the discipline of physical classroom coaching with the analytical power of modern software.</p>
            </div>

            <motion.div 
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              {[
                {
                  icon: <BrainCircuit size={28} className="text-[var(--accent)]" />,
                  title: "24/7 AI Doubt Resolution",
                  desc: "Stuck on a problem at home? Our AI teacher guides you step-by-step without just giving away the answers."
                },
                {
                  icon: <LineChart size={28} className="text-[var(--accent)]" />,
                  title: "Live Parent Tracking",
                  desc: "Complete visibility for parents. Track daily attendance, test accuracy, and weak subjects right from your phone."
                },
                {
                  icon: <Target size={28} className="text-[var(--accent)]" />,
                  title: "Targeted Practice",
                  desc: "Custom-generated question sets that automatically adapt to focus on your weakest subjects and topics."
                },
                {
                  icon: <GraduationCap size={28} className="text-[var(--accent)]" />,
                  title: "Expert Physical Classes",
                  desc: "The foundation of our success. Highly experienced offline faculty delivering top-tier classroom coaching."
                }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  variants={fadeUp}
                  className="app-shell-card p-8 rounded-[2rem] hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/5 flex items-center justify-center mb-6 border border-[var(--primary)]/10">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-text text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* The Adhyayan Edge Workflow */}
        <section className="py-32 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div 
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
              >
                <motion.h2 variants={fadeUp} className="heading-serif text-3xl md:text-5xl font-bold mb-6">The Adhyayan Edge</motion.h2>
                <motion.p variants={fadeUp} className="text-lg text-muted-text mb-12">A proven three-step workflow that guarantees academic improvement and ensures no student is left behind.</motion.p>
                
                <div className="space-y-8">
                  {[
                    { step: "01", icon: <BookOpenCheck size={24}/>, title: "Learn Offline", text: "Attend highly engaging physical classes with our expert faculty to build a strong fundamental understanding." },
                    { step: "02", icon: <BrainCircuit size={24}/>, title: "Revise with AI", text: "Log into the portal at home to solve custom practice sets and clarify concepts instantly with our AI tutor." },
                    { step: "03", icon: <ShieldCheck size={24}/>, title: "Analyze Progress", text: "Teachers and parents review live analytics to pinpoint weaknesses and intervene before major exams." },
                  ].map((item, i) => (
                    <motion.div key={i} variants={fadeUp} className="flex gap-6">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold shadow-lg">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                        <p className="text-muted-text">{item.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                className="relative h-[600px] rounded-[3rem] overflow-hidden border border-soft bg-[var(--surface)] shadow-2xl p-8 flex flex-col justify-between"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                {/* Abstract graphic representing the platform */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/5 -z-10" />
                
                <div className="space-y-4 max-w-sm mt-8">
                  <div className="h-4 w-32 bg-[var(--primary)]/20 rounded-full animate-pulse" />
                  <div className="h-8 w-64 bg-[var(--primary)]/40 rounded-xl" />
                  <div className="h-4 w-48 bg-[var(--primary)]/20 rounded-full" />
                </div>

                <div className="self-end space-y-4 max-w-sm mb-8 text-right w-full flex flex-col items-end">
                  <div className="h-4 w-32 bg-[var(--accent)]/30 rounded-full animate-pulse" />
                  <div className="h-24 w-72 bg-[var(--accent)]/20 rounded-2xl border border-[var(--accent)]/30 backdrop-blur-md flex items-center justify-center">
                    <LineChart size={40} className="text-[var(--accent)]/50" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[var(--primary)] text-white/80 py-16 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="font-bold text-xl tracking-widest text-white uppercase">
                    ADHYAYAN BRILLIANT CLASSES
                  </span>
                </div>
                <p className="text-sm max-w-xs leading-relaxed">
                  Premium digital infrastructure for modern coaching institutes. Bridging the gap between classroom and home.
                </p>
              </div>
              
              <div>
                <h4 className="text-white font-semibold mb-6">Contact Us</h4>
                <address className="not-italic text-sm space-y-3">
                  <p>Anuradha Nagar, Tejaji Nagar</p>
                  <p>Indore, Madhya Pradesh</p>
                  <p className="mt-4 pt-4 border-t border-white/10 text-white font-medium">
                    Call: +91 9202627229
                  </p>
                </address>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-6">Portals</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/login" className="hover:text-white transition-colors">Student Login</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Parent Portal</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Teacher Dashboard</Link></li>
                  <li><Link href="/login" className="hover:text-white transition-colors">Admin Panel</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <p>© {new Date().getFullYear()} Adhyayan Brilliant Classes. All rights reserved.</p>
              <p>Powered by Advanced Analytics & AI</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
