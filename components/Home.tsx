"use client";

import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { initPopunder, initSocialBar } from "./adsterra/adsterra";
import AdBanner from "./adsterra/Adbanner";
import { showNativeAd } from "./adsterra/AdPopupProvider";

/* ------------------- JSON DATA ------------------- */
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

/* ------------------- PAGE ------------------- */
export default function HomePage() {
  const [server, setServer] = useState(servers[0]);
  const [teamCode, setTeamCode] = useState("");
  const [uids, setUids] = useState<string[]>([""]);
  const [autoLeave, setAutoLeave] = useState(false);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [filteredEmotes, setFilteredEmotes] = useState<Emote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState<"name" | "id" | "both">(
    "both",
  );
  const [loadingEmote, setLoadingEmote] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isLagging, setIsLagging] = useState(false);

  // UID Popup state
  const [isUidPopupOpen, setIsUidPopupOpen] = useState(false);
  const [tempUids, setTempUids] = useState<string[]>([""]);
  const popupRef = useRef<HTMLDivElement>(null);

  // Refs for ripple effects
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const addUID = () => {
    if (uids.length < 4) setUids([...uids, ""]);
  };

  const updateUID = (index: number, value: string) => {
    const updated = [...uids];
    updated[index] = value;
    setUids(updated);
  };

  // Popup functions
  const openUidPopup = () => {
    setTempUids([...uids]);
    setIsUidPopupOpen(true);
  };

  const closeUidPopup = () => {
    setIsUidPopupOpen(false);
  };

  const saveUids = () => {
    // Filter out empty UIDs
    const nonEmptyUids = tempUids.filter((uid) => uid.trim() !== "");
    if (nonEmptyUids.length === 0) {
      toast.error("At least one UID is required", {
        icon: "⚠️",
        style: { background: "#333", color: "#fff" },
      });
      return;
    }
    setUids(nonEmptyUids.length > 0 ? nonEmptyUids : [""]);
    closeUidPopup();
    toast.success("UIDs updated successfully!", {
      icon: "✅",
      style: { background: "#333", color: "#fff" },
    });
  };

  const addTempUID = () => {
    if (tempUids.length < 4) setTempUids([...tempUids, ""]);
  };

  const updateTempUID = (index: number, value: string) => {
    const updated = [...tempUids];
    updated[index] = value;
    setTempUids(updated);
  };

  const removeTempUID = (index: number) => {
    if (tempUids.length > 1) {
      const updated = tempUids.filter((_, i) => i !== index);
      setTempUids(updated);
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        closeUidPopup();
      }
    };

    if (isUidPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUidPopupOpen]);

  // Filter emotes based on search term and filter type
  useEffect(() => {
    if (!emotes.length) return;

    if (!searchTerm.trim()) {
      setFilteredEmotes(emotes);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = emotes.filter((emote) => {
      if (searchFilter === "name") {
        return emote.name.toLowerCase().includes(term);
      } else if (searchFilter === "id") {
        return emote.id.toLowerCase().includes(term);
      } else {
        // both
        return (
          emote.name.toLowerCase().includes(term) ||
          emote.id.toLowerCase().includes(term)
        );
      }
    });

    setFilteredEmotes(filtered);

    // Show search results count
    if (filtered.length === 0) {
      toast(`No emotes found for "${searchTerm}"`, {
        icon: "🔍",
        style: {
          background: "#333",
          color: "#fff",
        },
        duration: 2000,
      });
    }
  }, [searchTerm, searchFilter, emotes]);

  // Ripple effect function
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = "ripple";

    button.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  const sendEmote = async (
    emoteId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    createRipple(event);

    const validUIDs = uids.filter((u) => u.trim() !== "");

    if (!teamCode || validUIDs.length === 0) {
      toast.error("Please enter team code and at least one UID", {
        icon: "⚠️",
        style: {
          background: "#333",
          color: "#fff",
        },
      });
      return;
    }

    setLoadingEmote(emoteId);
    const payload = {
      server,
      team_code: teamCode,
      emote_id: emoteId,
      uids: validUIDs,
      auto_leave: autoLeave,
    };

    toast.loading("Sending emote...", {
      id: "send",
      style: {
        background: "#333",
        color: "#fff",
      },
    });

    try {
      const res = await fetch("/api/send-emote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data } = await res.json();
      toast.success(data.message, {
        id: "send",
        icon: "🎉",
        style: {
          background: "#333",
          color: "#fff",
        },
      });

      // Add success animation to button
      const button = buttonRefs.current.get(emoteId);
      if (button) {
        button.classList.add("success-pulse");
        setTimeout(() => {
          button.classList.remove("success-pulse");
        }, 500);
      }
    } catch {
      toast.error("Failed to send emote", {
        id: "send",
        icon: "❌",
        style: {
          background: "#333",
          color: "#fff",
        },
      });
    } finally {
      setLoadingEmote(null);
    }
  };

  const fetchEmotes = async () => {
    try {
      const res = await fetch(
        `/api/load-emote?offset=${emotes.length}&limit=1000`,
      );
      const data = await res.json();
      setEmotes(data.emotes);
      setFilteredEmotes(data.emotes); // Initialize filtered emotes
    } catch (error) {
      toast.error("Failed to load emotes");
    }
  };

  const loadMoreEmotes = async (event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/load-emote?offset=${emotes.length}&limit=50`,
      );
      const data = await res.json();

      // Animate new emotes appearing
      setEmotes([...emotes, ...data.emotes]);

      toast.success(`Loaded ${data.emotes.length} more emotes!`, {
        icon: "📦",
        style: {
          background: "#333",
          color: "#fff",
        },
      });
    } catch (error) {
      toast.error("Failed to load more emotes");
    } finally {
      setLoadingMore(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const startLagging = async () => {
    if (!teamCode) return toast.error("Please enter team code");
    if (!server) return toast.error("Please select a server");
    setIsLagging(true);
    try {
      const res = await fetch("/api/send-lag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_code: teamCode, server }),
      });
      const { data } = await res.json();
      toast.success(data.message, {
        icon: "🎉",
        style: {
          background: "#333",
          color: "#fff",
        },
      });
      setIsLagging(false);
    } catch {
      toast.error("Failed to start lagging");
      setIsLagging(false);
    }
  };

  // Load initial emotes
  useEffect(() => {
    const loadEmotes = async () => {
      await fetchEmotes();
    };
    loadEmotes();
  }, []);

  //ads loader
  useEffect(() => {
    // initPopunder();
    initSocialBar();
    const ad = () => showNativeAd(() => console.log("native reward"), 5)
    //run after 2sec
    const timer = setTimeout(ad, 1000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <Toaster position="top-right" reverseOrder={false} />
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(139, 92, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.8);
          }
        }

        @keyframes successPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.15;
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        @keyframes popupFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transform: scale(0);
          animation: ripple-animation 0.6s ease-out;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .glow-animation {
          animation: glow 2s ease-in-out infinite;
        }

        .success-pulse {
          animation: successPulse 0.5s ease-in-out;
        }

        .slide-in {
          animation: slideIn 0.5s ease-out;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .hover-scale {
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .hover-scale:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }

        .hover-lift {
          transition: transform 0.2s ease;
        }

        .hover-lift:hover {
          transform: translateY(-2px);
        }

        .input-focus-effect {
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input-focus-effect:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
          outline: none;
        }

        .emote-grid-item {
          animation: slideIn 0.5s ease-out;
          animation-fill-mode: both;
        }

        .emote-grid-item:nth-child(odd) {
          animation-delay: 0.1s;
        }

        .emote-grid-item:nth-child(even) {
          animation-delay: 0.2s;
        }

        .search-highlight {
          background: linear-gradient(90deg, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .no-results-shake {
          animation: shake 0.5s ease-in-out;
        }

        .filter-chip-active {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          color: white;
        }

        .popup-animation {
          animation: popupFadeIn 0.3s ease-out;
        }

        .uid-badge {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .floating-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 40;
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border-radius: 9999px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(139, 92, 246, 0.5);
          transition: all 0.3s ease;
        }

        .floating-button:hover {
          transform: scale(1.1);
          box-shadow: 0 15px 30px rgba(139, 92, 246, 0.7);
        }

        .floating-button-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          border-radius: 9999px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          border: 2px solid #1f2937;
        }

        .edit-uid-button {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          transition: all 0.3s ease;
        }

        .edit-uid-button:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(139, 92, 246, 0.4);
        }

        .popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .popup-content {
          background: #1f2937;
          border-radius: 24px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          border: 1px solid #374151;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>

      <div className="max-w-6xl mx-auto relative">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500 rounded-full filter blur-3xl opacity-10 animate-pulse"></div>

        {/* HEADER */}
        <div className="relative mb-10">
          <h1 className="text-5xl font-bold text-center bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 bg-clip-text text-transparent float-animation">
            EMOTE BOT
          </h1>
          <p className="text-center text-zinc-400 mt-2 slide-in">
            Send emotes to your team with style ✨
          </p>
          <p className="text-zinc-400 text-center mt-2">
            Developed by <a className="underline text-pink-500" href="https://wa.me/+8801964753086" target="_blank" rel="noopener noreferrer">Md Jubayer</a>
          </p>
        </div>

        {/* INPUT SECTION (Original with UIDs) */}
        <div className="bg-zinc-900/80 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700 mb-4 hover:border-purple-500 transition-all duration-300 slide-in">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Server Select */}
            <div className="hover-lift">
              <label className="block mb-2 text-zinc-400">Server</label>
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="w-full bg-zinc-800/80 p-3 rounded-lg border border-zinc-600 input-focus-effect cursor-pointer transition-all"
              >
                {servers.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Team Code */}
            <div className="hover-lift">
              <label className="block mb-2 text-zinc-400">Team Code</label>
              <input
                type="text"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                className="w-full bg-zinc-800/80 p-3 rounded-lg border border-zinc-600 input-focus-effect transition-all"
                placeholder="Enter team code"
              />
            </div>
          </div>

          {/* UID Inputs */}
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-zinc-400">UIDs</label>
              <span className="text-xs text-zinc-500">
                {uids.filter((uid) => uid.trim() !== "").length} active /{" "}
                {uids.length} total
              </span>
            </div>
            {uids.map((uid, index) => (
              <div key={index} className="hover-lift">
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => updateUID(index, e.target.value)}
                  placeholder={`UID ${index + 1}`}
                  className="w-full bg-zinc-800/80 p-3 rounded-lg border border-zinc-600 input-focus-effect transition-all"
                  style={{ animationDelay: `${index * 0.1}s` }}
                />
              </div>
            ))}

            {uids.length < 4 && (
              <button
                onClick={addUID}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-all hover:translate-x-2 flex items-center gap-2 group"
              >
                <span className="text-xl group-hover:rotate-90 transition-transform">
                  +
                </span>
                Add UID
              </button>
            )}
          </div>

          {/* Auto Leave */}
          <div className="flex items-center mt-6 hover-lift">
            <input
              type="checkbox"
              checked={autoLeave}
              onChange={() => setAutoLeave(!autoLeave)}
              className="mr-3 accent-purple-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-zinc-300">Auto Leave</span>
          </div>
          <button
            onClick={() => startLagging()}
            disabled={isLagging}
            className="flex items-center m-auto justify-center bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          >
            <span className="ml-2">{isLagging ? "Lagging..." : "Start Lagging"}</span>
          </button>
        </div>



        <div className="m-auto flex justify-center items-center"> <AdBanner type="banner728x90" /></div>

        {/* SEARCH SECTION */}
        <div className="bg-zinc-900/80 mt-8 backdrop-blur-sm p-6 rounded-2xl border border-zinc-700 mb-8 slide-in">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 relative">
              <label className="block mb-2 text-zinc-400 text-sm">
                Search Emotes
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or ID..."
                  className="w-full bg-zinc-800/80 p-3 pl-10 rounded-lg border border-zinc-600 input-focus-effect transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  🔍
                </span>
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSearchFilter("both")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchFilter === "both"
                  ? "filter-chip-active"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
              >
                Both
              </button>
              <button
                onClick={() => setSearchFilter("name")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchFilter === "name"
                  ? "filter-chip-active"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
              >
                Name
              </button>
              <button
                onClick={() => setSearchFilter("id")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${searchFilter === "id"
                  ? "filter-chip-active"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
              >
                ID
              </button>
            </div>
          </div>

          {/* Search Stats */}
          {searchTerm && (
            <div className="mt-3 text-sm text-zinc-400">
              Found{" "}
              <span className="text-purple-400 font-bold">
                {filteredEmotes.length}
              </span>{" "}
              emote{filteredEmotes.length !== 1 ? "s" : ""}
              {searchFilter === "name"
                ? " by name"
                : searchFilter === "id"
                  ? " by ID"
                  : ""}
            </div>
          )}
        </div>

        {/* EMOTE GRID */}
        {filteredEmotes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredEmotes.map((emote, index) => (
              <div
                key={index}
                className="emote-grid-item bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-xl p-4 text-center hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 group"
              >
                <div className="relative">
                  <img
                    src={`/api/image/${emote.id}.png`}
                    alt={emote.name}
                    className="w-20 h-20 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300"
                  />
                  {loadingEmote === emote.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full spinner"></div>
                    </div>
                  )}
                </div>
                <div className="mb-2">
                  <p
                    className="text-sm font-medium text-zinc-300 truncate"
                    title={emote.name}
                  >
                    {emote.name}
                  </p>
                  <p
                    className="text-xs text-zinc-500 truncate"
                    title={emote.id}
                  >
                    ID: {emote.id}
                  </p>
                </div>
                <button
                  ref={(el) => {
                    if (el) buttonRefs.current.set(emote.id, el);
                    else buttonRefs.current.delete(emote.id);
                  }}
                  onClick={(e) => sendEmote(emote.id, e)}
                  disabled={loadingEmote === emote.id}
                  className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed w-full hover-scale"
                >
                  {loadingEmote === emote.id ? "Sending..." : "Send"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-700">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              No Emotes Found
            </h3>
            <p className="text-zinc-500">
              {searchTerm ? (
                <>Try adjusting your search or filter settings</>
              ) : (
                <>No emotes available</>
              )}
            </p>
          </div>
        )}

        {/* Load More Button */}
        {emotes.length > 0 && filteredEmotes.length > 0 && (
          <button
            onClick={loadMoreEmotes}
            disabled={loadingMore}
            className="relative overflow-hidden mt-8 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 px-6 py-3 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-cyan-500/30 block mx-auto disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <span className="flex items-center gap-2">
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full spinner"></div>
                  Loading...
                </>
              ) : (
                <>
                  <span className="group-hover:translate-y-[-2px] transition-transform">
                    📦
                  </span>
                  Load More Emotes
                </>
              )}
            </span>
          </button>
        )}
      </div>

      {/* Floating UID Button (appears on mobile/tablet) */}
      <button onClick={openUidPopup} className="floating-button">
        <span className="text-2xl">👥</span>
        <span className="floating-button-badge">
          {uids.filter((uid) => uid.trim() !== "").length}
        </span>
      </button>

      {/* UID Edit Popup */}
      {isUidPopupOpen && (
        <div className="popup-overlay">
          <div ref={popupRef} className="popup-content popup-animation">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-cyan-400 bg-clip-text text-transparent">
                Edit UIDs
              </h2>
              <button
                onClick={closeUidPopup}
                className="text-zinc-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {tempUids.map((uid, index) => (
                <div key={index} className="flex gap-2 items-center group">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={uid}
                      onChange={(e) => updateTempUID(index, e.target.value)}
                      placeholder={`UID ${index + 1}`}
                      className="w-full bg-zinc-800 p-3 rounded-lg border border-zinc-600 input-focus-effect transition-all"
                      autoFocus={index === tempUids.length - 1}
                    />
                  </div>
                  {tempUids.length > 1 && (
                    <button
                      onClick={() => removeTempUID(index)}
                      className="text-zinc-400 hover:text-red-400 transition-colors p-2"
                      title="Remove UID"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>

            {tempUids.length < 4 && (
              <button
                onClick={addTempUID}
                className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-all hover:translate-x-2 flex items-center gap-2 group"
              >
                <span className="text-xl group-hover:rotate-90 transition-transform">
                  +
                </span>
                Add UID
              </button>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveUids}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-4 py-3 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-500/30"
              >
                Save Changes
              </button>
              <button
                onClick={closeUidPopup}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Quick tips */}
            <div className="mt-4 text-xs text-zinc-500 border-t border-zinc-700 pt-4">
              <p>💡 You can add up to 4 UIDs</p>
              <p>💡 Empty UIDs will be automatically filtered</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
