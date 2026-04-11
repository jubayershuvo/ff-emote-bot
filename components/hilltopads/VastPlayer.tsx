"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import { hilltopAds } from "./data";

declare global {
  interface Window {
    google?: { ima: any };
  }
}

type Phase = "thumbnail" | "ad" | "video";

export default function VideoPlayer({ src }: { src: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const adsManagerRef = useRef<any>(null);
  const imaContainerRef = useRef<HTMLDivElement | null>(null);
  const videoStartedRef = useRef(false); // guard: only call startVideo once

  const [phase, setPhase] = useState<Phase>("thumbnail");
  const [adProgress, setAdProgress] = useState(0);
  const [adDuration, setAdDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);

  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 2800);
  }, []);


  const fmt = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ── Start main video ───────────────────────────────────────────────────────
  const startVideo = useCallback(() => {
    if (videoStartedRef.current) return;
    videoStartedRef.current = true;

    if (imaContainerRef.current) {
      imaContainerRef.current.style.pointerEvents = "none";
    }

    setPhase("video");
    resetHideTimer();

    const p = playerRef.current;
    if (!p) return;

    // Ensure video is playing
    if (p.paused()) {
      // Attempt unmuted autoplay; fall back silently to muted if the browser blocks it
      p.muted(false);
      p.volume(1);
      setIsMuted(false);
      setVolume(1);

      const playResult = p.play();
      if (playResult instanceof Promise) {
        playResult.catch(() => {
          p.muted(true);
          setIsMuted(true);
          p.play();
        });
      }
    }
  }, []);

  // ── IMA setup ──────────────────────────────────────────────────────────────
  function setupIma(techVideo: HTMLVideoElement, imaContainer: HTMLDivElement) {
    const ima = window.google?.ima;
    if (!ima) {
      console.warn("IMA SDK unavailable — starting video directly.");
      startVideo();
      return;
    }

    let adDisplayContainer: any;
    try {
      adDisplayContainer = new ima.AdDisplayContainer(imaContainer, techVideo);
      adDisplayContainer.initialize();
    } catch (err) {
      console.error("AdDisplayContainer init failed:", err);
      startVideo();
      return;
    }

    const adsLoader = new ima.AdsLoader(adDisplayContainer);

    // Loader-level error: bad/empty VAST, network timeout, blocked domain, etc.
    adsLoader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (err: any) => {
      console.error("AdsLoader error — falling back to main video:", err.getError());
      imaContainer.style.pointerEvents = "none";
      startVideo();
    });

    adsLoader.addEventListener(
      ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (event: any) => {
        let am: any;
        try {
          const settings = new ima.AdsRenderingSettings();
          settings.restoreCustomPlaybackStateOnAdBreakComplete = true;
          am = event.getAdsManager(techVideo, settings);
          adsManagerRef.current = am;
        } catch (err) {
          console.error("getAdsManager failed:", err);
          startVideo();
          return;
        }

        // Ad-manager-level error (mid-stream failure, individual ad error)
        am.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (err: any) => {
          console.error("AdsManager error — falling back to main video:", err.getError());
          startVideo();
        });

        am.addEventListener(ima.AdEvent.Type.STARTED, () => {
          setPhase("ad");

          // Pause the main video when ad starts
          if (playerRef.current && !playerRef.current.paused()) {
            playerRef.current.pause();
            setIsPlaying(false);
          }

          imaContainer.style.pointerEvents = "auto";
        });

        am.addEventListener(ima.AdEvent.Type.AD_PROGRESS, (e: any) => {
          const d = e.getAdData();
          setAdProgress(d.currentTime ?? 0);
          setAdDuration(d.duration ?? 0);
        });

        am.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
          if (playerRef.current && !playerRef.current.paused()) {
            playerRef.current.pause();
            setIsPlaying(false);
          }
        });

        // Both of these fire at ad completion
        am.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
          startVideo();
        });

        am.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
          startVideo();
        });

        const vjsEl = playerRef.current!.el() as HTMLElement;
        const w = vjsEl.offsetWidth || 640;
        const h = vjsEl.offsetHeight || 360;
        imaContainer.style.width = `${w}px`;
        imaContainer.style.height = `${h}px`;
        imaContainer.style.pointerEvents = "auto";

        try {
          am.init(w, h, ima.ViewMode.NORMAL);
          am.start();
        } catch (err) {
          console.error("AdsManager start failed:", err);
          startVideo();
        }
      }
    );

    // Resize listener
    const handleResize = () => {
      if (!adsManagerRef.current || !playerRef.current) return;
      const vjsEl = playerRef.current.el() as HTMLElement;
      const w = vjsEl.offsetWidth;
      const h = vjsEl.offsetHeight;
      if (imaContainerRef.current) {
        imaContainerRef.current.style.width = `${w}px`;
        imaContainerRef.current.style.height = `${h}px`;
      }
      adsManagerRef.current.resize(w, h, ima.ViewMode.NORMAL);
    };
    window.addEventListener("resize", handleResize);

    // Fire ad request
    try {
      const adsRequest = new ima.AdsRequest();
      adsRequest.adTagUrl = hilltopAds.vast.url;
      const vjsEl = playerRef.current!.el() as HTMLElement;
      adsRequest.linearAdSlotWidth = vjsEl.offsetWidth || 640;
      adsRequest.linearAdSlotHeight = vjsEl.offsetHeight || 360;
      adsLoader.requestAds(adsRequest);
    } catch (err) {
      console.error("requestAds threw:", err);
      startVideo();
    }
  }

  // ── Init Video.js ──────────────────────────────────────────────────────────
  const initPlayer = useCallback(() => {
    if (playerRef.current || !containerRef.current) return;

    const videoEl = document.createElement("video");
    videoEl.className = "video-js";
    videoEl.setAttribute("playsinline", "");
    videoEl.muted = false;
    containerRef.current.appendChild(videoEl);

    playerRef.current = videojs(videoEl, {
      controls: false,
      autoplay: false,
      muted: false,
      preload: "auto",
      fluid: false,
      sources: [{ src, type: "video/mp4" }],
    });

    const p = playerRef.current;

    p.ready(() => {
      const vjsEl = p.el();
      const techVideo = vjsEl.querySelector("video.vjs-tech") as HTMLVideoElement;

      const imaDiv = document.createElement("div");
      imaDiv.id = "ima-container";
      imaDiv.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;";
      techVideo.insertAdjacentElement("afterend", imaDiv);
      imaContainerRef.current = imaDiv;

      const script = document.createElement("script");
      script.src = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
      script.async = true;
      script.onload = () => setupIma(techVideo, imaDiv);
      script.onerror = () => {
        console.warn("IMA SDK script failed to load — starting video directly.");
        startVideo();
      };
      document.body.appendChild(script);
    });

    p.on("timeupdate", () => {
      setCurrentTime(p.currentTime() ?? 0);
      setBuffered((p.bufferedPercent() ?? 0) * 100);
    });
    p.on("durationchange", () => setDuration(p.duration() ?? 0));
    p.on("play", () => {
      setIsPlaying(true);
      resetHideTimer();
    });
    p.on("pause", () => {
      setIsPlaying(false);
      resetHideTimer();
    });
    p.on("volumechange", () => {
      setIsMuted(p.muted() ?? false);
      setVolume(p.volume() ?? 1);
    });
  }, [startVideo]);

  // ── Control handlers ───────────────────────────────────────────────────────
  function handleThumbnailClick() {
    initPlayer();
  }

  function handlePlayPause() {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pause();
    else playerRef.current.play();
    resetHideTimer();
  }

  function handleMute() {
    if (!playerRef.current) return;
    const next = !isMuted;
    playerRef.current.muted(next);
    setIsMuted(next);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    playerRef.current?.volume(v);
    if (v === 0) {
      playerRef.current?.muted(true);
      setIsMuted(true);
    } else {
      playerRef.current?.muted(false);
      setIsMuted(false);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = parseFloat(e.target.value);
    playerRef.current?.currentTime(t);
    setCurrentTime(t);
  }

  function handleFullscreen() {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    return () => {
      adsManagerRef.current?.destroy();
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      document.querySelector('script[src*="imasdk.googleapis.com"]')?.remove();
    };
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const adPct = adDuration > 0 ? (adProgress / adDuration) * 100 : 0;
  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        .vp-root * { font-family: 'DM Sans', sans-serif; }

        /* Strip default Video.js chrome */
        .vjs-root .vjs-control-bar,
        .vjs-root .vjs-big-play-button,
        .vjs-root .vjs-loading-spinner,
        .vjs-root .vjs-text-track-display { display: none !important; }
        .vjs-root .video-js,
        .vjs-root .video-js .vjs-tech {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain;
        }

        /* Range thumb — not expressible in Tailwind */
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; }
        input[type="range"]::-webkit-slider-runnable-track { height: 3px; border-radius: 9999px; background: rgba(255,255,255,0.2); }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: white;
          margin-top: -4.5px;
          transition: transform 0.1s;
        }
        input[type="range"]:hover::-webkit-slider-thumb { transform: scale(1.25); }

        /* Keyframes */
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.3} }
        .pulse-dot { animation: pulse-dot 1.2s ease-in-out infinite; }
      `}</style>

      <div
        ref={wrapperRef}
        className="vp-root relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden bg-black shadow-[0_32px_80px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)]"
        style={{ aspectRatio: "16/9" }}
      >
        <div
          className="relative w-full h-full bg-black"
          onMouseMove={() => phase === "video" && resetHideTimer()}
          onMouseLeave={() => phase === "video" && isPlaying && setShowControls(false)}
        >
          {/* Video.js mount point */}
          <div className="vjs-root absolute inset-0 w-full h-full" ref={containerRef} />

          {/* ── Thumbnail ── */}
          {phase === "thumbnail" && (
            <div
              className="absolute inset-0 z-20 cursor-pointer group"
              onClick={handleThumbnailClick}
            >
              <img
                className="w-full h-full object-cover"
                src="https://peach.blender.org/wp-content/uploads/bbb-splash.png"
                alt="Video thumbnail"
                onError={(e) =>
                ((e.currentTarget as HTMLImageElement).src =
                  "https://www.w3schools.com/html/pic_trulli.jpg")
                }
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:bg-white/25">
                <svg className="ml-1" width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="absolute bottom-4 left-5 text-white/80 text-xs font-medium tracking-wide">
                Big Buck Bunny · 9:56
              </span>
            </div>
          )}

          {/* ── Ad overlay ── */}
          {phase === "ad" && (
            <>
              {/* Badge */}
              <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-zinc-900/75 backdrop-blur-md border border-white/10 rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-widest uppercase text-white/75 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 pulse-dot" />
                Ad
              </div>

              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-30 pointer-events-none">
                <div
                  className="h-full bg-orange-400 transition-[width] duration-200 ease-linear"
                  style={{ width: `${adPct}%` }}
                />
              </div>


            </>
          )}

          {/* ── Video controls ── */}
          {phase === "video" && (
            <>
              {/* Click-to-play/pause */}
              <div
                className="absolute inset-0 z-[21] cursor-pointer"
                onClick={handlePlayPause}
              />

              {/* Control bar */}
              <div
                className="absolute bottom-0 left-0 right-0 z-[25] px-4 pb-3 pt-10 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300"
                style={{
                  opacity: showControls ? 1 : 0,
                  pointerEvents: showControls ? "auto" : "none",
                }}
              >
                {/* Seek bar */}
                <div className="relative h-5 flex items-center mb-2 cursor-pointer group">
                  <div className="absolute left-0 right-0 h-[3px] rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="absolute left-0 h-full bg-white/30 rounded-full"
                      style={{ width: `${buffered}%` }}
                    />
                    <div
                      className="absolute left-0 h-full bg-white rounded-full"
                      style={{ width: `${seekPct}%` }}
                    />
                  </div>
                  <div
                    className="absolute w-3 h-3 rounded-full bg-white shadow-md -translate-x-1/2 pointer-events-none transition-transform group-hover:scale-125"
                    style={{ left: `${seekPct}%` }}
                  />
                  <input
                    type="range"
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-5 m-0 p-0"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                  />
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {/* Play/Pause */}
                    <button
                      onClick={handlePlayPause}
                      className="p-1.5 rounded-md text-white/85 hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleMute}
                        className="p-1.5 rounded-md text-white/85 hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                      >
                        {isMuted || volume === 0 ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                          </svg>
                        )}
                      </button>
                      <input
                        type="range"
                        className="w-16 h-[3px]"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                      />
                    </div>

                    {/* Time display */}
                    <span className="text-xs text-white/65 tabular-nums px-1 whitespace-nowrap">
                      {fmt(currentTime)} / {fmt(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Fullscreen */}
                    <button
                      onClick={handleFullscreen}
                      className="p-1.5 rounded-md text-white/85 hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center justify-center"
                    >
                      {isFullscreen ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}