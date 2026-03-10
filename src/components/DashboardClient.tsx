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
      body: JSON.stringify({ mode, color, style, totalStars, repos: activeRepos }),
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
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || ""}
              width={48}
              height={48}
              className="rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{session.user.name}</h1>
            <p className="text-text-muted">@{session.user.login}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-text-muted hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </header>

      <section className="bg-surface rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Badge Preview</h2>
        <BadgePreview totalStars={totalStars} color={color} style={style} />
      </section>

      <section className="bg-surface rounded-xl p-6 border border-border space-y-6">
        <h2 className="text-lg font-semibold">Customize</h2>
        <ColorPicker value={color} onChange={setColor} />
        <StyleSelector value={style} onChange={setStyle} />
      </section>

      <section className="bg-surface rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold mb-4">Repository Selection</h2>
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

      <section className="bg-surface rounded-xl p-6 border border-border text-center space-y-4">
        {prUrl ? (
          <div className="space-y-3">
            <p className="text-green-400 font-semibold">
              PR created successfully!
            </p>
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-accent text-black rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              View Pull Request
            </a>
          </div>
        ) : (
          <>
            <button
              onClick={handleCreatePR}
              disabled={
                creating || (mode === "custom" && selectedRepos.size === 0)
              }
              className="px-8 py-4 bg-accent text-black rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating PR..." : "Create Pull Request"}
            </button>
            <p className="text-sm text-text-muted">
              This will create a PR to your{" "}
              <code className="bg-background px-1 rounded">
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
