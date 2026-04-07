"use client";

import { useEffect } from "react";
import HilltopBanner from "@/components/hilltopads/HilltopBanner";
import {
  initInPagePush,
  initVideoSlider,
  initPopunder,
  getVastUrl,
} from "@/components/hilltopads/hilltopads";

export default function TestPage() {
  useEffect(() => {
    // auto ads (safe to load on page start)
    initInPagePush();
    initVideoSlider();
  }, []);

  const handleDownload = () => {
    // popunder MUST be triggered by click
    initPopunder();

    // your actual action
    alert("Download started (after ad trigger)");
  };

  const handleShowVast = () => {
    const vast = getVastUrl();
    alert("VAST URL:\n" + vast);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>HilltopAds Test Page</h1>

      {/* ================= TOP BANNER ================= */}
      <h2>Top Banner (300x250)</h2>
      {/* <HilltopBanner type="300x250" /> */}

      {/* ================= BUTTON ================= */}
      <h2>Popunder Test</h2>
      <button
        onClick={handleDownload}
        style={{
          padding: "12px 20px",
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        Download (Trigger Popunder)
      </button>

      {/* ================= VAST ================= */}
      <h2>VAST Test</h2>
      <button
        onClick={handleShowVast}
        style={{
          padding: "10px 16px",
          background: "green",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Show VAST URL
      </button>

      {/* ================= MIDDLE BANNER ================= */}
      <h2 style={{ marginTop: 40 }}>Middle Banner (300x100)</h2>
      <HilltopBanner type="300x100" />

      {/* ================= INFO ================= */}
      <div style={{ marginTop: 40 }}>
        <h3>Ads Loaded:</h3>
        <ul>
          <li>✅ In-Page Push (auto)</li>
          <li>✅ Video Slider (auto)</li>
          <li>✅ Popunder (on click)</li>
          <li>✅ Banner 300x250</li>
          <li>✅ Banner 300x100</li>
          <li>✅ VAST URL ready</li>
        </ul>
      </div>
    </div>
  );
}