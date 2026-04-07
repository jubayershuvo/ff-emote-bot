"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiMail, FiMessageSquare, FiSend, FiCheck,
  FiAlertCircle, FiGlobe, FiClock, FiArrowRight,
} from "react-icons/fi";
import { FaGithub, FaXTwitter, FaDiscord } from "react-icons/fa6";
import { MdDownload } from "react-icons/md";

// ── Types ─────────────────────────────────────────────
type Status = "idle" | "sending" | "success" | "error";

type Field = {
  name: string;
  email: string;
  subject: string;
  type: string;
  message: string;
};

// ── Contact cards data ────────────────────────────────
const channels = [
  {
    icon: FiMail,
    label: "Email",
    value: "mdjubayerislamshuvo34@gmail.com",
    sub: "Replies within 24h",
    href: "mailto:mdjubayerislamshuvo34@gmail.com",
    color: "indigo",
  },
  {
    icon: FaGithub,
    label: "GitHub Issues",
    value: "https://github.com/jubayershuvo/ff-emote-bot/issues",
    sub: "Bugs & feature requests",
    href: "https://github.com",
    color: "neutral",
  },
  {
    icon: FaDiscord,
    label: "Discord",
    value: "discord.gg",
    sub: "Community & support",
    href: "https://discord.com/invite/2c7rXufHGb",
    color: "indigo",
  },
  {
    icon: FaXTwitter,
    label: "Twitter / X",
    value: "@emotebot",
    sub: "Updates & announcements",
    href: "https://twitter.com",
    color: "sky",
  },
];

const faqs = [
  {
    q: "Is Emote Bot free to use?",
    a: "Yes! Emote Bot is completely free with no hidden costs. We offer premium tiers for advanced features and higher rate limits.",
  },
  {
    q: "Which platforms does Emote Bot support?",
    a: "Twitch, Discord, YouTube, and many more! We're constantly adding new platform support based on user requests.",
  },
  {
    q: "How do I add Emote Bot to my server?",
    a: "Simply click 'Invite Bot' on our homepage, authorize the bot for your Discord server, and you're ready to go!",
  },
  {
    q: "Can I create custom emotes?",
    a: "Absolutely! Our tutorial section covers everything from basic emote creation to advanced animation techniques.",
  },
  {
    q: "What are the rate limits?",
    a: "Free tier: 1000 commands/month. Premium tiers offer unlimited usage and priority support.",
  },
];

// ── Color map ─────────────────────────────────────────
const colorMap: Record<string, string> = {
  indigo: "bg-indigo-50  dark:bg-indigo-950/50  text-indigo-600  dark:text-indigo-400  border-indigo-200/60  dark:border-indigo-800/40",
  sky: "bg-sky-50     dark:bg-sky-950/50     text-sky-600     dark:text-sky-400     border-sky-200/60     dark:border-sky-800/40",
  emerald: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40",
  neutral: "bg-neutral-100 dark:bg-neutral-800   text-neutral-600 dark:text-neutral-400 border-neutral-200    dark:border-neutral-700",
};

// ── Input component ───────────────────────────────────
function Field({
  label, id, type = "text", placeholder, value, onChange, required, rows,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const base = `w-full bg-neutral-50 dark:bg-neutral-800/60 border rounded-xl text-[13.5px] text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600 outline-none transition-all duration-200 ${focused
      ? "border-indigo-400/60 dark:border-indigo-600/60 ring-2 ring-indigo-500/20"
      : "border-black/[0.08] dark:border-white/[0.08]"
    }`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {rows ? (
        <textarea
          id={id} rows={rows} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className={`${base} px-4 py-3 resize-none`}
        />
      ) : (
        <input
          id={id} type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className={`${base} px-4 py-3`}
        />
      )}
    </div>
  );
}

// ── FAQ accordion ─────────────────────────────────────
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-black/[0.05] dark:border-white/[0.05] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="text-[14px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          {q}
        </span>
        <span className={`text-neutral-400 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <FiArrowRight size={16} />
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-4" : "max-h-0"}`}>
        <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────
