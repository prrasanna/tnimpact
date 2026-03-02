import { Link } from "react-router-dom";
import {
  AudioLines,
  Bell,
  LayoutGrid,
  Moon,
  Sparkles,
  Mic,
  RouteIcon,
  Volume2,
} from "lucide-react";

// Public landing page.
function Home({ theme, onToggleTheme }) {
  const features = [
    {
      icon: RouteIcon,
      title: "Voice Shipment Tracking",
      description:
        "Track shipment progress hands-free while on the move with real-time audio updates and status reports.",
      accent: "text-cyan-400",
      accentBg: "bg-cyan-500/15",
    },
    {
      icon: Sparkles,
      title: "Task Management",
      description:
        "Manage daily logistics tasks quickly for field and warehouse teams. Voice-assign priorities on the fly.",
      accent: "text-emerald-400",
      accentBg: "bg-emerald-500/15",
    },
    {
      icon: Bell,
      title: "Real-time Notifications",
      description:
        "Receive instant operational updates and delivery alerts via crystal-clear audio notifications.",
      accent: "text-amber-400",
      accentBg: "bg-amber-500/15",
    },
    {
      icon: LayoutGrid,
      title: "Role-Based Dashboard",
      description:
        "Dedicated interfaces for admin, warehouse, and delivery workflows customized for specific operational needs.",
      accent: "text-indigo-400",
      accentBg: "bg-indigo-500/15",
    },
    {
      icon: Volume2,
      title: "Tamil & English Voice Support",
      description:
        "Seamless bilingual support for practical use across Indian logistics operations. Natural processing for both languages.",
      accent: "text-pink-400",
      accentBg: "bg-pink-500/15",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#061327] via-[#063040] to-[#0a5a44] px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <div className="rounded-lg bg-cyan-500 p-1.5">
              <Mic size={14} />
            </div>
            <span>VoiceLogistics</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={onToggleTheme}
              className="rounded-full border border-white/20 bg-white/5 p-2.5 transition hover:bg-white/10"
              aria-label="Toggle theme"
            >
              <Moon
                size={16}
                className={theme === "dark" ? "text-white" : "text-cyan-300"}
              />
            </button>
            <Link to="/login" className="text-white/90 hover:text-white">
              Login
            </Link>
            <Link
              to="/create-account"
              className="rounded-full bg-cyan-500 px-4 py-2 font-semibold text-white transition hover:bg-cyan-400"
            >
              Get Started
            </Link>
          </div>
        </header>

        <section className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Smart Logistics Frontend MVP
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-7xl">
            Voice-Enabled
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Logistics Assistant
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-300 md:text-2xl">
            Hands-free shipment tracking and task management designed for
            dynamic drivers and warehouse specialists.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              className="rounded-2xl bg-white px-8 py-3 font-semibold text-slate-900 shadow-md transition hover:-translate-y-0.5"
            >
              Login to Portal
            </Link>
            <Link
              to="/create-account"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            >
              Create Account
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.slice(0, 4).map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/10 bg-[#0a1b34]/90 p-6 shadow-[0_20px_50px_rgba(2,12,30,0.45)]"
              >
                <div
                  className={`mb-5 inline-flex rounded-xl p-2.5 ${feature.accentBg}`}
                >
                  <Icon size={16} className={feature.accent} />
                </div>
                <h3 className="mb-3 text-3xl font-bold leading-tight text-slate-100 md:text-[31px]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </article>
            );
          })}

          <article className="rounded-3xl border border-white/10 bg-[#0a1b34]/90 p-6 shadow-[0_20px_50px_rgba(2,12,30,0.45)] md:col-span-2">
            <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
              <div>
                <div
                  className={`mb-5 inline-flex rounded-xl p-2.5 ${features[4].accentBg}`}
                >
                  <Volume2 size={16} className={features[4].accent} />
                </div>
                <h3 className="mb-3 text-3xl font-bold leading-tight text-slate-100 md:text-[31px]">
                  {features[4].title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {features[4].description}
                </p>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-[#071b2f] p-5 text-cyan-300">
                <div className="mb-2 flex items-center gap-2">
                  <AudioLines size={18} />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    Listening...
                  </span>
                </div>
                <div className="mt-3 h-8 w-full rounded bg-gradient-to-r from-cyan-500/20 via-cyan-300/40 to-cyan-500/20" />
              </div>
            </div>
          </article>
        </section>

        <footer className="py-12 text-center text-xs text-slate-400">
          © 2024 Voice Logistics AI. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default Home;
