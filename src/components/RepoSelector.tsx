"use client";

interface Repo {
  name: string;
  owner: string;
  stargazerCount: number;
  description: string | null;
}

interface RepoSelectorProps {
  mode: "pinned" | "all" | "custom";
  onModeChange: (mode: "pinned" | "all" | "custom") => void;
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
      <div className="text-neutral-500 animate-pulse py-8 text-center text-sm">
        loading repos...
      </div>
    );
  }

  const allStars = publicRepos.reduce((sum, r) => sum + r.stargazerCount, 0);

  const activeButton =
    "bg-neutral-800 text-white border-neutral-600";
  const inactiveButton =
    "bg-black text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onModeChange("pinned")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 border ${
            mode === "pinned" ? activeButton : inactiveButton
          }`}
        >
          pinned repos ({pinnedRepos.length})
        </button>
        <button
          onClick={() => onModeChange("all")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 border ${
            mode === "all" ? activeButton : inactiveButton
          }`}
        >
          all repos ({publicRepos.length})
        </button>
        <button
          onClick={() => onModeChange("custom")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 border ${
            mode === "custom" ? activeButton : inactiveButton
          }`}
        >
          custom selection
        </button>
      </div>

      {mode === "all" && (
        <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-800 bg-black">
          <div>
            <p className="text-sm font-medium text-neutral-200">
              {publicRepos.length} repos across your account
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              aggregates stars from every public repo you own
            </p>
          </div>
          <span className="text-neutral-400 font-medium text-lg shrink-0 ml-4">
            {allStars.toLocaleString()} ★
          </span>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {mode === "pinned" ? (
          pinnedRepos.length === 0 ? (
            <p className="text-neutral-500 text-sm py-4 text-center">
              no pinned repos found. pin some repos on your github profile, or
              switch to custom selection.
            </p>
          ) : (
            pinnedRepos.map((repo) => (
              <RepoCard key={`${repo.owner}/${repo.name}`} repo={repo} />
            ))
          )
        ) : mode === "all" ? (
          publicRepos.map((repo) => (
            <RepoCard key={`${repo.owner}/${repo.name}`} repo={repo} />
          ))
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
      className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
        selectable ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-neutral-600 bg-neutral-800/20"
          : "border-neutral-800 hover:border-neutral-700 bg-black"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate text-neutral-200">
          {repo.owner}/{repo.name}
        </p>
        {repo.description && (
          <p className="text-xs text-neutral-500 truncate mt-0.5">
            {repo.description}
          </p>
        )}
      </div>
      <span className="text-neutral-400 font-medium text-sm ml-4 shrink-0">
        {repo.stargazerCount.toLocaleString()} ★
      </span>
    </div>
  );
}
