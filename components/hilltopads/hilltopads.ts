// hilltopads/hilltopads.ts

import { hilltopAds } from "./data";

// prevent duplicate loading
const loadedScripts = new Set<string>();

// custom type for script with settings
type AdScript = HTMLScriptElement & {
  settings?: Record<string, unknown>;
};

const injectScript = (
  src: string,
  settings: Record<string, unknown> = {}
) => {
  if (typeof window === "undefined") return;

  if (loadedScripts.has(src)) return;

  const script = document.createElement("script") as AdScript;

  script.src = src;
  script.async = true;
  script.referrerPolicy = "no-referrer-when-downgrade";
  script.crossOrigin = "anonymous";

  script.settings = settings;

  document.body.appendChild(script);
  loadedScripts.add(src);
};

// ==========================
// INIT FUNCTIONS
// ==========================

export const initVideoSlider = (): void => {
  injectScript(hilltopAds.videoSlider.src);
};

export const initInPagePush = (): void => {
  injectScript(hilltopAds.inPagePush.src);
};

// popunder should be user-triggered
export const initPopunder = (): void => {
  injectScript(hilltopAds.popunder.src);
};

// ==========================
// BANNER
// ==========================

export const loadBanner = (
  type: "300x250" | "300x100"
): void => {
  if (type === "300x250") {
    injectScript(hilltopAds.banner300x250.src);
  } else {
    injectScript(hilltopAds.banner300x100.src);
  }
};

// ==========================
// VAST
// ==========================

export const getVastUrl = (): string => {
  return hilltopAds.vast.url;
};