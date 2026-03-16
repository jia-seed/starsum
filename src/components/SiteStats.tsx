"use client";

import { useEffect, useState, useCallback } from "react";

interface ConnectedUser {
  login: string;
  stars: number;
  avatar: string;
  connectedAt: number;
}

interface RecentUser {
  login: string;
  stars: number;
  avatar: string;
}

interface Stats {
  totalViews: number;
  activeVisitors: number;
  uniqueGithub: number;
  recentUsers: RecentUser[];
  connectedUsers: ConnectedUser[];
}

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let vid = sessionStorage.getItem("starsum_vid");
  if (!vid) {
    vid = crypto.randomUUID();
    sessionStorage.setItem("starsum_vid", vid);
  }
  return vid;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [showConnected, setShowConnected] = useState(true);

  const fetchStats = useCallback(async () => {
    const vid = getVisitorId();
    if (!vid) return;
    try {
      const res = await fetch(`/api/stats?vid=${vid}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (!stats) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs text-white/60 backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {stats.activeVisitors}
        </span>
        <span className="text-white/20">|</span>
        <span>{stats.totalViews.toLocaleString()} views</span>
        <span className="text-white/20">|</span>
        <button
          onClick={() => setShowConnected(!showConnected)}
          className="hover:text-white/80 transition-colors"
        >
          {stats.uniqueGithub} connected
          <svg
            className={`inline-block w-3 h-3 ml-1 transition-transform duration-200 ${showConnected ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {showConnected && stats.connectedUsers.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 backdrop-blur-sm text-xs text-white/60 space-y-2 min-w-[200px]">
          {stats.connectedUsers.map((user) => (
            <a
              key={user.login}
              href={`https://github.com/${user.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white/80 transition-colors"
            >
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.login}
                  className="w-4 h-4 rounded-full flex-shrink-0"
                />
              )}
              <span className="text-white/50 truncate">{user.login}</span>
              {user.stars > 0 && (
                <span className="text-yellow-500/70 flex-shrink-0">
                  {user.stars.toLocaleString()}
                </span>
              )}
              <span className="text-white/25 ml-auto flex-shrink-0 whitespace-nowrap">
                {user.connectedAt ? timeAgo(user.connectedAt) : ""}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
