"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { loadBanner, initNativeBanner, AdsData } from "@/components/adsterra/adsterra";

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type BannerKey = keyof typeof AdsData;
type AdMode = "banner" | "nativebanner";

interface AdPopupOptions {
  mode?: AdMode;
  bannerKey?: BannerKey;
  watchDuration?: number;
  onReward?: () => void;
  onNoReward?: () => void;
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL TRIGGER
═══════════════════════════════════════════════════════════ */
let _open: ((opts: AdPopupOptions) => void) | null = null;

export function openAdPopup(opts: AdPopupOptions = {}) {
  if (!_open) {
    console.warn("openAdPopup: <AdPopupProvider> is not mounted.");
    return;
  }
  _open(opts);
}

export const showBannerAd = (
  bannerKey: BannerKey = "banner300x250",
  onReward?: () => void,
  watchDuration = 10,
  onNoReward?: () => void
) => openAdPopup({ mode: "banner", bannerKey, watchDuration, onReward, onNoReward });

export const showNativeAd = (onReward?: () => void, watchDuration = 10, onNoReward?: () => void) =>
  openAdPopup({ mode: "nativebanner", watchDuration, onReward, onNoReward });

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function isSlotEmpty(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return true;
  const hasIframe = el.querySelector("iframe");
  const hasImg = el.querySelector("img");
  const hasText = (el.innerText || "").trim().length > 10;
  return !hasIframe && !hasImg && !hasText;
}

/* ═══════════════════════════════════════════════════════════
   PROVIDER
═══════════════════════════════════════════════════════════ */
export function AdPopupProvider() {
  const [opts, setOpts] = useState<AdPopupOptions | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [canClose, setCanClose] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [adStatus, setAdStatus] = useState<"loading" | "ok" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  const rewardedRef = useRef(false);
  const closedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    _open = (newOpts) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);
      
