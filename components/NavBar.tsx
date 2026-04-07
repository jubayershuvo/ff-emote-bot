"use client";

import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
  ReactNode,
} from "react";
import {
  FaHome,
  FaStar,
  FaGraduationCap,
  FaEnvelope,
  FaMoon,
  FaSun,
  FaTimes,
} from "react-icons/fa";

type Props = {
  children: ReactNode;
};

const links = [
  { name: "Home", href: "/", icon: FaHome },
  { name: "Emotes", href: "/", icon: FaStar },
  { name: "Tutorial", href: "#tutorial", icon: FaGraduationCap },
  { name: "Contact", href: "/contact", icon: FaEnvelope },
];

export default function NavBar({ children }: Props) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Initialize theme immediately on mount (before any render)
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
    } else {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setTheme(systemDark ? "dark" : "light");
    }
    setMounted(true);
  }, []);

  // Apply theme class to document element immediately
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock scroll when mobile menu is open
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = isOpen ? "hidden" : "";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, mounted]);

  // listen to system theme changes (only if user hasn't set a preference)
  useEffect(() => {
    if (!mounted) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  // Prevent flash of wrong theme by not rendering until mounted
  if (!mounted) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 transition-colors duration-300">
      {/* NAV */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-white/[0.06] shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16">
          {/* LOGO */}
          <div className="text-sm font-bold tracking-[0.2em] uppercase text-zinc-900 dark:text-white">
            <span className="text-violet-500">✦</span> Emote Bot
          </div>

          {/* DESKTOP */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition flex items-center gap-2"
              >
                <link.icon />
                {link.name}
              </a>
            ))}

            <button
              onClick={toggleTheme}
              className="ml-3 dark:text-white text-black w-9 h-9 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/[0.05]"
            >
              {theme === "dark" ? <FaMoon /> : <FaSun />}
            </button>
          </div>

          {/* MOBILE BTN */}
          <button
            onClick={() => setIsOpen((o) => !o)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px]"
          >
            <span
              className={`block h-px w-5 bg-black dark:bg-white transition ${
                isOpen ? "rotate-45 translate-y-[6px]" : ""
              }`}
            />
            <span
              className={`block h-px w-5 bg-black dark:bg-white transition ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-px w-5 bg-black dark:bg-white transition ${
                isOpen ? "-rotate-45 -translate-y-[6px]" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {/* BACKDROP */}
      <div
        onClick={close}
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* MOBILE MENU */}
      <div
        className={`fixed md:hidden top-0 right-0 h-full w-72 bg-white dark:bg-zinc-900 z-50 transition-transform flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header with Close (Left) and Theme (Right) */}
        <div className="absolute top-0 left-0 right-0 px-5 pt-5 flex items-center justify-between">
          {/* Close Button - Top Left */}
          <button
            onClick={close}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/10 text-black dark:text-white"
          >
            <FaTimes />
          </button>

          {/* Theme Toggle - Top Right */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/10 text-black dark:text-white"
          >
            {theme === "dark" ? <FaMoon /> : <FaSun />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-5 pt-20">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={close}
              className="flex items-center gap-3 py-3 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition"
            >
              <link.icon className="text-lg" />
              <span className="text-base font-medium">{link.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <main className="flex-1">{children}</main>
    </div>
  );
}