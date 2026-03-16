"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import BadgePreview from "./BadgePreview";
import RepoSelector from "./RepoSelector";
import ColorPicker from "./ColorPicker";
import StyleSelector from "./StyleSelector";
import DiffPreview from "./DiffPreview";

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
  const [mode, setMode] = useState<"pinned" | "all" | "custom">("all");
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [color, setColor] = useState("yellow");
  const [style, setStyle] = useState("for-the-badge");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [diffData, setDiffData] = useState<{
    originalReadme: string;
    readmeContent: string;
    workflowContent: string;
    login: string;
    defaultBranch: string;
  } | null>(null);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraRepos, setExtraRepos] = useState<Repo[]>([]);

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
    if (mode === "all") {
      return (
        publicRepos.reduce((sum, r) => sum + r.stargazerCount, 0) +
        extraRepos.reduce((sum, r) => sum + r.stargazerCount, 0)
      );
    }
    return publicRepos
      .filter((r) => selectedRepos.has(`${r.owner}/${r.name}`))
      .reduce((sum, r) => sum + r.stargazerCount, 0);
  }, [mode, pinnedRepos, publicRepos, selectedRepos, extraRepos]);

  const handleAddRepo = useCallback(async (fullName: string) => {
    const [owner, name] = fullName.split("/");
    if (!owner || !name) return;
    const already =
      publicRepos.some((r) => r.owner === owner && r.name === name) ||
      extraRepos.some((r) => r.owner === owner && r.name === name);
    if (already) return;
    const res = await fetch(
      `/api/github/repo-info?owner=${encodeURIComponent(owner)}&name=${encodeURIComponent(name)}`
    );
    if (!res.ok) return;
    const repo: Repo = await res.json();
    setExtraRepos((prev) => [...prev, repo]);
  }, [publicRepos, extraRepos]);

  const handleRemoveRepo = useCallback((fullName: string) => {
    setExtraRepos((prev) =>
      prev.filter((r) => `${r.owner}/${r.name}` !== fullName)
    );
  }, []);

  async function handleAddToProfile() {
    setCreating(true);
    setError(null);
    setDiffData(null);

    const activeRepos =
      mode === "custom"
        ? publicRepos
            .filter((r) => selectedRepos.has(`${r.owner}/${r.name}`))
            .map((r) => ({ owner: r.owner, name: r.name }))
        : undefined;

    const extraReposList =
      mode === "all" && extraRepos.length > 0
        ? extraRepos.map((r) => ({ owner: r.owner, name: r.name }))
        : undefined;

    const res = await fetch("/api/github/editor-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        color,
        style,
        totalStars,
        repos: activeRepos,
        extraRepos: extraReposList,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setDiffData({
        originalReadme: data.originalReadme || "",
        readmeContent: data.readmeContent,
        workflowContent: data.workflowContent,
        login: data.login,
        defaultBranch: data.defaultBranch,
      });
    } else {
      setError(data.message || data.error);
    }
    setCreating(false);
  }

  async function handleCommit() {
    if (!diffData) return;
    setCommitting(true);
    setError(null);

    const res = await fetch("/api/github/commit-readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        readmeContent: diffData.readmeContent,
        workflowContent: diffData.workflowContent,
      }),
    });

    const data = await res.json();
    if (data.success) {
      window.open(data.commitUrl, "_blank");
      setShowCommitModal(false);
      setDiffData(null);
    } else {
      setError(data.message || data.error);
    }
    setCommitting(false);
  }

  if (!session) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="StarSum"
            width={32}
            height={32}
          />
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
        <BadgePreview totalStars={totalStars} color={color} style={style} mode={mode} />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
        <button
          onClick={() => setCustomizeOpen(!customizeOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-base font-medium text-neutral-300">
            customize
          </h2>
          <svg
            className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${customizeOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {customizeOpen && (
          <div className="px-6 pb-6 space-y-6">
            <ColorPicker value={color} onChange={setColor} />
            <StyleSelector value={style} onChange={setStyle} />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/50">
        <button
          onClick={() => setRepoOpen(!repoOpen)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h2 className="text-base font-medium text-neutral-300">
            repository selection
          </h2>
          <svg
            className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${repoOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {repoOpen && (
          <div className="px-6 pb-6">
            <RepoSelector
              mode={mode}
              onModeChange={setMode}
              pinnedRepos={pinnedRepos}
              publicRepos={publicRepos}
              selectedRepos={selectedRepos}
              onSelectedChange={setSelectedRepos}
              loading={loading}
              login={session.user.login}
              extraRepos={extraRepos}
              onAddRepo={handleAddRepo}
              onRemoveRepo={handleRemoveRepo}
            />
          </div>
        )}
      </section>

      <section className="rounded-xl p-6 border border-neutral-800 bg-neutral-900/50 text-center space-y-4">
        {diffData ? (
          <div className="space-y-4">
            <DiffPreview
              original={diffData.originalReadme}
              updated={diffData.readmeContent}
            />
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCommitModal(true)}
                className="px-6 py-3 bg-neutral-800 text-white rounded-full font-medium border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 transition-all duration-300"
              >
                view preview before committing
              </button>
              <button
                onClick={() => setDiffData(null)}
                className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
              >
                cancel
              </button>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        ) : (
          <>
            <button
              onClick={handleAddToProfile}
              disabled={
                creating || (mode === "custom" && selectedRepos.size === 0)
              }
              className="px-8 py-3 bg-neutral-800 text-white rounded-full font-medium text-base border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? "preparing..." : "add to profile"}
            </button>
            <p className="text-sm text-neutral-500">
              preview and commit changes to your{" "}
              <code className="text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded text-xs">
                {session.user.login}/{session.user.login}
              </code>{" "}
              profile repo
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </>
        )}
      </section>
      {showCommitModal && diffData && (() => {
        const newLines = diffData.readmeContent.split("\n");
        const oldLines = diffData.originalReadme.split("\n");
        const changedLineNums = new Set<number>();
        if (!diffData.originalReadme) {
          newLines.forEach((_, i) => changedLineNums.add(i));
        } else {
          let firstDiff = 0;
          while (
            firstDiff < oldLines.length &&
            firstDiff < newLines.length &&
            oldLines[firstDiff] === newLines[firstDiff]
          ) {
            firstDiff++;
          }
          let oldEnd = oldLines.length - 1;
          let newEnd = newLines.length - 1;
          while (
            oldEnd > firstDiff &&
            newEnd > firstDiff &&
            oldLines[oldEnd] === newLines[newEnd]
          ) {
            oldEnd--;
            newEnd--;
          }
          for (let i = firstDiff; i <= newEnd; i++) {
            changedLineNums.add(i);
          }
        }
        return (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCommitModal(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowCommitModal(false);
            }}
          >
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-sm text-neutral-400 font-mono">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  README.md
                </div>
                <button
                  onClick={() => setShowCommitModal(false)}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 text-xs font-mono leading-relaxed">
                {newLines.map((line, i) => (
                  <div
                    key={i}
                    className={`px-4 py-px whitespace-pre ${
                      changedLineNums.has(i)
                        ? "bg-green-500/15 text-green-300"
                        : "text-neutral-500"
                    }`}
                  >
                    <span className="inline-block w-8 text-right select-none opacity-30 mr-3">
                      {i + 1}
                    </span>
                    {line || "\u00A0"}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-neutral-800">
                {error && <p className="text-red-400 text-sm mr-auto">{error}</p>}
                <button
                  onClick={() => setShowCommitModal(false)}
                  className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
                >
                  cancel
                </button>
                <button
                  onClick={handleCommit}
                  disabled={committing}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-full font-medium text-sm hover:bg-green-500 transition-all duration-300 disabled:opacity-40"
                >
                  {committing ? "committing..." : "confirm commit"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
