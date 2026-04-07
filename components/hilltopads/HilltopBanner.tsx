"use client";

import { useEffect, useRef } from "react";
import { hilltopAds } from "./data";

export default function HilltopBanner({
  type = "300x250",
}: {
  type?: "300x250" | "300x100";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const src =
      type === "300x250"
        ? hilltopAds.banner300x250.src
        : hilltopAds.banner300x100.src;

    // 🔥 clear previous content
    containerRef.current.innerHTML = "";

    // 🔥 create wrapper (IMPORTANT for Hilltop)
    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.textAlign = "center";

    // 🔥 create script
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.type = "text/javascript";
    script.referrerPolicy = "no-referrer-when-downgrade";

    // 🔥 append correctly
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);

    // 🔥 fallback reload if empty (VERY IMPORTANT)
    const retry = setTimeout(() => {
      if (containerRef.current && containerRef.current.innerHTML.trim() === "") {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(wrapper.cloneNode(true));
      }
    }, 3000);

    return () => clearTimeout(retry);
  }, [type]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: type === "300x250" ? 250 : 100,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    />
  );
}