import React from "react";
import { CheckCircle2, Github, Search } from "lucide-react";

const RepoSelector = ({
  loadingRepos,
  repoQuery,
  onRepoQueryChange,
  selectedRepo,
  filteredRepos,
  onPickRepo,
}) => {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-emerald-900">
        Repository
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-emerald-500" />
        <input
          value={repoQuery}
          onChange={(event) => onRepoQueryChange(event.target.value)}
          placeholder={
            loadingRepos ? "Loading repositories..." : "Search repositories"
          }
          className="w-full rounded-lg border border-emerald-200 px-9 py-2.5 text-sm text-emerald-950 outline-none transition-colors focus:border-emerald-500"
        />
        {selectedRepo && (
          <span className="pointer-events-none absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      {!selectedRepo && repoQuery && filteredRepos.length > 0 && (
        <div className="mt-2 max-h-52 overflow-auto rounded-lg border border-emerald-100 bg-white">
          {filteredRepos.map((repo) => (
            <button
              key={repo.id}
              type="button"
              onClick={() => onPickRepo(repo)}
              className="flex w-full items-start justify-between border-b border-emerald-50 px-3 py-2 text-left last:border-b-0 hover:bg-emerald-50"
            >
              <span>
                <span className="block text-sm font-semibold text-emerald-950">
                  {repo.full_name}
                </span>
                {repo.description && (
                  <span className="line-clamp-1 block text-xs text-emerald-700">
                    {repo.description}
                  </span>
                )}
              </span>
              <Github className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepoSelector;
