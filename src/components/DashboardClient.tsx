"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import BadgePreview from "./BadgePreview";
import RepoSelector from "./RepoSelector";
import ColorPicker from "./ColorPicker";
import StyleSelector from "./StyleSelector";

interface Repo {
  name: string;
  owner: string;
  stargazerCount: number;
  description: string | null;
  url: string;
}

export default function DashboardClient() {
  const { data: session } = useSession();
  const [pinnedRepos, setPinnedRepos] = useState<Repo[]>([]);
  const [publicRepos, setPublicRepos] = useState<Repo[]>([]);
  const [mode, setMode] = useState<"pinned" | "custom">("pinned");
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [color, setColor] = useState("yellow");
  const [style, setStyle] = useState("for-the-badge");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRepos() {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        setPinnedRepos(data.pinned);
        setPublicRepos(data.public);
      }
      setLoading(false);
    }
    fetchRepos();
  }, []);

  const totalStars = useMemo(() => {
    if (mode === "pinned") {
      return pinnedRepos.reduce((sum, r) => sum + r.stargazerCount, 0);
    }
    return publicRepos
      .filter((r) => selectedRepos.has(`${r.owner}/${r.name}`))
      .reduce((sum, r) => sum + r.stargazerCount, 0);
  }, [mode, pinnedRepos, publicRepos, selectedRepos]);

  async function handleCreatePR() {
    setCreating(true);
    setError(null);
    setPrUrl(null);

    const activeRepos =
      mode === "custom"
        ? publicRepos
            .filter((r) => selectedRepos.has(`${r.owner}/${r.name}`))
            .map((r) => ({ owner: r.owner, name: r.name }))
        : undefined;

    const res = await fetch("/api/github/create-pr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        color,
        style,
        totalStars,
        repos: activeRepos,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setPrUrl(data.prUrl || null);
      if (data.message) setError(data.message);
    } else {
      setError(data.message || data.error);
    }
    setCreating(false);
  }

  if (!session) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || ""}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-xl font-medium">{session.user.name}</h1>
            <p className="text-sm text-neutral-400">@{session.user.login}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
        >
          sign out
        </button>
      </header>

      <section className="rounded-xl p-6 border border-neutral-800 bg-neutral-900/50">
        <h2 className="text-base font-medium mb-4 text-neutral-300">
          badge preview
        </h2>
        <BadgePreview totalStars={totalStars} color={color} style={style} />
      </section>

      <section className="rounded-xl p-6 border border-neutral-800 bg-neutral-900/50 space-y-6">
        <h2 className="text-base font-medium text-neutral-300">customize</h2>
        <ColorPicker value={color} onChange={setColor} />
        <StyleSelector value={style} onChange={setStyle} />
      </section>

      <section className="rounded-xl p-6 border border-neutral-800 bg-neutral-900/50">
        <h2 className="text-base font-medium mb-4 text-neutral-300">
          repository selection
        </h2>
        <RepoSelector
          mode={mode}
          onModeChange={setMode}
          pinnedRepos={pinnedRepos}
          publicRepos={publicRepos}
          selectedRepos={selectedRepos}
          onSelectedChange={setSelectedRepos}
          loading={loading}
        />
      </section>

      <section className="rounded-xl p-6 border border-neutral-800 bg-neutral-900/50 text-center space-y-4">
        {prUrl ? (
          <div className="space-y-3">
            <p className="text-teal-400 font-medium">
              pr created successfully!
            </p>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-teal-900 text-white rounded-full font-medium border border-teal-700 hover:bg-teal-800 hover:border-teal-500 transition-all duration-300"
            >
              view pull request
            </a>
          </div>
        ) : (
          <>
            <button
              onClick={handleCreatePR}
              disabled={
                creating || (mode === "custom" && selectedRepos.size === 0)
              }
              className="px-8 py-3 bg-teal-900 text-white rounded-full font-medium text-base border border-teal-700 hover:bg-teal-800 hover:border-teal-500 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? "creating pr..." : "create pull request"}
            </button>
            <p className="text-sm text-neutral-500">
              this will create a pr to your{" "}
              <code className="text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded text-xs">
                {session.user.login}/{session.user.login}
              </code>{" "}
              profile repo
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}
