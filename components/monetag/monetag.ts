// lib/monetag.ts

import monetagData from "./data";

declare global {
  interface Window {
    monetagLoaded?: Record<string, boolean>;
  }
}

if (typeof window !== "undefined" && !window.monetagLoaded) {
  window.monetagLoaded = {};
}

// 🔥 Universal script loader
const loadScript = (src: string, zone: string) => {
  if (!src || typeof document === "undefined") return;

  if (window.monetagLoaded?.[zone]) return;

  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.dataset.zone = zone;

  document.body.appendChild(script);

  window.monetagLoaded![zone] = true;
};

// ==============================
// 🎯 VIGNETTE (Auto fullscreen ad)
// ==============================
export const initVignette = () => {
  const { zone, src } = monetagData.vignette;
  loadScript(src, zone);
};

// ==============================
// 📢 IN-PAGE PUSH
// ==============================
export const initInPagePush = () => {
  const { zone, src } = monetagData.inPagePush;
  loadScript(src, zone);
};

// ==============================
// 💥 POPUNDER (OnClick)
// ==============================
export const initPopunder = () => {
  const { zone, src } = monetagData.popunder;
  loadScript(src, zone);
};

// ==============================
// 🔗 DIRECT LINK
// ==============================
export const openDirectLink = () => {
  const { url } = monetagData.directLink;

  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  // required for some browsers
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};


// ==============================
// 🎯 SMART CLICK (manual trigger)
// ==============================
export const triggerClickAd = () => {
  initPopunder();
};