"use client";

import { useEffect, useState, useCallback } from "react";

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
  connectedUsers: RecentUser[];
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

export default function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [showConnected, setShowConnected] = useState(false);

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
        <span
          className="relative cursor-default"
          onMouseEnter={() => setShowConnected(true)}
          onMouseLeave={() => setShowConnected(false)}
        >
          {stats.uniqueGithub} connected
          {showConnected && stats.connectedUsers.length > 0 && (
            <div className="absolute top-full right-0 mt-2 rounded-xl bg-neutral-900/95 border border-white/10 px-3 py-2 backdrop-blur-sm text-xs text-white/60 space-y-1.5 min-w-[180px]">
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
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <span className="text-white/50">@{user.login}</span>
                  {user.stars > 0 && (
                    <span className="text-yellow-500/70 ml-auto">
                      {user.stars.toLocaleString()}
                    </span>
                  )}
                </a>
              ))}
            </div>
          )}
        </span>
      </div>

      {stats.recentUsers.length > 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 backdrop-blur-sm text-xs text-white/60 space-y-1.5">
          <p className="text-white/30 text-[10px] uppercase tracking-wider">
            recent
          </p>
          {stats.recentUsers.map((user) => (
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
                  className="w-4 h-4 rounded-full"
                />
              )}
              <span className="text-white/50">@{user.login}</span>
              <span className="text-yellow-500/70">{user.stars.toLocaleString()}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