export default function ContactPage() {
  const [form, setForm] = useState<Field>({ name: "", email: "", subject: "", type: "general", message: "" });
  const [status, setStatus] = useState<Status>("idle");

  const set = (key: keyof Field) => (val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return;
    setStatus("sending");
    // Replace with your actual API endpoint
    // await fetch("/api/contact", { method: "POST", body: JSON.stringify(form) });
    await new Promise((r) => setTimeout(r, 1400));
    setStatus("success");
  };

  return (
    <div
      className="min-h-screen bg-[#f4f3ef] dark:bg-[#0d0d0f] text-neutral-900 dark:text-neutral-100"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-400/[0.07] dark:bg-indigo-500/[0.06] blur-[110px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-violet-400/[0.06] dark:bg-violet-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 space-y-24">

        {/* ── Hero ── */}
        <section className="text-center space-y-5" style={{ animation: "fadeDown 0.5s ease both" }}>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-indigo-500 dark:text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Get in Touch
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter leading-[1.08]">
            We actually<br />
            <span className="text-indigo-500 dark:text-indigo-400">read our emails.</span>
          </h1>
          <p className="max-w-md mx-auto text-[15px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Bug report, feature idea, emote request, or just want to say hi — we&apos;re here.
          </p>
        </section>

        {/* ── Channel cards ── */}
        <section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ animation: "fadeUp 0.5s 0.08s ease both" }}
        >
          {channels.map(({ icon: Icon, label, value, sub, href, color }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="group flex flex-col gap-3 p-5 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-neutral-900 hover:border-black/[0.1] dark:hover:border-white/[0.1] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_4px_32px_rgba(0,0,0,0.5)] transition-all duration-200"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-0.5">{label}</p>
                <p className="text-[13.5px] font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors break-all">{value}</p>
                <p className="text-[11.5px] text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</p>
              </div>
            </a>
          ))}
        </section>

        {/* ── Form + Hours ── */}
        <section
          className="grid lg:grid-cols-5 gap-8"
          style={{ animation: "fadeUp 0.5s 0.12s ease both" }}
        >
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-neutral-900 shadow-[0_4px_32px_rgba(0,0,0,0.07)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.5)] p-6 sm:p-8">

              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <FiCheck size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-extrabold text-neutral-800 dark:text-neutral-100 mb-1">Message sent! ✨</h3>
                    <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400">We&apos;ll get back to you within 24 hours.</p>
                  </div>
                  <button
                    onClick={() => { setStatus("idle"); setForm({ name: "", email: "", subject: "", type: "general", message: "" }); }}
                    className="mt-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-[20px] font-extrabold text-neutral-900 dark:text-white mb-1">Send a message</h2>
                    <p className="text-[13px] text-neutral-400 dark:text-neutral-500">We read every message personally.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Your Name" id="name" placeholder="John Doe" value={form.name} onChange={set("name")} required />
                      <Field label="Email" id="email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} required />
                    </div>

                    {/* Type selector */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Message Type
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { val: "general", label: "General" },
                          { val: "bug", label: "Bug Report" },
                          { val: "feature", label: "Feature Request" },
                          { val: "emote", label: "Emote Request" },
                          { val: "business", label: "Business" },
                        ].map(({ val, label }) => (
                          <button
                            key={val}
                            onClick={() => set("type")(val)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all duration-150 ${form.type === val
                                ? "bg-indigo-500 text-white border-indigo-500 shadow-[0_2px_8px_rgba(99,102,241,0.35)]"
                                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-black/[0.08] dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-700"
                              }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field label="Subject" id="subject" placeholder="Brief summary of your message" value={form.subject} onChange={set("subject")} />
                    <Field label="Message" id="message" placeholder="Tell us what's on your mind…" value={form.message} onChange={set("message")} required rows={5} />

                    {status === "error" && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-[13px]">
                        <FiAlertCircle size={15} />
                        Something went wrong. Please try again or email us directly.
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={status === "sending" || !form.name || !form.email || !form.message}
                      className="w-full py-3.5 rounded-xl font-bold text-[14px] text-white flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {status === "sending" ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending…
                        </>
                      ) : (
                        <><FiSend size={15} /> Send Message</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Side info */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Response time */}
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-neutral-900 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <FiClock size={17} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-neutral-800 dark:text-neutral-100">Response Times</p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">We&apos;re a small team, but we&apos;re fast</p>
                </div>
              </div>
              {[
                { type: "Bug Reports", time: "2–6 hours", dot: "bg-rose-500" },
                { type: "General", time: "< 24 hours", dot: "bg-indigo-500" },
                { type: "Emote Requests", time: "1–2 days", dot: "bg-violet-500" },
                { type: "Business", time: "Same day", dot: "bg-emerald-500" },
              ].map(({ type, time, dot }) => (
                <div key={type} className="flex items-center justify-between py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    <span className="text-[12.5px] text-neutral-600 dark:text-neutral-400">{type}</span>
                  </div>
                  <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">{time}</span>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-neutral-900 p-5">
              <p className="text-[12px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-4">Quick Links</p>
              {[
                { label: "Report a bug on GitHub", href: "https://github.com/emotebot/emotebot/issues/new", icon: FaGithub },
                { label: "Join our Discord", href: "https://discord.com/invite/2c7rXufHGb", icon: FaDiscord },
                { label: "Follow for updates", href: "https://twitter.com", icon: FaXTwitter },
                { label: "Back to homepage", href: "/", icon: MdDownload },
              ].map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 group"
                >
                  <Icon size={14} className="text-neutral-400 dark:text-neutral-500 shrink-0" />
                  <span className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">{label}</span>
                  <FiArrowRight size={12} className="ml-auto text-neutral-300 dark:text-neutral-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                </a>
              ))}
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">All systems operational</p>
                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70">99.9% uptime · Bot is online</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section style={{ animation: "fadeUp 0.5s 0.2s ease both" }}>
          <div className="text-center mb-10">
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-indigo-500 dark:text-indigo-400">FAQ</span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-2">Common questions.</h2>
          </div>
          <div className="max-w-2xl mx-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-neutral-900 px-6 divide-y divide-black/[0.04] dark:divide-white/[0.04] shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-none">
            {faqs.map(({ q, a }) => <FAQ key={q} q={q} a={a} />)}
          </div>
        </section>

        {/* ── CTA ── */}
        <section style={{ animation: "fadeUp 0.5s 0.25s ease both" }}>
          <div className="relative rounded-2xl overflow-hidden border border-indigo-200/40 dark:border-indigo-800/30 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent p-10 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">Ready to level up your emotes?</h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-[14px] mb-6">Join thousands of creators using Emote Bot daily.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-[14px] text-white bg-indigo-500 hover:bg-indigo-600 shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_28px_rgba(99,102,241,0.55)] active:scale-95 transition-all duration-200"
            >
              <MdDownload size={17} /> Invite Emote Bot
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap');
        @keyframes fadeDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}