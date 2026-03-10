"use client";

interface Repo {
  name: string;
  owner: string;
  stargazerCount: number;
  description: string | null;
}

interface RepoSelectorProps {
  mode: "pinned" | "custom";
  onModeChange: (mode: "pinned" | "custom") => void;
  pinnedRepos: Repo[];
  publicRepos: Repo[];
  selectedRepos: Set<string>;
  onSelectedChange: (selected: Set<string>) => void;
  loading: boolean;
}

export default function RepoSelector({
  mode,
  onModeChange,
  pinnedRepos,
  publicRepos,
  selectedRepos,
  onSelectedChange,
  loading,
}: RepoSelectorProps) {
  function toggleRepo(fullName: string) {
    const next = new Set(selectedRepos);
    if (next.has(fullName)) {
      next.delete(fullName);
    } else {
      next.add(fullName);
    }
    onSelectedChange(next);
  }

  if (loading) {
    return (
      <div className="text-text-muted animate-pulse py-8 text-center">
        Loading repos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange("pinned")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "pinned"
              ? "bg-accent text-black"
              : "bg-background text-text-muted hover:text-foreground"
          }`}
        >
          Pinned Repos ({pinnedRepos.length})
        </button>
        <button
          onClick={() => onModeChange("custom")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "custom"
              ? "bg-accent text-black"
              : "bg-background text-text-muted hover:text-foreground"
          }`}
        >
          Custom Selection
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {mode === "pinned" ? (
          pinnedRepos.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              No pinned repos found. Pin some repos on your GitHub profile, or
              switch to custom selection.
            </p>
          ) : (
            pinnedRepos.map((repo) => (
              <RepoCard key={`${repo.owner}/${repo.name}`} repo={repo} />
            ))
          )
        ) : (
          publicRepos.map((repo) => {
            const fullName = `${repo.owner}/${repo.name}`;
            return (
              <RepoCard
                key={fullName}
                repo={repo}
                selectable
                selected={selectedRepos.has(fullName)}
                onToggle={() => toggleRepo(fullName)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function RepoCard({
  repo,
  selectable = false,
  selected = false,
  onToggle,
}: {
  repo: Repo;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      onClick={selectable ? onToggle : undefined}
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-accent bg-accent/10"
          : "border-border hover:border-text-muted bg-background"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {repo.owner}/{repo.name}
        </p>
        {repo.description && (
          <p className="text-sm text-text-muted truncate">{repo.description}</p>
        )}
      </div>
      <span className="text-accent font-semibold ml-4 shrink-0">
        {repo.stargazerCount.toLocaleString()} ★
      </span>
    </div>
  );
}
