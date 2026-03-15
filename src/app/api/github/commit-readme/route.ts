import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Octokit } from "@octokit/core";

interface CommitRequest {
  readmeContent: string;
  workflowContent?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.login) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CommitRequest = await request.json();
  const { readmeContent, workflowContent } = body;
  const login = session.user.login;
  const octokit = new Octokit({ auth: session.accessToken });

  try {
    const { data: repo } = await octokit.request(
      "GET /repos/{owner}/{repo}",
      { owner: login, repo: login }
    );
    const branch = repo.default_branch;

    const { data: ref } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/ref/{ref}",
      { owner: login, repo: login, ref: `heads/${branch}` }
    );
    const parentSha = ref.object.sha;

    const { data: parentCommit } = await octokit.request(
      "GET /repos/{owner}/{repo}/git/commits/{commit_sha}",
      { owner: login, repo: login, commit_sha: parentSha }
    );

    const treeItems: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      sha: string;
    }> = [];

    const { data: readmeBlob } = await octokit.request(
      "POST /repos/{owner}/{repo}/git/blobs",
      {
        owner: login,
        repo: login,
        content: Buffer.from(readmeContent).toString("base64"),
        encoding: "base64",
      }
    );
    treeItems.push({
      path: "README.md",
      mode: "100644",
      type: "blob",
      sha: readmeBlob.sha,
    });

    if (workflowContent) {
      const { data: workflowBlob } = await octokit.request(
        "POST /repos/{owner}/{repo}/git/blobs",
        {
          owner: login,
          repo: login,
          content: Buffer.from(workflowContent).toString("base64"),
          encoding: "base64",
        }
      );
      treeItems.push({
        path: ".github/workflows/update-stars.yml",
        mode: "100644",
        type: "blob",
        sha: workflowBlob.sha,
      });
    }

    const { data: newTree } = await octokit.request(
      "POST /repos/{owner}/{repo}/git/trees",
      {
        owner: login,
        repo: login,
        base_tree: parentCommit.tree.sha,
        tree: treeItems,
      }
    );

    const { data: newCommit } = await octokit.request(
      "POST /repos/{owner}/{repo}/git/commits",
      {
        owner: login,
        repo: login,
        message: "Add StarSum badge",
        tree: newTree.sha,
        parents: [parentSha],
      }
    );

    await octokit.request(
      "PATCH /repos/{owner}/{repo}/git/refs/{ref}",
      {
        owner: login,
        repo: login,
        ref: `heads/${branch}`,
        sha: newCommit.sha,
      }
    );

    return NextResponse.json({
      success: true,
      commitUrl: `https://github.com/${login}/${login}/commit/${newCommit.sha}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to commit", message: error.message },
      { status: 500 }
    );
  }
}
