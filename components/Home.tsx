"use client";

import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { FiUser, FiPlus, FiTrash2, FiX, FiSearch, FiSun, FiMoon } from "react-icons/fi";
import { FaUserCircle, FaMagic, FaSyncAlt, FaBoxOpen, FaHeart } from "react-icons/fa";
import { MdEmojiEmotions, MdSettings, MdSave, MdCancel } from "react-icons/md";
import { GiRabbit, GiLightningElectron } from "react-icons/gi";
import { initPopunder, initSocialBar, openSmartlink } from "./adsterra/adsterra";
import AdBanner from "./adsterra/Adbanner";
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
    initSocialBar(); initVignette(); initInPagePush(); initVideoSlider(); initInPagePushHill();

    const timer1 = setTimeout(towLinkOpen, 1500);
    return () => { clearTimeout(timer1); };
  }, []);

  useEffect(() => { fetchEmotes(); }, []);

  const activeUidCount = uids.filter((uid) => uid.trim() !== "").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-[#0d0d1a] dark:via-[#0f0a1e] dark:to-[#0a0d1a] transition-colors duration-300">
      <Toaster position="top-right" reverseOrder={false} />


      <style jsx>{`
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.35);
          transform: scale(0);
          pointer-events: none;
          animation: ripple-animation 0.6s ease-out;
        }
        
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .success-pulse {
          animation: successPulse 0.5s ease-in-out;
        }
        
        @keyframes successPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .spinner {
          animation: spin 0.9s linear infinite;
        }
        
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .fade-up {
          animation: fadeUp 0.5s ease-out both;
        }
        
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .pop-in {
          animation: popIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        .float-anim {
          animation: float 4s ease-in-out infinite;
        }
        
        @keyframes gradMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .gradient-move {
          animation: gradMove 4s ease infinite;
        }
      `}</style>

      <div className="max-w-[1100px] mx-auto px-4 pb-[120px] pt-6">

        {/* HEADER */}
        <div className="text-center mb-10 pt-4 fade-up">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 dark:shadow-[0_0_8px_#10b981]" />
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-[0.1em] uppercase">Live</span>
          </div>
          <h1 className="text-[clamp(2.2rem,8vw,3.5rem)] font-extrabold mb-2 leading-[1.1] bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 dark:from-purple-400 dark:via-pink-500 dark:to-cyan-400 bg-[length:200%_auto] bg-clip-text text-transparent float-anim gradient-move">
            EMOTE BOT
          </h1>
          <p className="text-gray-600 dark:text-zinc-400 text-sm mb-1.5">Send emotes to your team with style ✨</p>
          <p className="text-gray-500 dark:text-zinc-500 text-xs">
            by{" "}
            <a href="https://wa.me/+8801964753086" target="_blank" rel="noopener noreferrer"
              className="text-pink-600 dark:text-pink-400 no-underline font-semibold hover:text-pink-700 dark:hover:text-pink-300 transition-colors">
              Md Jubayer
            </a>
          </p>
        </div>

        {/* CONFIG CARD */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-4 fade-up [animation-delay:0.1s] hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all">

          {/* Top row: server + team code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium mb-2 tracking-wide uppercase">Server</div>
              <select value={server} onChange={(e) => setServer(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:border-purple-500/60 focus:ring-3 focus:ring-purple-500/20 outline-none transition-all">
                {servers.map((s) => <option key={s} value={s} className="bg-white dark:bg-[#1a1a2e]">{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium mb-2 tracking-wide uppercase">Team Code</div>
              <input type="text" value={teamCode} onChange={(e) => setTeamCode(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:border-purple-500/60 focus:ring-3 focus:ring-purple-500/20 outline-none transition-all"
                placeholder="Enter team code" />
            </div>
          </div>

          {/* UIDs */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium tracking-wide uppercase">Player UIDs</div>
              <div className="flex gap-3 flex-wrap">
                <span className="bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30 rounded-full px-3 py-1 text-xs text-purple-700 dark:text-purple-300 font-medium">
                  {activeUidCount}/{uids.length} active
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {uids.map((uid, index) => (
                <input key={index} type="text" value={uid} onChange={(e) => updateUID(index, e.target.value)}
                  placeholder={`UID ${index + 1}`}
                  className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:border-purple-500/60 focus:ring-3 focus:ring-purple-500/20 outline-none transition-all" />
              ))}
            </div>
            {uids.length < 4 && (
              <button onClick={addUID}
                className="mt-3 bg-transparent border-none text-cyan-600 dark:text-cyan-400 cursor-pointer text-xs font-semibold flex items-center gap-1.5 p-0 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                <FiPlus className="text-lg" /> Add UID
              </button>
            )}
          </div>

          <div className="h-px bg-gray-200 dark:bg-white/10 my-5" />

          {/* Bottom row: auto leave + lag button */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative w-11 h-6">
                <input
                  type="checkbox"
                  checked={autoLeave}
                  onChange={() => setAutoLeave(!autoLeave)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`absolute inset-0 rounded-full transition-colors ${autoLeave ? 'bg-gradient-to-r from-purple-600 to-cyan-500' : 'bg-gray-300 dark:bg-white/10'} border border-gray-400 dark:border-white/10`}>
                  <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${autoLeave ? 'left-[22px]' : 'left-[3px]'}`} />
                </div>
              </div>
              <span className="text-sm text-gray-700 dark:text-zinc-400">Auto Leave</span>
            </label>

            <button onClick={startLagging} disabled={isLagging}
              className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-[length:200%_200%] border-none rounded-xl text-white font-bold text-sm px-8 py-3.5 cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none gradient-move">
              {isLagging ? (
                <span className="flex items-center gap-2">
                  <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Lagging...
                </span>
              ) : (
                <span className="flex items-center gap-2"><GiLightningElectron /> Start Lagging</span>
              )}
            </button>
          </div>
        </div>

        {/* AD BANNER */}
        <div className="flex justify-center mb-6 overflow-hidden">
          {isDesktop() ? <AdBanner type="banner728x90" /> : <AdBanner type="banner468x60" />}
        </div>

        {/* SEARCH */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-6 fade-up [animation-delay:0.15s] hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none text-gray-500 dark:text-gray-400" />
              <input ref={searchInputRef} type="text" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search emotes by name or ID..."
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl pl-10 pr-10 py-3 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:border-purple-500/60 focus:ring-3 focus:ring-purple-500/20 outline-none transition-all" />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-500 dark:text-zinc-500 cursor-pointer text-base p-1 flex hover:text-gray-700 dark:hover:text-white transition-colors">
                  <FiX />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["both", "name", "id"] as const).map((f) => (
                <button key={f} onClick={() => setSearchFilter(f)}
                  className={`rounded-lg text-xs font-medium px-3.5 py-1.5 cursor-pointer transition-all ${searchFilter === f
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 border-transparent text-white'
                      : 'bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {searchTerm && (
                <span className="text-xs text-gray-600 dark:text-zinc-500 flex items-center ml-auto">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">{filteredEmotes.length}</span>&nbsp;result{filteredEmotes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* EMOTE GRID */}
        {filteredEmotes.length > 0 ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3.5">
            {filteredEmotes.map((emote, index) => (
              <div key={index} className="bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center transition-all hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(124,58,237,0.15)] fade-up"
                style={{ animationDelay: `${Math.min(index * 0.03, 0.4)}s` }}>
                <div className="relative inline-block">
                  <img src={`/api/image/${emote.id}.png`} alt={emote.name}
                    className={`w-[72px] h-[72px] object-contain mb-2.5 transition-transform duration-200 hover:scale-110 hover:-rotate-3 ${loadingEmote === emote.id ? 'brightness-50' : ''}`} />
                  {loadingEmote === emote.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="spinner w-6 h-6 border-2 border-purple-500/30 border-t-purple-600 rounded-full" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-gray-800 dark:text-zinc-300 mb-0.5 truncate" title={emote.name}>{emote.name}</p>
                <p className="text-[10px] text-gray-500 dark:text-zinc-600 mb-2.5 truncate" title={emote.id}>ID: {emote.id}</p>
                <button ref={(el) => { if (el) buttonRefs.current.set(emote.id, el); else buttonRefs.current.delete(emote.id); }}
                  onClick={(e) => sendEmote(emote.id, e)}
                  disabled={loadingEmote === emote.id}
                  className="relative overflow-hidden w-full py-2.5 text-xs rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 border-none text-white font-semibold cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none">
                  {loadingEmote === emote.id ? "Sending..." : "Send"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
            <MdEmojiEmotions className="text-5xl mb-3 text-gray-500 dark:text-gray-400 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-zinc-400 mb-1.5">No Emotes Found</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-600">{searchTerm ? "Try a different search or filter" : "No emotes available"}</p>
          </div>
        )}

        {/* LOAD MORE */}
        {emotes.length > 0 && filteredEmotes.length > 0 && (
          <div className="flex justify-center mt-8">
            <button onClick={loadMoreEmotes} disabled={loadingMore}
              className="relative overflow-hidden px-8 py-3.5 text-sm rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 border-none text-white font-semibold cursor-pointer transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed min-w-[180px]">
              {loadingMore ? (
                <span className="flex items-center gap-2 justify-center">
                  <div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Loading...
                </span>
              ) : (
                <span className="flex items-center gap-2"><FaBoxOpen /> Load More Emotes</span>
              )}
            </button>
          </div>
        )}
        <div className="flex justify-center py-5">
          <HilltopBanner type="300x250" />
        </div>
        <div className="flex justify-center py-5">
          <AdBanner type="native" />
        </div>

      </div>

      {/* FAB */}
      <button onClick={openUidPopup}
        className="fixed bottom-6 right-5 z-40 w-[60px] h-[60px] rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 border-none cursor-pointer flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.45)] transition-all hover:scale-110 hover:shadow-[0_12px_32px_rgba(124,58,237,0.6)] active:scale-95">
        <FaUserCircle className="w-6 h-6 text-white" />
        {activeUidCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-[22px] h-[22px] flex items-center justify-center text-[11px] font-bold border-2 border-white dark:border-[#0d0d1a]">
            {activeUidCount}
          </span>
        )}
      </button>

      {/* SETTINGS POPUP */}
      {isUidPopupOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div ref={popupRef} className="bg-white dark:bg-[#13131f] border border-purple-500/30 dark:border-purple-500/30 rounded-2xl p-7 w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl pop-in">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold m-0 bg-gradient-to-r from-purple-600 to-cyan-600 dark:from-purple-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  Quick Settings
                </h2>
                <p className="text-xs text-gray-600 dark:text-zinc-600 mt-1">Edit server, team code & UIDs</p>
              </div>
              <button onClick={closeUidPopup}
                className="bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded-lg w-[34px] h-[34px] flex items-center justify-center cursor-pointer text-gray-500 dark:text-zinc-500 text-base transition-all hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/20">
                <FiX />
              </button>
            </div>

            {/* Server */}
            <div className="mb-5">
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium mb-2 tracking-wide uppercase">Server</div>
              <div className="grid grid-cols-3 gap-2">
                {servers.map((s) => (
                  <button key={s} onClick={() => setTempServer(s)}
                    className={`py-2 rounded-lg text-xs font-medium uppercase tracking-wide cursor-pointer transition-all ${tempServer === s
                        ? 'bg-purple-100 dark:bg-purple-500/20 border border-purple-400 dark:border-purple-500/50 text-purple-700 dark:text-purple-300'
                        : 'bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Code */}
            <div className="mb-5">
              <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium mb-2 tracking-wide uppercase">Team Code</div>
              <input type="text" value={tempTeamCode} onChange={(e) => setTempTeamCode(e.target.value)}
                className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:border-purple-500/60 focus:ring-3 focus:ring-purple-500/20 outline-none transition-all"
                placeholder="Enter team code" autoComplete="off" />
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 my-5" />

            {/* UIDs */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <div className="text-xs text-gray-600 dark:text-zinc-400 font-medium tracking-wide uppercase">Player UIDs</div>
                <span className="text-[11px] text-gray-500 dark:text-zinc-600">max 4 UIDs</span>
              </div>
              <div className="flex flex-col gap-2.5 max-h-[260px] overflow-y-auto pr-0.5">
                {tempUids.map((uid, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center flex-shrink-0 text-[11px] text-purple-700 dark:text-purple-400 font-bold">
                      {index + 1}
                    </div>
                    <input type="text" value={uid} onChange={(e) => updateTempUID(index, e.target.value)}
                      placeholder={`UID ${index + 1}`}
                      className="flex-1 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:border-purple-500/60 focus:ring-3 focus:ring-purple-500/20 outline-none transition-all"
                      autoFocus={index === tempUids.length - 1 && index > 0} />
                    {tempUids.length > 1 && (
                      <button onClick={() => removeTempUID(index)}
                        className="bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl w-9 h-9 p-0 flex items-center justify-center text-sm cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-white/20 hover:border-gray-400 flex-shrink-0"
                        title="Remove">
                        <FiTrash2 className="text-gray-600 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {tempUids.length < 4 && (
                <button onClick={addTempUID}
                  className="mt-3 bg-transparent border-none text-cyan-600 dark:text-cyan-400 cursor-pointer text-xs font-semibold flex items-center gap-1.5 p-0 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                  <FiPlus className="text-lg" /> Add UID
                </button>
              )}
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 my-5" />

            {/* Actions */}
            <div className="flex gap-2.5">
              <button onClick={saveUids}
                className="flex-1 py-3.5 text-sm rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 border-none text-white font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2">
                <MdSave /> Save Changes
              </button>
              <button onClick={closeUidPopup}
                className="py-3.5 px-5 text-sm rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-zinc-300 font-medium cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-white/20 flex items-center gap-2">
                <MdCancel /> Cancel
              </button>
            </div>

            <p className="mt-3 text-[11px] text-gray-500 dark:text-zinc-700 text-center">
              Changes apply to all emote sends in this session
            </p>
          </div>
        </div>
      )}
    </div>
  );
}