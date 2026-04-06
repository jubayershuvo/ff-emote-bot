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
   FAST AD BLOCKER DETECTION
   Checks multiple signals before even trying to inject ads
═══════════════════════════════════════════════════════════ */
async function detectAdBlocker(): Promise<boolean> {
  // Method 1: Try fetching a known ad network URL (fastest signal)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
      { method: "HEAD", mode: "no-cors", signal: controller.signal }
    );
    clearTimeout(timeout);
    // If fetch resolves (even opaque), ad network is reachable
    void res;
  } catch {
    return true; // blocked or aborted = ad blocker present
  }

  // Method 2: Check if adsbygoogle is defined (injected by Google tag)
  if (
    typeof window !== "undefined" &&
    !(window as any).adsbygoogle &&
    !(window as any).googletag
  ) {
    // Method 3: Create a bait element and check if it gets hidden/removed
    const bait = document.createElement("div");
    bait.className = "ad adsbox ad-slot adBanner pub_300x250";
    bait.style.cssText =
      "width:1px;height:1px;position:absolute;left:-9999px;top:-9999px;";
    bait.innerHTML = "&nbsp;";
    document.body.appendChild(bait);

    await new Promise((r) => setTimeout(r, 150));

    const blocked =
      bait.offsetHeight === 0 ||
      bait.offsetParent === null ||
      window.getComputedStyle(bait).display === "none" ||
      window.getComputedStyle(bait).visibility === "hidden";

    document.body.removeChild(bait);

    if (blocked) return true;
  }

  return false;
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

