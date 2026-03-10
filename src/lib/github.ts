import { Octokit } from "@octokit/core";
import { createPullRequest } from "octokit-plugin-create-pull-request";

const MyOctokit = Octokit.plugin(createPullRequest);

export function getOctokit(token: string) {
  return new MyOctokit({ auth: token });
}

export interface Repo {
  name: string;
  owner: string;
  stargazerCount: number;
  description: string | null;
  url: string;
}

export async function fetchPinnedRepos(
  token: string,
  login: string
): Promise<Repo[]> {
  const octokit = new Octokit({ auth: token });
  const query = `{
    user(login: "${login}") {
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes {
          ... on Repository {
            name
            owner { login }
            stargazerCount
            description
            url
          }
        }
      }
    }
  }`;

  const result: any = await octokit.graphql(query);
  return result.user.pinnedItems.nodes.map((repo: any) => ({
    name: repo.name,
    owner: repo.owner.login,
    stargazerCount: repo.stargazerCount,
    description: repo.description,
    url: repo.url,
  }));
}

export async function fetchPublicRepos(
  token: string,
  login: string
): Promise<Repo[]> {
  const octokit = new Octokit({ auth: token });
  const repos: Repo[] = [];
  let page = 1;

  while (true) {
    const response = await octokit.request("GET /users/{username}/repos", {
      username: login,
      type: "owner",
      per_page: 100,
      page,
      sort: "updated",
      direction: "desc",
    });

    for (const repo of response.data) {
      repos.push({
        name: repo.name,
        owner: repo.owner.login,
        stargazerCount: repo.stargazers_count ?? 0,
        description: repo.description ?? null,
        url: repo.html_url ?? "",
      });
    }

    if (response.data.length < 100) break;
    page++;
  }

  // Sort by stars descending
  repos.sort((a, b) => b.stargazerCount - a.stargazerCount);
  return repos;
}

export async function checkProfileRepo(
  token: string,
  login: string
): Promise<{ exists: boolean; hasReadme: boolean; defaultBranch: string }> {
  const octokit = new Octokit({ auth: token });
  try {
    const { data: repo } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner: login,
      repo: login,
    });

    let hasReadme = false;
    try {
      await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
        owner: login,
        repo: login,
        path: "README.md",
      });
      hasReadme = true;
    } catch {
      hasReadme = false;
    }

    return { exists: true, hasReadme, defaultBranch: repo.default_branch };
  } catch {
    return { exists: false, hasReadme: false, defaultBranch: "main" };
  }
}
