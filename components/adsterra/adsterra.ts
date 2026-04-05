// lib/adsterra.ts

import data from "./data";

declare global {
    interface Window {
        atOptions?: {
            key: string;
            format: string;
            height: number;
            width: number;
            params: Array<{ [key: string]: string | number }>;
        };
        __adsterra_loaded?: Record<string, boolean>;
    }
}

// ==========================
// 🔥 POPUNDER (AUTO)
// ==========================
export const initPopunder = () => {
    const src = data.popunder.src;

    if (typeof document === "undefined") return;
    if (document.querySelector(`script[src="${src}"]`)) return;

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute("data-cfasync", "false");

    document.body.appendChild(script);
};


// ==========================
// 🔥 SOCIAL BAR
// ==========================
export const initSocialBar = () => {
    //striopt last of body
    const body = document.querySelector('body');
    if (!body) return;

    const script = document.createElement('script');
    script.src = data.socialBar.src;
    script.async = true;

    body.appendChild(script);
};

// ==========================
// 🔥 EXTRA POP / DIRECT
// ==========================
export const initNativeBanner = (containerId: string) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const script = document.createElement('script');
    script.src = data.nativeBanner.src;
    script.async = true;
    script.setAttribute("data-cfasync", "false");


    const containtDiv = document.createElement('div');
    containtDiv.id = data.nativeBanner.containerId;
    container.appendChild(containtDiv);

    container.appendChild(script);
};

// ==========================
// 🔥 SMARTLINK (Reward)
// ==========================
export const openSmartlink = () => {
    window.open(
        data.smartLink.url,
        "_blank"
    );
};

// ==========================
// 🔥 GENERIC BANNER LOADER
// ==========================
export const loadBanner = (
    key: string,
    width: number,
    height: number,
    containerId: string
) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!window.__adsterra_loaded) {
        window.__adsterra_loaded = {};
    }

    if (window.__adsterra_loaded[key]) return;
    window.__adsterra_loaded[key] = true;

    // config script
    const conf = document.createElement("script");
    conf.innerHTML = `
    atOptions = {
      key: "${key}",
      format: "iframe",
      height: ${height},
      width: ${width},
      params: {}
    };
  `;

    const script = document.createElement("script");
    script.src = `https://performanceingredientgoblet.com/${key}/invoke.js`;

    container.appendChild(conf);
    container.appendChild(script);
};

// ==========================
// 🔥 READY SHORTCUTS
// ==========================

export const AdsData: Record<
    string,
    { key: string; width: number; height: number }
> = {
    banner468x60: data.banner.banner468x60.atOptions,
    banner300x250: data.banner.banner300x250.atOptions,
    banner160x600: data.banner.banner160x600.atOptions,
    banner160x300: data.banner.banner160x300.atOptions,
    banner728x90: data.banner.banner728x90.atOptions,
    banner320x50: data.banner.banner320x50.atOptions,
};

export const Ads = {
    banner468x60: (id: string) =>
        loadBanner(data.banner.banner468x60.atOptions.key, data.banner.banner468x60.atOptions.width, data.banner.banner468x60.atOptions.height, id),

    banner300x250: (id: string) =>
        loadBanner(data.banner.banner300x250.atOptions.key, data.banner.banner300x250.atOptions.width, data.banner.banner300x250.atOptions.height, id),

    banner160x600: (id: string) =>
        loadBanner(data.banner.banner160x600.atOptions.key, data.banner.banner160x600.atOptions.width, data.banner.banner160x600.atOptions.height, id),

    banner160x300: (id: string) =>
        loadBanner(data.banner.banner160x300.atOptions.key, data.banner.banner160x300.atOptions.width, data.banner.banner160x300.atOptions.height, id),

    banner728x90: (id: string) =>
        loadBanner(data.banner.banner728x90.atOptions.key, data.banner.banner728x90.atOptions.width, data.banner.banner728x90.atOptions.height, id),

    banner320x50: (id: string) =>
        loadBanner(data.banner.banner320x50.atOptions.key, data.banner.banner320x50.atOptions.width, data.banner.banner320x50.atOptions.height, id),
};