export const showNativeAd = (
  onReward?: () => void,
  watchDuration = 10,
  onNoReward?: () => void
) => openAdPopup({ mode: "nativebanner", watchDuration, onReward, onNoReward });

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

  // "checking" = fast blocker scan running, "loading" = injecting ad,
  // "ok" = ad rendered, "failed" = blocked/failed
  const [adStatus, setAdStatus] = useState<"checking" | "loading" | "ok" | "failed">("checking");
  const [attempt, setAttempt] = useState(0);

  const rewardedRef = useRef(false);
  const closedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* client-only guard */
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  /* register global trigger */
  useEffect(() => {
    _open = (newOpts) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);

      rewardedRef.current = false;
      closedRef.current = false;
      setCanClose(false);
      setSecondsLeft(newOpts.watchDuration ?? 10);
      setAdStatus("checking"); // start with fast blocker scan
      setAttempt(0);
      setOpts(newOpts);
    };
    return () => {
      _open = null;
      if (timerRef.current) clearInterval(timerRef.current);
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, []);

  /* ── STEP 1: fast ad blocker detection before any injection ── */
  useEffect(() => {
    if (!opts || adStatus !== "checking") return;

    detectAdBlocker().then((isBlocked) => {
      if (isBlocked) {
        setAdStatus("failed");
        setCanClose(true);
      } else {
        setAdStatus("loading"); // pass → try to inject
      }
    });
  }, [opts, adStatus]);

  /* ── STEP 2: inject ad & verify it rendered ── */
  useEffect(() => {
    if (!opts || adStatus !== "loading") return;

    const slotId = opts.mode === "nativebanner" ? "adp-native-slot" : "adp-banner-slot";

    if (checkRef.current) clearTimeout(checkRef.current);

    const loadTimeout = setTimeout(() => {
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
            const el = document.getElementById(slotId);
            if (el) el.innerHTML = "";
            setAttempt((a) => a + 1);
          } else {
            // Both injection attempts failed → must be blocked
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, attempt, adStatus]);

  /* ── STEP 3: countdown only after ad confirmed loaded ── */
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
      opts?.onReward?.();
    }
    resetPopup();
  };

  const closeNoReward = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    opts?.onNoReward?.();
    resetPopup();
  };

  const resetPopup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (checkRef.current) { clearTimeout(checkRef.current); checkRef.current = null; }
    setOpts(null);
    setCanClose(false);
    setAdStatus("checking");
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

  /* ── FAILED / BLOCKED STATE ── */
  if (adStatus === "failed") {
    return createPortal(
      <>
        <style>{CSS}</style>
        <div className="adp-overlay">
          <div className="adp-popup adp-popup--failed" style={{ width: 320 }}>
            <div className="adp-fail-icon">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                {/* Shield icon to indicate blocker */}
                <path d="M22 10 L32 14 L32 22 C32 28 22 34 22 34 C22 34 12 28 12 22 L12 14 Z"
                  stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" opacity="0.7" />
                <line x1="17" y1="17" x2="27" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="27" y1="17" x2="17" y2="27" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <p className="adp-fail-title">Ad Blocker Detected</p>
            <p className="adp-fail-sub">
              Your browser&apos;s <strong>ad blocker or shields</strong> (e.g. Brave Shields, uBlock, AdBlock)
              is preventing ads from loading. Please disable it for this site to earn rewards.
            </p>

            <div className="adp-fail-steps">
              <div className="adp-fail-step">
                <span className="adp-fail-step-num">1</span>
                <span>Click the shield / extension icon in your browser toolbar</span>
              </div>
              <div className="adp-fail-step">
                <span className="adp-fail-step-num">2</span>
                <span>Disable blocking for this site</span>
              </div>
              <div className="adp-fail-step">
                <span className="adp-fail-step-num">3</span>
                <span>Reload the page and try again</span>
              </div>
            </div>

            <div className="adp-fail-hint">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <line x1="7" y1="4" x2="7" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="10.5" r="0.8" fill="currentColor" />
              </svg>
              No reward will be granted without a valid ad view.
            </div>

            <button className="adp-fail-btn" onClick={closeNoReward}>
              Close (No Reward)
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  }

  /* ── CHECKING STATE (fast spinner while scanning) ── */
  if (adStatus === "checking") {
    return createPortal(
      <>
        <style>{CSS}</style>
        <div className="adp-overlay">
          <div className="adp-popup" style={{ width: 280 }}>
            <div className="adp-checking-spinner" />
            <p className="adp-checking-label">Checking ad availability…</p>
          </div>
        </div>
      </>,
      document.body
    );
  }

  /* ── NORMAL (loading / ok) STATE ── */
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
  @keyframes adp-spin   { to{transform:rotate(360deg)} }

  .adp-overlay {
    position:fixed; inset:0; z-index:9999;
    display:flex; align-items:center; justify-content:center;
    animation:adp-in 0.2s ease;
    background:rgba(0,0,0,0.6);
    backdrop-filter:blur(6px) saturate(0.8);
  }
  @media(prefers-color-scheme:dark){ .adp-overlay{background:rgba(0,0,8,0.8);} }
  .dark .adp-overlay{background:rgba(0,0,8,0.8);}

  .adp-popup {
    position:relative;
    border-radius:20px;
    padding:22px 22px 18px;
    display:flex; flex-direction:column; align-items:center; gap:16px;
    animation:adp-pop 0.36s cubic-bezier(0.22,1,0.36,1);
    background:#ffffff;
    border:1px solid rgba(0,0,0,0.08);
    box-shadow:0 2px 4px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.08),0 24px 64px rgba(0,0,0,0.12);
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

  /* ── CHECKING STATE ── */
  .adp-checking-spinner {
    width:36px; height:36px; border-radius:50%;
    border:3px solid rgba(139,92,246,0.2);
    border-top-color:#8b5cf6;
    animation:adp-spin 0.8s linear infinite;
    margin:8px 0 4px;
  }
  .adp-checking-label {
    margin:0 0 8px;
    font-size:13px; font-weight:600;
    font-family:system-ui,-apple-system,sans-serif;
    color:rgba(0,0,0,0.4);
    animation:adp-pulse 1.4s ease-in-out infinite;
  }
  @media(prefers-color-scheme:dark){ .adp-checking-label{color:rgba(255,255,255,0.35);} }
  .dark .adp-checking-label{color:rgba(255,255,255,0.35);}

  /* ── FAILED POPUP ── */
  .adp-popup--failed { gap:12px; text-align:center; }

  .adp-fail-icon { margin-top:8px; color:#ef4444; opacity:0.85; }

  .adp-fail-title {
    margin:0;
    font-size:17px; font-weight:800; letter-spacing:-0.02em;
    font-family:system-ui,-apple-system,sans-serif;
    color:#dc2626;
  }
  @media(prefers-color-scheme:dark){ .adp-fail-title{color:#fca5a5;} }
  .dark .adp-fail-title{color:#fca5a5;}

  .adp-fail-sub {
    margin:0;
    font-size:13px; line-height:1.55;
    font-family:system-ui,-apple-system,sans-serif;
    color:rgba(0,0,0,0.55);
    max-width:270px;
  }
  @media(prefers-color-scheme:dark){ .adp-fail-sub{color:rgba(255,255,255,0.5);} }
  .dark .adp-fail-sub{color:rgba(255,255,255,0.5);}
  .adp-fail-sub strong{ color:inherit; font-weight:700; }

  /* step-by-step guide */
  .adp-fail-steps {
    display:flex; flex-direction:column; gap:8px;
    width:100%; max-width:270px;
    background:rgba(0,0,0,0.03);
    border:1px solid rgba(0,0,0,0.07);
    border-radius:12px; padding:12px 14px;
    text-align:left;
  }
  @media(prefers-color-scheme:dark){
    .adp-fail-steps{ background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.08); }
  }
  .dark .adp-fail-steps{ background:rgba(255,255,255,0.04); border-color:rgba(255,255,255,0.08); }

  .adp-fail-step {
    display:flex; align-items:flex-start; gap:10px;
    font-size:12px; line-height:1.4;
    font-family:system-ui,-apple-system,sans-serif;
    color:rgba(0,0,0,0.6);
  }
  @media(prefers-color-scheme:dark){ .adp-fail-step{color:rgba(255,255,255,0.5);} }
  .dark .adp-fail-step{color:rgba(255,255,255,0.5);}

  .adp-fail-step-num {
    flex-shrink:0;
    width:20px; height:20px; border-radius:50%;
    background:rgba(139,92,246,0.15);
    border:1px solid rgba(139,92,246,0.35);
    color:#7c3aed;
    font-size:11px; font-weight:700;
    display:flex; align-items:center; justify-content:center;
  }
  @media(prefers-color-scheme:dark){
    .adp-fail-step-num{ background:rgba(139,92,246,0.2); border-color:rgba(139,92,246,0.4); color:#a78bfa; }
  }
  .dark .adp-fail-step-num{ background:rgba(139,92,246,0.2); border-color:rgba(139,92,246,0.4); color:#a78bfa; }

  .adp-fail-hint {
    display:flex; align-items:center; gap:6px;
    font-size:11px; font-weight:600;
    font-family:system-ui,-apple-system,sans-serif;
    padding:7px 14px; border-radius:99px;
    background:rgba(239,68,68,0.07);
    border:1px solid rgba(239,68,68,0.18);
    color:#b91c1c;
  }
  @media(prefers-color-scheme:dark){
    .adp-fail-hint{ background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.25); color:#fca5a5; }
  }
  .dark .adp-fail-hint{ background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.25); color:#fca5a5; }

  .adp-fail-btn {
    margin-top:4px; margin-bottom:4px;
    padding:10px 28px; border-radius:12px;
    font-size:13px; font-weight:700;
    font-family:system-ui,-apple-system,sans-serif;
    cursor:pointer;
    transition:background 0.18s, transform 0.12s;
    background:rgba(0,0,0,0.07);
    border:1.5px solid rgba(0,0,0,0.12);
    color:#374151;
  }
  .adp-fail-btn:hover{ background:rgba(0,0,0,0.13); transform:scale(1.03); }
  .adp-fail-btn:active{ transform:scale(0.96); }
  @media(prefers-color-scheme:dark){
    .adp-fail-btn{ background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.12); color:#e2e8f0; }
    .adp-fail-btn:hover{ background:rgba(255,255,255,0.14); }
  }
  .dark .adp-fail-btn{ background:rgba(255,255,255,0.07); border-color:rgba(255,255,255,0.12); color:#e2e8f0; }
  .dark .adp-fail-btn:hover{ background:rgba(255,255,255,0.14); }

  .adp-close-wrap {
    position:absolute; top:12px; right:12px;
    display:flex; flex-direction:column; align-items:center; gap:2px;
  }
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

  .adp-shimmer-label {
    font-size:11px; font-weight:600; font-family:monospace;
    color:rgba(0,0,0,0.3); letter-spacing:0.04em;
    animation:adp-pulse 1.4s ease-in-out infinite;
  }
  @media(prefers-color-scheme:dark){ .adp-shimmer-label{color:rgba(255,255,255,0.25);} }
  .dark .adp-shimmer-label{color:rgba(255,255,255,0.25);}

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