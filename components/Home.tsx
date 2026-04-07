"use client";

import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { initPopunder, initSocialBar, openSmartlink } from "./adsterra/adsterra";
import AdBanner from "./adsterra/Adbanner";
import { showNativeAd } from "./adsterra/AdPopupProvider";
import { generateOTP } from "@/lib/otp";
import { initInPagePush, initVignette, openDirectLink } from "./monetag/monetag";
import { initVideoSlider, initInPagePush as initInPagePushHill } from "./hilltopads/hilltopads";
import HilltopBanner from "./hilltopads/HilltopBanner";

const servers = [
  "bangladesh",
  "india",
  "pakistan",
  "brazil",
  "indonesia",
  "thailand",
];

interface Emote {
  id: string;
  name: string;
  image: string;
}

export default function HomePage() {
  const [server, setServer] = useState(servers[0]);
  const [teamCode, setTeamCode] = useState("");
  const [uids, setUids] = useState<string[]>([""]);
  const [autoLeave, setAutoLeave] = useState(false);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [filteredEmotes, setFilteredEmotes] = useState<Emote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState<"name" | "id" | "both">("both");
  const [loadingEmote, setLoadingEmote] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLagging, setIsLagging] = useState(false);
  const [isUidPopupOpen, setIsUidPopupOpen] = useState(false);
  const [tempUids, setTempUids] = useState<string[]>([""]);
  const [tempTeamCode, setTempTeamCode] = useState("");
  const [tempServer, setTempServer] = useState(servers[0]);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const addUID = () => { if (uids.length < 4) setUids([...uids, ""]); };
  const updateUID = (index: number, value: string) => {
    const updated = [...uids]; updated[index] = value; setUids(updated);
  };
  const isDesktop = () => typeof window !== "undefined" && window.innerWidth >= 768;

  const openUidPopup = () => {
    setTempUids([...uids]);
    setTempTeamCode(teamCode);
    setTempServer(server);
    setIsUidPopupOpen(true);
  };
  const closeUidPopup = () => setIsUidPopupOpen(false);

  const saveUids = () => {
    const nonEmptyUids = tempUids.filter((uid) => uid.trim() !== "");
    if (nonEmptyUids.length === 0) {
      toast.error("At least one UID is required", { icon: "⚠️", style: { background: "#1a1a2e", color: "#fff", border: "1px solid #7c3aed" } });
      return;
    }
    if (!tempTeamCode.trim()) {
      toast.error("Team code is required", { icon: "⚠️", style: { background: "#1a1a2e", color: "#fff", border: "1px solid #7c3aed" } });
      return;
    }
    setUids(nonEmptyUids.length > 0 ? nonEmptyUids : [""]);
    setTeamCode(tempTeamCode);
    setServer(tempServer);
    closeUidPopup();
    toast.success("Settings saved!", { icon: "✅", style: { background: "#1a1a2e", color: "#fff", border: "1px solid #10b981" } });
  };

  const addTempUID = () => { if (tempUids.length < 4) setTempUids([...tempUids, ""]); };
  const updateTempUID = (index: number, value: string) => {
    const updated = [...tempUids]; updated[index] = value; setTempUids(updated);
  };
  const removeTempUID = (index: number) => {
    if (tempUids.length > 1) setTempUids(tempUids.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) closeUidPopup();
    };
    if (isUidPopupOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUidPopupOpen]);

  useEffect(() => {
    if (!emotes.length) return;
    if (!searchTerm.trim()) { setFilteredEmotes(emotes); return; }
    const term = searchTerm.toLowerCase().trim();
    const filtered = emotes.filter((emote) => {
      if (searchFilter === "name") return emote.name.toLowerCase().includes(term);
      if (searchFilter === "id") return emote.id.toLowerCase().includes(term);
      return emote.name.toLowerCase().includes(term) || emote.id.toLowerCase().includes(term);
    });
    setFilteredEmotes(filtered);
    if (filtered.length === 0) toast(`No emotes found for "${searchTerm}"`, { icon: "🔍", style: { background: "#1a1a2e", color: "#fff" }, duration: 2000 });
  }, [searchTerm, searchFilter, emotes]);

  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${event.clientX - rect.left - size / 2}px;top:${event.clientY - rect.top - size / 2}px;`;
    ripple.className = "ripple";
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  const sendEmote = async (emoteId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    const validUIDs = uids.filter((u) => u.trim() !== "");
    if (!teamCode || validUIDs.length === 0) {
      toast.error("Enter team code & at least one UID", { icon: "⚠️", style: { background: "#1a1a2e", color: "#fff" } });
      return;
    }
    setLoadingEmote(emoteId);
    toast.loading("Sending emote...", { id: "send", style: { background: "#1a1a2e", color: "#fff" } });
    try {
      const otp = await generateOTP();
      const res = await fetch("/api/send-emote", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-otp": otp },
        body: JSON.stringify({ server, team_code: teamCode, emote_id: emoteId, uids: validUIDs, auto_leave: autoLeave }),
      });
      const jsonData = await res.json();
      if (jsonData?.error) {
        toast.error(jsonData.error, { id: "send", icon: "❌", style: { background: "#1a1a2e", color: "#fff" } });
        return;
      }
      toast.success(jsonData.data.message, { id: "send", icon: "🎉", style: { background: "#1a1a2e", color: "#fff", border: "1px solid #10b981" } });
      const button = buttonRefs.current.get(emoteId);
      if (button) { button.classList.add("success-pulse"); setTimeout(() => button.classList.remove("success-pulse"), 500); }
    } catch (error) {
      console.error("Error sending emote:", error);
      toast.error("Failed to send emote", { id: "send", style: { background: "#1a1a2e", color: "#fff" } });
    } finally { setLoadingEmote(null); }
  };

  const fetchEmotes = async () => {
    try {
      const otp = await generateOTP();
      const res = await fetch(`/api/load-emote?offset=${emotes.length}&limit=1000`, { method: "GET", headers: { "Content-Type": "application/json", "x-otp": otp } });
      const data = await res.json();
      setEmotes(data.emotes);
      setFilteredEmotes(data.emotes);
    } catch { toast.error("Failed to load emotes"); }
  };

  const loadMoreEmotes = async (event: React.MouseEvent<HTMLButtonElement>) => {
    towLinkOpen();
    createRipple(event);
    setLoadingMore(true);
    try {
      const otp = await generateOTP();
      const res = await fetch(`/api/load-emote?offset=${emotes.length}&limit=50`, { method: "GET", headers: { "Content-Type": "application/json", "x-otp": otp } });
      const data = await res.json();
      setEmotes([...emotes, ...data.emotes]);
      toast.success(`Loaded ${data.emotes.length} more emotes!`, { icon: "📦", style: { background: "#1a1a2e", color: "#fff" } });
    } catch { toast.error("Failed to load more emotes"); } finally { setLoadingMore(false); }
  };

  const startLagging = async () => {
    if (!teamCode) return toast.error("Please enter team code");
    if (!server) return toast.error("Please select a server");
    setIsLagging(true);
    try {
      const otp = await generateOTP();
      const res = await fetch("/api/send-lag", { method: "POST", headers: { "Content-Type": "application/json", "x-otp": otp }, body: JSON.stringify({ team_code: teamCode, server }) });
      const resJson = await res.json();
      if (resJson?.error) { toast.error(resJson.error); return; }
      toast.success(resJson.data.message, { icon: "⚡", style: { background: "#1a1a2e", color: "#fff", border: "1px solid #7c3aed" } });
    } catch (err) { console.log(err); } finally { setIsLagging(false); }
  };

  const towLinkOpen = () => {
    openSmartlink();
    setTimeout(() => { openDirectLink(); }, 500);
  };

  useEffect(() => {
    initSocialBar(); initVignette(); initInPagePush();  initVideoSlider(); initInPagePushHill();
    const ad = () => showNativeAd(() => console.log("native reward"), 5, () => console.log("native no reward"));
    const timer = setTimeout(ad, 500);
    const timer1 = setTimeout(towLinkOpen, 1500);
    return () => { clearTimeout(timer); clearTimeout(timer1); };
  }, []);

  useEffect(() => { fetchEmotes(); }, []);

  const activeUidCount = uids.filter((uid) => uid.trim() !== "").length;

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #0f0a1e 50%, #0a0d1a 100%)" }}>
      <Toaster position="top-right" reverseOrder={false} />

      <style jsx>{`
        :root {
          --accent: #7c3aed;
          --accent2: #06b6d4;
          --accent3: #ec4899;
          --card-bg: rgba(255,255,255,0.03);
          --card-border: rgba(255,255,255,0.08);
          --card-hover-border: rgba(124,58,237,0.5);
        }

        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse-ring { 0%{transform:scale(0.9);opacity:1} 100%{transform:scale(1.3);opacity:0} }
        @keyframes successPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes ripple-animation { to{transform:scale(4);opacity:0} }
        @keyframes popIn { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes gradMove { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

        .ripple {
          position:absolute; border-radius:50%;
          background:rgba(255,255,255,0.35);
          transform:scale(0); pointer-events:none;
          animation: ripple-animation 0.6s ease-out;
        }
        .float-anim { animation: float 4s ease-in-out infinite; }
        .fade-up { animation: fadeUp 0.5s ease-out both; }
        .spinner { animation: spin 0.9s linear infinite; }
        .success-pulse { animation: successPulse 0.5s ease-in-out; }
        .pop-in { animation: popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }

        .glass-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .glass-card:hover { border-color: var(--card-hover-border); }

        .gradient-text {
          background: linear-gradient(135deg, #a78bfa, #ec4899, #22d3ee);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradMove 4s ease infinite;
        }

        .btn-primary {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          border: none; border-radius: 12px;
          color: #fff; font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
        }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-primary:active { transform: scale(0.97); }
        .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .btn-secondary {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #d4d4d8;
          cursor: pointer; font-size: 13px; font-weight: 500;
          transition: background 0.2s, border-color 0.2s;
        }
        .btn-secondary:hover { background: rgba(255,255,255,0.1); border-color: rgba(124,58,237,0.4); color: #fff; }

        .btn-chip {
          border-radius: 8px; font-size: 13px; font-weight: 500;
          padding: 6px 14px; cursor: pointer;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #a1a1aa;
          transition: all 0.2s;
        }
        .btn-chip.active {
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          border-color: transparent; color: #fff;
        }
        .btn-chip:not(.active):hover { background: rgba(255,255,255,0.1); color: #fff; }

        .input-field {
          width: 100%; box-sizing: border-box;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 12px 16px;
          color: #fff; font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .input-field::placeholder { color: #52525b; }
        .input-field:focus {
          border-color: rgba(124,58,237,0.6);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
        }

        select.input-field option { background: #1a1a2e; color: #fff; }

        .emote-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 16px;
          text-align: center;
          transition: border-color 0.25s, transform 0.2s, box-shadow 0.25s;
        }
        .emote-card:hover {
          border-color: rgba(124,58,237,0.5);
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(124,58,237,0.15);
        }

        .fab {
          position: fixed; bottom: 24px; right: 20px; z-index: 40;
          width: 60px; height: 60px; border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #06b6d4);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(124,58,237,0.45);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .fab:hover { transform: scale(1.1); box-shadow: 0 12px 32px rgba(124,58,237,0.6); }
        .fab:active { transform: scale(0.95); }

        .fab-badge {
          position: absolute; top: -4px; right: -4px;
          background: #ef4444; color: #fff;
          border-radius: 50%; width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          border: 2px solid #0d0d1a;
        }

        .popup-overlay {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          display: flex; align-items: center;
          justify-content: center; padding: 16px;
        }
        .popup-box {
          background: #13131f;
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 24px; padding: 28px;
          width: 100%; max-width: 480px;
          max-height: 90vh; overflow-y: auto;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
        }
        .popup-box::-webkit-scrollbar { width: 4px; }
        .popup-box::-webkit-scrollbar-track { background: transparent; }
        .popup-box::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }

        .server-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (max-width: 480px) {
          .server-grid { grid-template-columns: repeat(2, 1fr); }
        }

        .server-btn {
          padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 500;
          cursor: pointer; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #71717a;
          transition: all 0.2s;
        }
        .server-btn.active {
          background: rgba(124,58,237,0.2);
          border-color: rgba(124,58,237,0.5);
          color: #c4b5fd;
        }
        .server-btn:not(.active):hover {
          background: rgba(255,255,255,0.08);
          color: #d4d4d8;
        }

        .lag-btn {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #06b6d4 100%);
          background-size: 200% 200%;
          border: none; border-radius: 14px;
          color: #fff; font-weight: 700; font-size: 15px;
          padding: 14px 32px; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          animation: gradMove 3s ease infinite;
          letter-spacing: 0.03em;
        }
        .lag-btn:hover { opacity: 0.9; transform: translateY(-2px); }
        .lag-btn:active { transform: scale(0.97); }
        .lag-btn:disabled { opacity: 0.4; cursor: not-allowed; animation: none; transform: none; }

        .stats-bar {
          display: flex; gap: 12px; flex-wrap: wrap;
        }
        .stat-pill {
          background: rgba(124,58,237,0.12);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 20px; padding: 4px 12px;
          font-size: 12px; color: #c4b5fd; font-weight: 500;
        }

        .divider {
          height: 1px; background: rgba(255,255,255,0.06);
          margin: 20px 0;
        }

        .label { font-size: 12px; color: #71717a; font-weight: 500; margin-bottom: 8px; letter-spacing: 0.04em; text-transform: uppercase; }

        @media (max-width: 640px) {
          .popup-box { padding: 20px; border-radius: 20px; }
          .emote-card { padding: 12px; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 120px" }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 40, paddingTop: 16 }} className="fade-up">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Live</span>
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 8vw, 3.5rem)", fontWeight: 800, margin: "0 0 8px", lineHeight: 1.1 }} className="gradient-text float-anim">
            EMOTE BOT
          </h1>
          <p style={{ color: "#71717a", fontSize: 14, marginBottom: 6 }}>Send emotes to your team with style ✨</p>
          <p style={{ color: "#52525b", fontSize: 13 }}>
            by{" "}
            <a href="https://wa.me/+8801964753086" target="_blank" rel="noopener noreferrer"
              style={{ color: "#ec4899", textDecoration: "none", fontWeight: 600 }}>
              Md Jubayer
            </a>
          </p>
        </div>

        {/* CONFIG CARD */}
        <div className="glass-card fade-up" style={{ padding: "24px", marginBottom: 16, animationDelay: "0.1s" }}>

          {/* Top row: server + team code */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <div className="label">Server</div>
              <select value={server} onChange={(e) => setServer(e.target.value)} className="input-field">
                {servers.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Team Code</div>
              <input type="text" value={teamCode} onChange={(e) => setTeamCode(e.target.value)}
                className="input-field" placeholder="Enter team code" />
            </div>
          </div>

          {/* UIDs */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="label" style={{ margin: 0 }}>Player UIDs</div>
              <div className="stats-bar">
                <span className="stat-pill">{activeUidCount}/{uids.length} active</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {uids.map((uid, index) => (
                <input key={index} type="text" value={uid} onChange={(e) => updateUID(index, e.target.value)}
                  placeholder={`UID ${index + 1}`} className="input-field" />
              ))}
            </div>
            {uids.length < 4 && (
              <button onClick={addUID}
                style={{ marginTop: 12, background: "none", border: "none", color: "#06b6d4", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add UID
              </button>
            )}
          </div>

          <div className="divider" />

          {/* Bottom row: auto leave + lag button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                userSelect: "none"
              }}
            >
              <div style={{ position: "relative", width: 44, height: 24 }}>
                {/* CLICKABLE INPUT OVERLAY */}
                <input
                  type="checkbox"
                  checked={autoLeave}
                  onChange={() => setAutoLeave(!autoLeave)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 2
                  }}
                />

                {/* TOGGLE BACKGROUND */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 12,
                    background: autoLeave
                      ? "linear-gradient(135deg,#7c3aed,#06b6d4)"
                      : "rgba(255,255,255,0.1)",
                    transition: "background 0.2s",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  {/* TOGGLE CIRCLE */}
                  <div
                    style={{
                      position: "absolute",
                      top: 3,
                      left: autoLeave ? 22 : 3,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.3)"
                    }}
                  />
                </div>
              </div>

              <span style={{ fontSize: 14, color: "#a1a1aa" }}>
                Auto Leave
              </span>
            </label>

            <button onClick={startLagging} disabled={isLagging} className="lag-btn">
              {isLagging ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    className="spinner"
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%"
                    }}
                  />
                  Lagging...
                </span>
              ) : (
                <span>⚡ Start Lagging</span>
              )}
            </button>
          </div>
        </div>

        {/* AD BANNER */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, overflow: "hidden" }}>
          {isDesktop() ? <AdBanner type="banner728x90" /> : <AdBanner type="banner468x60" />}
        </div>

        {/* SEARCH */}
        <div className="glass-card fade-up" style={{ padding: "20px", marginBottom: 24, animationDelay: "0.15s" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
              <input ref={searchInputRef} type="text" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search emotes by name or ID..."
                className="input-field" style={{ paddingLeft: 42, paddingRight: searchTerm ? 42 : 16 }} />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); searchInputRef.current?.focus(); }}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#71717a", cursor: "pointer", fontSize: 16, padding: 4, display: "flex" }}>
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["both", "name", "id"] as const).map((f) => (
                <button key={f} onClick={() => setSearchFilter(f)} className={`btn-chip ${searchFilter === f ? "active" : ""}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {searchTerm && (
                <span style={{ fontSize: 13, color: "#71717a", display: "flex", alignItems: "center", marginLeft: "auto" }}>
                  <span style={{ color: "#a78bfa", fontWeight: 600 }}>{filteredEmotes.length}</span>&nbsp;result{filteredEmotes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* EMOTE GRID */}
        {filteredEmotes.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
            {filteredEmotes.map((emote, index) => (
              <div key={index} className="emote-card fade-up" style={{ animationDelay: `${Math.min(index * 0.03, 0.4)}s` }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img src={`/api/image/${emote.id}.png`} alt={emote.name}
                    style={{
                      width: 72, height: 72, objectFit: "contain", marginBottom: 10,
                      transition: "transform 0.25s", filter: loadingEmote === emote.id ? "brightness(0.5)" : "none"
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1.12) rotate(-3deg)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = "scale(1)"; }} />
                  {loadingEmote === emote.id && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div className="spinner" style={{ width: 24, height: 24, border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", borderRadius: "50%" }} />
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#d4d4d8", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={emote.name}>{emote.name}</p>
                <p style={{ fontSize: 10, color: "#52525b", marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={emote.id}>ID: {emote.id}</p>
                <button ref={(el) => { if (el) buttonRefs.current.set(emote.id, el); else buttonRefs.current.delete(emote.id); }}
                  onClick={(e) => sendEmote(emote.id, e)}
                  disabled={loadingEmote === emote.id}
                  className="btn-primary"
                  style={{ width: "100%", padding: "9px 0", fontSize: 13, borderRadius: 10 }}>
                  {loadingEmote === emote.id ? "Sending..." : "Send"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#a1a1aa", marginBottom: 6 }}>No Emotes Found</h3>
            <p style={{ fontSize: 14, color: "#52525b" }}>{searchTerm ? "Try a different search or filter" : "No emotes available"}</p>
          </div>
        )}

        {/* LOAD MORE */}
        {emotes.length > 0 && filteredEmotes.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <button onClick={loadMoreEmotes} disabled={loadingMore} className="btn-primary"
              style={{ padding: "13px 32px", fontSize: 14, borderRadius: 14, minWidth: 180 }}>
              {loadingMore ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="spinner" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} />
                  Loading...
                </span>
              ) : "📦 Load More Emotes"}
            </button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
          <HilltopBanner type="300x250" />
        </div>
      </div>

      {/* FAB */}
      <button onClick={openUidPopup} className="fab" title="Edit settings">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        {activeUidCount > 0 && <span className="fab-badge">{activeUidCount}</span>}
      </button>

      {/* SETTINGS POPUP */}
      {isUidPopupOpen && (
        <div className="popup-overlay">
          <div ref={popupRef} className="popup-box pop-in">

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, background: "linear-gradient(135deg,#a78bfa,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Quick Settings
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#52525b" }}>Edit server, team code & UIDs</p>
              </div>
              <button onClick={closeUidPopup}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#71717a", fontSize: 16, transition: "all 0.2s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#fff"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#71717a"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}>
                ✕
              </button>
            </div>

            {/* Server */}
            <div style={{ marginBottom: 20 }}>
              <div className="label">Server</div>
              <div className="server-grid">
                {servers.map((s) => (
                  <button key={s} onClick={() => setTempServer(s)} className={`server-btn ${tempServer === s ? "active" : ""}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Code */}
            <div style={{ marginBottom: 20 }}>
              <div className="label">Team Code</div>
              <input type="text" value={tempTeamCode} onChange={(e) => setTempTeamCode(e.target.value)}
                className="input-field" placeholder="Enter team code" autoComplete="off" />
            </div>

            <div className="divider" style={{ margin: "0 0 20px" }} />

            {/* UIDs */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="label" style={{ margin: 0 }}>Player UIDs</div>
                <span style={{ fontSize: 11, color: "#52525b" }}>max 4 UIDs</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
                {tempUids.map((uid, index) => (
                  <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>
                      {index + 1}
                    </div>
                    <input type="text" value={uid} onChange={(e) => updateTempUID(index, e.target.value)}
                      placeholder={`UID ${index + 1}`} className="input-field"
                      autoFocus={index === tempUids.length - 1 && index > 0} />
                    {tempUids.length > 1 && (
                      <button onClick={() => removeTempUID(index)} className="btn-secondary"
                        style={{ flexShrink: 0, width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}
                        title="Remove">
                        🗑
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {tempUids.length < 4 && (
                <button onClick={addTempUID}
                  style={{ marginTop: 12, background: "none", border: "none", color: "#06b6d4", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, padding: 0 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add UID
                </button>
              )}
            </div>

            <div className="divider" />

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveUids} className="btn-primary" style={{ flex: 1, padding: "13px 0", fontSize: 14, borderRadius: 12 }}>
                Save Changes
              </button>
              <button onClick={closeUidPopup} className="btn-secondary" style={{ padding: "13px 20px", fontSize: 14 }}>
                Cancel
              </button>
            </div>

            <p style={{ marginTop: 12, fontSize: 11, color: "#3f3f46", textAlign: "center" }}>
              Changes apply to all emote sends in this session
            </p>
          </div>
        </div>
      )}
    </div>
  );
}