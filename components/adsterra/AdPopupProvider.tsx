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
   AD BLOCKER DETECTION - IMMEDIATE CHECK
═══════════════════════════════════════════════════════════ */
function isAdBlocked(): boolean {
  // Method 1: Check for blocked ad script (most reliable)
  const adScript = document.querySelector('script[src*="googlesyndication"]');
  if (adScript && !adScript.clientHeight) {
    return true;
  }
  
  // Method 2: Create test ad element
  const testAd = document.createElement('div');
  testAd.className = 'adsbox';
  testAd.style.cssText = 'position:absolute;top:-1000px;left:-1000px;width:1px;height:1px;';
  document.body.appendChild(testAd);
  
  const isBlocked = testAd.offsetHeight === 0 && testAd.offsetWidth === 0;
  document.body.removeChild(testAd);
  
  return isBlocked;
}

/* ═══════════════════════════════════════════════════════════
   PROVIDER
═══════════════════════════════════════════════════════════ */
export function AdPopupProvider() {
  const [opts, setOpts] = useState<AdPopupOptions | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [canClose, setCanClose] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ad-load state
  const [adStatus, setAdStatus] = useState<"loading" | "ok" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  const rewardedRef = useRef(false);
  const closedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noRewardCalledRef = useRef(false);

  /* client-only guard */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  /* register global trigger - IMMEDIATE ADBLOCKER CHECK */
  useEffect(() => {
    _open = (newOpts) => {
      // Reset all states
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);
      
      rewardedRef.current = false;
      closedRef.current = false;
      noRewardCalledRef.current = false;
      setCanClose(false);
      setSecondsLeft(newOpts.watchDuration ?? 10);
      setAdStatus("loading");
      setAttempt(0);
      
      // IMMEDIATE AD BLOCKER CHECK - call onNoReward right away without showing popup
      if (isAdBlocked()) {
        console.log("Ad blocker detected - calling onNoReward immediately");
        if (newOpts.onNoReward && !noRewardCalledRef.current) {
          noRewardCalledRef.current = true;
          newOpts.onNoReward();
        }
        return; // Don't show popup at all
      }
      
      setOpts(newOpts);
    };
    return () => { 
      _open = null;
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, []);

  /* ── load ad & check emptiness ── */
  useEffect(() => {
    if (!opts || adStatus === "ok" || adStatus === "failed") return;

    const slotId = opts.mode === "nativebanner" ? "adp-native-slot" : "adp-banner-slot";

    // Clear any pending check
    if (checkRef.current) clearTimeout(checkRef.current);

    // Small delay to ensure DOM is ready
    const loadTimeout = setTimeout(() => {
      // Inject ad
      if (opts.mode === "nativebanner") {
        initNativeBanner(slotId);
      } else {
        const ad = AdsData[opts.bannerKey ?? "banner300x250"];
        loadBanner(ad.key, ad.width, ad.height, slotId);
      }

      // Check after 2.5s if anything rendered
      checkRef.current = setTimeout(() => {
        if (isSlotEmpty(slotId)) {
          if (attempt < 1) {
            // Retry once
            const el = document.getElementById(slotId);
            if (el) el.innerHTML = "";
            setAttempt((a) => a + 1);
          } else {
            // Both attempts failed - call onNoReward and close
            setAdStatus("failed");
            if (opts?.onNoReward && !noRewardCalledRef.current) {
              noRewardCalledRef.current = true;
              opts.onNoReward();
            }
            resetPopup();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, attempt]);

  /* ── countdown (only when ad loaded ok) ── */
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

  /* ── close handlers ── */
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

  const resetPopup = () => {
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (checkRef.current) {
      clearTimeout(checkRef.current);
      checkRef.current = null;
    }
    
    // Reset state
    setOpts(null);
    setCanClose(false);
    setAdStatus("loading");
    setAttempt(0);
  };

  // Don't show anything if ad blocker detected or no opts
  if (!mounted || !opts) return null;

  const isNative = opts.mode === "nativebanner";
  const ad = AdsData[opts.bannerKey ?? "banner300x250"];
  const duration = opts.watchDuration ?? 10;
  const popupW = isNative ? 340 : ad.width + 48;

  const R = 16;
  const circ = 2 * Math.PI * R;
  const dashOffset = circ * (secondsLeft / duration);

  /* ── NORMAL STATE ── */
  return createPortal(
    <>
      <style>{CSS}</style>

      <div className="adp-overlay" onClick={(e) => e.target === e.currentTarget && canClose && closeWithReward()}>
        <div className="adp-popup" style={{ width: popupW }}>

          {/* close ring / button */}
          <div className="adp-close-wrap">
            {!canClose ? (
              <div className="adp-ring" title="Watch to unlock">
                <svg width="38" height="38" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r={R} fill="none"
                    stroke="rgba(150,150,150,0.2)" strokeWidth="2.5" />
                  <circle cx="20" cy="20" r={R} fill="none"
                    stroke="#facc15" strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={dashOffset}
                    transform="rotate(-90 20 20)"
                    style={{ transition: "stroke-dashoffset 0.95s linear" }} />
                  <line x1="14" y1="14" x2="26" y2="26"
                    stroke="rgba(120,120,120,0.45)" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="26" y1="14" x2="14" y2="26"
                    stroke="rgba(120,120,120,0.45)" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <span className="adp-ring-label">
                  {adStatus === "loading" ? "…" : `${secondsLeft}s`}
                </span>
              </div>
            ) : (
              <button className="adp-close-btn" onClick={closeWithReward} aria-label="Close">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* header */}
          <div className="adp-header">
            <span className="adp-badge">● SPONSORED</span>
            <p className="adp-title">{isNative ? "Recommended" : "Featured Ad"}</p>
          </div>

          {/* ad slot */}
          {isNative ? (
            <div id="adp-native-slot" className="adp-slot adp-slot--native" />
          ) : (
            <div id="adp-banner-slot" className="adp-slot"
              style={{ width: ad.width, height: ad.height }} />
          )}

          {/* loading shimmer shown while detecting */}
          {adStatus === "loading" && (
            <div className="adp-shimmer-label">Loading ad…</div>
          )}

          {/* status */}
          <div className={`adp-status ${canClose ? "adp-status--done" : ""}`}>
            <span className={`adp-dot ${canClose ? "adp-dot--green" : ""}`} />
            {canClose
              ? "Reward ready — tap to close"
              : adStatus === "loading"
                ? "Loading ad…"
                : `Available in ${secondsLeft}s`}
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPER
═══════════════════════════════════════════════════════════ */
function isSlotEmpty(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return true;
  // has visible child elements or iframe = loaded
  const hasIframe = el.querySelector("iframe");
  const hasImg = el.querySelector("img");
  const hasText = (el.innerText || "").trim().length > 10;
  return !hasIframe && !hasImg && !hasText;
}

/* ═══════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes adp-in  { from{opacity:0} to{opacity:1} }
  @keyframes adp-pop {
    from { opacity:0; transform:translateY(24px) scale(0.93) }
    to   { opacity:1; transform:translateY(0)    scale(1)    }
  }
  @keyframes adp-unlock {
    0%   { transform:scale(0.3) rotate(-20deg); opacity:0 }
    65%  { transform:scale(1.15) rotate(3deg);  opacity:1 }
    100% { transform:scale(1)    rotate(0);     opacity:1 }
  }
  @keyframes adp-pulse  { 0%,100%{opacity:1} 50%{opacity:0.2} }
  @keyframes adp-shimmer{
    0%  { background-position: -400px 0 }
    100%{ background-position:  400px 0 }
  }

  /* overlay */
  .adp-overlay {
    position:fixed; inset:0; z-index:9999;
    display:flex; align-items:center; justify-content:center;
    animation:adp-in 0.2s ease;
    background:rgba(0,0,0,0.6);
    backdrop-filter:blur(6px) saturate(0.8);
  }
  @media(prefers-color-scheme:dark){ .adp-overlay{background:rgba(0,0,8,0.8);} }
  .dark .adp-overlay{background:rgba(0,0,8,0.8);}

  /* card */
  .adp-popup {
    position:relative;
    border-radius:20px;
    padding:22px 22px 18px;
    display:flex; flex-direction:column; align-items:center; gap:16px;
    animation:adp-pop 0.36s cubic-bezier(0.22,1,0.36,1);
    background:#ffffff;
    border:1px solid rgba(0,0,0,0.08);
    box-shadow:
      0 2px 4px rgba(0,0,0,0.04),
      0 8px 24px rgba(0,0,0,0.08),
      0 24px 64px rgba(0,0,0,0.12);
    color:#111827;
  }
  @media(prefers-color-scheme:dark){
    .adp-popup{
      background:linear-gradient(155deg,#111827 0%,#1e1b4b 100%);
      border:1px solid rgba(255,255,255,0.07);
      box-shadow:0 0 0 1px rgba(99,102,241,0.2),0 8px 32px rgba(0,0,0,0.5),0 32px 80px rgba(0,0,0,0.7);
      color:#f1f5f9;
    }
  }
  .dark .adp-popup{
    background:linear-gradient(155deg,#111827 0%,#1e1b4b 100%);
    border:1px solid rgba(255,255,255,0.07);
    box-shadow:0 0 0 1px rgba(99,102,241,0.2),0 8px 32px rgba(0,0,0,0.5),0 32px 80px rgba(0,0,0,0.7);
    color:#f1f5f9;
  }

  /* close area */
  .adp-close-wrap {
    position:absolute; top:12px; right:12px;
    display:flex; flex-direction:column; align-items:center; gap:2px;
  }

  /* locked ring */
  .adp-ring {
    display:flex; flex-direction:column; align-items:center; gap:2px;
    cursor:not-allowed; user-select:none;
  }
  .adp-ring-label {
    font-size:9px; font-weight:700; font-family:monospace; letter-spacing:0.03em;
    color:rgba(0,0,0,0.3);
  }
  @media(prefers-color-scheme:dark){ .adp-ring-label{color:rgba(255,255,255,0.3);} }
  .dark .adp-ring-label{color:rgba(255,255,255,0.3);}

  /* unlocked button */
  .adp-close-btn {
    width:30px; height:30px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer;
    animation:adp-unlock 0.38s cubic-bezier(0.22,1,0.36,1) forwards;
    transition:background 0.18s, transform 0.12s, box-shadow 0.18s;
    background:rgba(239,68,68,0.08);
    border:1.5px solid rgba(239,68,68,0.35);
    color:#dc2626;
    box-shadow:0 0 0 0 rgba(239,68,68,0);
  }
  .adp-close-btn:hover{
    background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.7);
    transform:scale(1.08); box-shadow:0 0 12px rgba(239,68,68,0.2);
  }
  .adp-close-btn:active{ transform:scale(0.94); }
  @media(prefers-color-scheme:dark){
    .adp-close-btn{ background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.4); color:#fca5a5; }
    .adp-close-btn:hover{ background:rgba(239,68,68,0.28); border-color:rgba(239,68,68,0.7); box-shadow:0 0 16px rgba(239,68,68,0.25); }
  }
  .dark .adp-close-btn{ background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.4); color:#fca5a5; }
  .dark .adp-close-btn:hover{ background:rgba(239,68,68,0.28); border-color:rgba(239,68,68,0.7); box-shadow:0 0 16px rgba(239,68,68,0.25); }

  /* header */
  .adp-header{ display:flex; flex-direction:column; align-items:center; gap:3px; margin-top:8px; }
  .adp-badge{
    font-size:8.5px; font-weight:800; letter-spacing:0.16em; font-family:monospace;
    color:rgba(0,0,0,0.3);
  }
  @media(prefers-color-scheme:dark){ .adp-badge{color:rgba(250,204,21,0.5);} }
  .dark .adp-badge{color:rgba(250,204,21,0.5);}
  .adp-title{
    margin:0; font-size:15px; font-weight:700;
    font-family:system-ui,-apple-system,sans-serif; letter-spacing:-0.02em;
  }

  /* ad slots */
  .adp-slot {
    border-radius:12px; overflow:hidden;
    background:rgba(0,0,0,0.04);
    border:1px solid rgba(0,0,0,0.06);
  }
  .adp-slot--native { width:100%; min-height:250px; }
  @media(prefers-color-scheme:dark){
    .adp-slot{ background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.06); }
  }
  .dark .adp-slot{ background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.06); }

  /* shimmer label */
  .adp-shimmer-label {
    font-size:11px; font-weight:600; font-family:monospace;
    color:rgba(0,0,0,0.3); letter-spacing:0.04em;
    animation:adp-pulse 1.4s ease-in-out infinite;
  }
  @media(prefers-color-scheme:dark){ .adp-shimmer-label{color:rgba(255,255,255,0.25);} }
  .dark .adp-shimmer-label{color:rgba(255,255,255,0.25);}

  /* status bar */
  .adp-status {
    display:flex; align-items:center; gap:8px;
    font-size:11px; font-weight:600; letter-spacing:0.01em;
    font-family:system-ui,-apple-system,sans-serif;
    padding:7px 16px; border-radius:99px;
    transition:background 0.4s, color 0.4s, border-color 0.4s;
    border:1px solid transparent;
    background:rgba(0,0,0,0.05); color:rgba(0,0,0,0.4);
  }
  .adp-status--done{
    background:rgba(22,163,74,0.08); border-color:rgba(22,163,74,0.2); color:#15803d;
  }
  @media(prefers-color-scheme:dark){
    .adp-status{ background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.35); }
    .adp-status--done{ background:rgba(74,222,128,0.1); border-color:rgba(74,222,128,0.2); color:#4ade80; }
  }
  .dark .adp-status{ background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.35); }
  .dark .adp-status--done{ background:rgba(74,222,128,0.1); border-color:rgba(74,222,128,0.2); color:#4ade80; }

  .adp-dot{
    width:6px; height:6px; border-radius:50%; flex-shrink:0;
    background:#facc15; animation:adp-pulse 1.5s ease-in-out infinite;
    box-shadow:0 0 6px rgba(250,204,21,0.5);
  }
  .adp-dot--green{ background:#4ade80; animation:none; box-shadow:0 0 6px rgba(74,222,128,0.5); }
`;