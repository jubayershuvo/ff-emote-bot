"use client";

import { useEffect, useId, useRef } from "react";
import { loadBanner, initNativeBanner, AdsData } from "@/components/adsterra/adsterra";

type BannerKey = keyof typeof AdsData;

interface AdBannerProps {
  type: BannerKey | "native";
  className?: string;
  style?: React.CSSProperties;
}

export default function AdBanner({ type, className, style }: AdBannerProps) {
  const rawId = useId();
  // useId returns ":r0:" style strings — strip colons for valid HTML id
  const slotId = "ad-" + rawId.replace(/:/g, "");
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    if (type === "native") {
      initNativeBanner(slotId);        // ✅ pass containerId
    } else {
      const ad = AdsData[type];
      loadBanner(ad.key, ad.width, ad.height, slotId);  // ✅ use slotId, not hardcoded string
    }
  }, [type, slotId]);

  if (type === "native") {
    return (
      <div
        id={slotId}                    // ✅ slotId now defined
        className={className}
        style={{ width: "100%", minHeight: 90, ...style }}
      />
    );
  }

  return (
    <div
      id={slotId}                      // ✅ slotId now defined
      className={className}
      style={{ ...style }}
    />
  );
}