      rewardedRef.current = false;
      closedRef.current = false;
      setCanClose(false);
      setSecondsLeft(newOpts.watchDuration ?? 10);
      setAdStatus("loading");
      setAttempt(0);
      setOpts(newOpts);
    };
    return () => { 
      _open = null;
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, []);

  useEffect(() => {
    if (!opts || adStatus === "ok" || adStatus === "failed") return;

    const slotId = opts.mode === "nativebanner" ? "adp-native-slot" : "adp-banner-slot";

    if (checkRef.current) clearTimeout(checkRef.current);

    const loadTimeout = setTimeout(() => {
      if (opts.mode === "nativebanner") {
        initNativeBanner(slotId);
      } else {
        const ad = AdsData[opts.bannerKey ?? "banner300x250"];
        loadBanner(ad.key, ad.width, ad.height, slotId);
      }

      checkRef.current = setTimeout(() => {
        if (isSlotEmpty(slotId)) {
          if (attempt < 1) {
            const el = document.getElementById(slotId);
            if (el) el.innerHTML = "";
            setAttempt((a) => a + 1);
          } else {
            setAdStatus("failed");
            setCanClose(true);
          }
        } else {
          setAdStatus("ok");
        }
      }, 2500);
    }, 100);

    return () => {
      clearTimeout(loadTimeout);
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, [opts, attempt]);

  useEffect(() => {
    if (!opts || adStatus !== "ok") return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [opts, adStatus]);

  const closeWithReward = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    
    if (!rewardedRef.current) {
      rewardedRef.current = true;
      if (opts?.onReward) {
        opts.onReward();
      }
    }
    resetPopup();
  };

  const closeNoReward = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    
    if (opts?.onNoReward) {
      opts.onNoReward();
    }
    resetPopup();
  };

  const resetPopup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (checkRef.current) {
      clearTimeout(checkRef.current);
      checkRef.current = null;
    }
    
    setOpts(null);
    setCanClose(false);
    setAdStatus("loading");
    setAttempt(0);
  };

  if (!mounted || !opts) return null;

  const isNative = opts.mode === "nativebanner";
  const ad = AdsData[opts.bannerKey ?? "banner300x250"];
  const duration = opts.watchDuration ?? 10;
  const popupW = isNative ? 340 : ad.width + 48;

  const R = 16;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (secondsLeft / duration);

  if (adStatus === "failed") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-[320px] rounded-2xl bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 border border-black/10 dark:border-white/10 shadow-xl text-center p-6 gap-3 flex flex-col animate-in zoom-in-95 duration-300">
          <div className="text-red-500 dark:text-red-400 mt-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mx-auto">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" opacity="0.3" />
              <line x1="13" y1="13" x2="27" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="27" y1="13" x2="13" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>

          <p className="text-red-600 dark:text-red-400 text-lg font-extrabold tracking-tight">Ad Failed to Load</p>
          <p className="text-sm text-black/55 dark:text-white/50 leading-relaxed">
            It looks like an <strong>ad blocker</strong> is preventing the ad from showing.
            Please disable your ad blocker to support us and earn rewards.
          </p>

          <div className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 mx-auto">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="10.5" r="0.8" fill="currentColor" />
            </svg>
            No reward will be granted without a valid ad view.
          </div>

          <button 
            onClick={closeNoReward}
            className="mt-2 px-9 py-2.5 rounded-xl font-bold text-sm bg-black/10 dark:bg-white/10 border border-black/15 dark:border-white/15 hover:bg-black/20 dark:hover:bg-white/20 transition-all hover:scale-105 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && canClose && closeWithReward()}
    >
      <div 
        className="relative rounded-2xl p-5 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300 bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 border border-black/10 dark:border-white/10 shadow-xl"
        style={{ width: popupW }}
      >
        {/* Close button area */}
        <div className="absolute top-3 right-3">
          {!canClose ? (
            <div className="flex flex-col items-center gap-0.5 cursor-not-allowed select-none">
              <svg width="38" height="38" viewBox="0 0 40 40" className="drop-shadow-sm">
                <circle cx="20" cy="20" r={R} fill="none" stroke="rgba(150,150,150,0.2)" strokeWidth="2.5" />
                <circle 
                  cx="20" cy="20" r={R} fill="none" 
                  stroke="#facc15" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={dashOffset}
                  transform="rotate(-90 20 20)"
                  style={{ transition: "stroke-dashoffset 0.95s linear" }}
                />
                <line x1="14" y1="14" x2="26" y2="26" stroke="rgba(120,120,120,0.45)" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="26" y1="14" x2="14" y2="26" stroke="rgba(120,120,120,0.45)" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <span className="text-[9px] font-mono font-bold text-black/30 dark:text-white/30">
                {adStatus === "loading" ? "…" : `${secondsLeft}s`}
              </span>
            </div>
          ) : (
            <button 
              onClick={closeWithReward}
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center bg-red-500/10 dark:bg-red-500/15 border border-red-500/40 dark:border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 hover:scale-110 active:scale-95 transition-all"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col items-center gap-1 mt-2">
          <span className="text-[8.5px] font-mono font-extrabold tracking-[0.16em] text-black/30 dark:text-yellow-500/50">
            ● SPONSORED
          </span>
          <p className="text-[15px] font-bold tracking-tight m-0">
            {isNative ? "Recommended" : "Featured Ad"}
          </p>
        </div>

        {/* Ad Slot */}
        {isNative ? (
          <div id="adp-native-slot" className="w-full min-h-[250px] rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10" />
        ) : (
          <div 
            id="adp-banner-slot" 
            className="rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10"
            style={{ width: ad.width, height: ad.height }} 
          />
        )}

        {/* Loading indicator */}
        {adStatus === "loading" && (
          <div className="text-[11px] font-mono font-semibold text-black/30 dark:text-white/30 animate-pulse">
            Loading ad…
          </div>
        )}

        {/* Status */}
        <div className={`flex items-center gap-2 text-[11px] font-semibold px-4 py-1.5 rounded-full transition-all border ${
          canClose 
            ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
            : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/35"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            canClose 
              ? "bg-green-400 shadow-[0_0_6px_#4ade80]" 
              : "bg-yellow-400 animate-pulse shadow-[0_0_6px_#facc15]"
          }`} />
          {canClose
            ? "Reward ready — tap to close"
            : adStatus === "loading"
              ? "Loading ad…"
              : `Available in ${secondsLeft}s`}
        </div>
      </div>
    </div>,
    document.body
  );
}