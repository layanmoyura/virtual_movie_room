import React, { useState } from "react";
import { Film, Play, LogIn, Sparkles, Shield, Clock, MonitorPlay, Zap } from "lucide-react";

interface HomeViewProps {
  onCreateRoom: (displayName?: string) => void;
  onJoinRoom: (roomIdOrCode: string, displayName?: string) => void;
  errorMessage?: string | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  errorMessage
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(displayNameInput.trim() || undefined);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    let targetCode = joinCodeInput.trim();
    // Support pasting full URL like http://.../room/MV-XXXX
    if (targetCode.includes("/room/")) {
      targetCode = targetCode.split("/room/")[1].split("?")[0];
    }

    onJoinRoom(targetCode, displayNameInput.trim() || undefined);
  };

  return (
    <div className="min-h-screen bg-cinema-bg flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cinema-accent flex items-center justify-center text-white shadow-lg shadow-cinema-accent/30">
            <Film className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg tracking-tight">Virtual Movie Room</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-cinema-neon font-medium bg-cinema-card border border-cinema-border px-3 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          <span>No Login Required</span>
        </div>
      </header>

      {/* Hero & Interactive Cards */}
      <main className="w-full max-w-4xl mx-auto my-auto py-8 space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Watch Movies Together <br />
            <span className="bg-gradient-to-r from-cinema-accent via-cyan-400 to-cinema-amber bg-clip-text text-transparent">
              In Perfect Sync.
            </span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
            Temporary watch party rooms. Paste direct media files, embed compatible players, or stream your browser tab. Zero accounts or passwords.
          </p>
        </div>

        {errorMessage && (
          <div className="max-w-md mx-auto p-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* Global Display Name Input */}
        <div className="max-w-md mx-auto">
          <label className="block text-xs font-medium text-gray-400 mb-1.5 text-center">
            Your Display Name (Optional)
          </label>
          <input
            type="text"
            maxLength={24}
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            placeholder="e.g. CinemaOtter (leave blank to randomize)"
            className="w-full px-4 py-2.5 bg-cinema-card border border-cinema-border rounded-xl text-sm text-center text-white placeholder-gray-500 focus:outline-none focus:border-cinema-accent transition"
          />
        </div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Create Room Card */}
          <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 flex flex-col justify-between hover:border-cinema-accent/50 transition shadow-xl group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cinema-accent/10 border border-cinema-accent/30 text-cinema-accent flex items-center justify-center">
                <Play className="w-6 h-6 ml-0.5" />
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-cinema-accent transition">Create a Room</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Generate an instant temporary cinema room. You will be the host and can share an invite link with friends.
              </p>
            </div>
            <form onSubmit={handleCreate} className="mt-6">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-cinema-accent hover:bg-blue-600 text-white font-semibold text-sm transition shadow-lg shadow-cinema-accent/25 flex items-center justify-center gap-2"
              >
                <span>Create New Room</span>
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="bg-cinema-card border border-cinema-border rounded-2xl p-6 flex flex-col justify-between hover:border-cinema-neon/50 transition shadow-xl group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cinema-neon/10 border border-cinema-neon/30 text-cinema-neon flex items-center justify-center">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-cinema-neon transition">Join a Room</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Enter a 6-character room code (e.g. <span className="font-mono text-cinema-neon">MV-7K2X</span>) or paste a full room link.
              </p>
            </div>
            <form onSubmit={handleJoin} className="mt-6 space-y-3">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="Room code or invite link"
                className="w-full px-4 py-2.5 bg-cinema-surface border border-cinema-border rounded-xl text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cinema-neon transition"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="w-full py-3 px-4 rounded-xl bg-cinema-surface hover:bg-cinema-border border border-cinema-border disabled:opacity-50 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <span>Join Watch Party</span>
                <LogIn className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4">
          <div className="p-3 rounded-xl bg-cinema-surface/50 border border-cinema-border flex flex-col items-center text-center gap-1.5">
            <Zap className="w-5 h-5 text-cinema-accent" />
            <span className="text-xs font-semibold text-white">Sub-Second Sync</span>
            <span className="text-[10px] text-gray-500">Drift auto-correction</span>
          </div>

          <div className="p-3 rounded-xl bg-cinema-surface/50 border border-cinema-border flex flex-col items-center text-center gap-1.5">
            <MonitorPlay className="w-5 h-5 text-cinema-neon" />
            <span className="text-xs font-semibold text-white">Tab & Screen Share</span>
            <span className="text-[10px] text-gray-500">WebRTC P2P stream</span>
          </div>

          <div className="p-3 rounded-xl bg-cinema-surface/50 border border-cinema-border flex flex-col items-center text-center gap-1.5">
            <Clock className="w-5 h-5 text-cinema-amber" />
            <span className="text-xs font-semibold text-white">2h Inactivity Expiry</span>
            <span className="text-[10px] text-gray-500">Ephemeral memory</span>
          </div>

          <div className="p-3 rounded-xl bg-cinema-surface/50 border border-cinema-border flex flex-col items-center text-center gap-1.5">
            <Shield className="w-5 h-5 text-cinema-green" />
            <span className="text-xs font-semibold text-white">Zero Trackers</span>
            <span className="text-[10px] text-gray-500">No cookies or logs</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-cinema-border/40 text-xs text-gray-500">
        Virtual Movie Room — Respecting content origin policies & explicit user consent.
      </footer>
    </div>
  );
};
