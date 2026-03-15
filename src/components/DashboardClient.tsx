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
  const [mode, setMode] = useState<"pinned" | "all" | "custom">("pinned");
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [color, setColor] = useState("yellow");
  const [style, setStyle] = useState("for-the-badge");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [editorLinks, setEditorLinks] = useState<{
    readmeUrl: string;
    workflowUrl: string;
    readmeExists: boolean;
    workflowExists: boolean;
    badgeSnippet: string;
    readmeContent: string;
  } | null>(null);
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
    if (mode === "all") {
      return publicRepos.reduce((sum, r) => sum + r.stargazerCount, 0);
    }
    return publicRepos
      .filter((r) => selectedRepos.has(`${r.owner}/${r.name}`))
      .reduce((sum, r) => sum + r.stargazerCount, 0);
  }, [mode, pinnedRepos, publicRepos, selectedRepos]);

  function buildGitHubEditorUrl(
    login: string,
    branch: string,
    filename: string,
    content: string,
    exists: boolean
  ): string {
    if (exists) {
      return `https://github.com/${login}/${login}/edit/${branch}/${filename}`;
    }
    const params = new URLSearchParams({
      filename,
      value: content,
      message: `Add ${filename.includes("workflow") ? "StarSum workflow" : "StarSum badge"}`,
    });
    return `https://github.com/${login}/${login}/new/${branch}?${params.toString()}`;
  }

  async function handleOpenEditor() {
    setCreating(true);
    setError(null);
    setEditorLinks(null);

    const activeRepos =
      mode === "custom"
        ? publicRepos
            .filter((r) => selectedRepos.has(`${r.owner}/${r.name}`))
            .map((r) => ({ owner: r.owner, name: r.name }))
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
      }),
    });

    const data = await res.json();
    if (data.success) {
      const readmeUrl = buildGitHubEditorUrl(
        data.login,
        data.defaultBranch,
        "README.md",
        data.readmeContent,
        data.readmeExists
      );
      const workflowUrl = buildGitHubEditorUrl(
        data.login,
        data.defaultBranch,
        ".github/workflows/update-stars.yml",
        data.workflowContent,
        data.workflowExists
      );
      setEditorLinks({
        readmeUrl,
        workflowUrl,
        readmeExists: data.readmeExists,
        workflowExists: data.workflowExists,
        badgeSnippet: data.badgeSnippet,
        readmeContent: data.readmeContent,
      });
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
            customize <span className="text-neutral-500 font-normal">(optional)</span>
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
            repository selection <span className="text-neutral-500 font-normal">(optional)</span>
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
            />
          </div>
        )}
      </section>

      <section className="rounded-xl p-6 border border-neutral-800 bg-neutral-900/50 text-center space-y-4">
        {editorLinks ? (
          <div className="space-y-4">
            <p className="text-neutral-300 font-medium">
              open in github to review and commit
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href={editorLinks.readmeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 bg-neutral-800 text-white rounded-full font-medium border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 transition-all duration-300 text-sm"
              >
                {editorLinks.readmeExists ? "edit" : "add"} README.md
              </a>
              <a
                href={editorLinks.workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 bg-neutral-800 text-white rounded-full font-medium border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 transition-all duration-300 text-sm"
              >
                {editorLinks.workflowExists ? "edit" : "add"} workflow
              </a>
            </div>
            {editorLinks.readmeExists && (
              <div className="text-left mt-4">
                <p className="text-xs text-neutral-500 mb-2">
                  replace your README.md content with:
                </p>
                <div className="relative">
                  <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {editorLinks.readmeContent}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(editorLinks.readmeContent)}
                    className="absolute top-2 right-2 px-2 py-1 text-xs bg-neutral-800 text-neutral-400 rounded border border-neutral-700 hover:text-white hover:border-neutral-500 transition-colors"
                  >
                    copy
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setEditorLinks(null)}
              className="text-sm text-neutral-500 hover:text-white transition-colors duration-300"
            >
              start over
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleOpenEditor}
              disabled={
                creating || (mode === "custom" && selectedRepos.size === 0)
              }
              className="px-8 py-3 bg-neutral-800 text-white rounded-full font-medium text-base border border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? "preparing..." : "add to profile"}
            </button>
            <p className="text-sm text-neutral-500">
              opens the github editor for your{" "}
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
