import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkProfileRepo, createProfileRepo } from "@/lib/github";
import { generateWorkflow } from "@/lib/workflow-template";
import { generateBadgeMarkdown } from "@/lib/utils";
import { redis } from "@/lib/redis";
import { Octokit } from "@octokit/core";

interface EditorLinksRequest {
  mode: "pinned" | "all" | "custom";
  color: string;
  style: string;
  totalStars: number;
  repos?: Array<{ owner: string; name: string }>;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.login) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: EditorLinksRequest = await request.json();
  const { mode, color, style, totalStars, repos } = body;
  const login = session.user.login;
  const token = session.accessToken;

  let profileRepo = await checkProfileRepo(token, login);
  if (!profileRepo.exists) {
    try {
      const created = await createProfileRepo(token, login);
      profileRepo = {
        exists: true,
        hasReadme: true,
        defaultBranch: created.defaultBranch,
      };
    } catch (createErr: any) {
      return NextResponse.json(
        { error: "Failed to create profile repo", message: createErr.message },
        { status: 500 }
      );
    }
  }

  const badgeMd = generateBadgeMarkdown(totalStars, color, style, mode);
  const badgeSnippet = `<!--STARS_START-->\n${badgeMd}\n<!--STARS_END-->`;
  const workflowYaml = generateWorkflow({ mode, color, style, repos });
  const octokit = new Octokit({ auth: token });
  const branch = profileRepo.defaultBranch;

  // Check if README exists and get its content
  let readmeExists = false;
  let readmeContent = "";
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner: login, repo: login, path: "README.md" }
    );
    readmeExists = true;
    if ("content" in data) {
      const currentReadme = Buffer.from(
        data.content as string,
        "base64"
      ).toString("utf-8");
      const markerRegex = /<!--STARS_START-->[\s\S]*?<!--STARS_END-->/;
      if (markerRegex.test(currentReadme)) {
        readmeContent = currentReadme.replace(markerRegex, badgeSnippet);
      } else {
        const headingMatch = currentReadme.match(/^#.+$/m);
        if (headingMatch && headingMatch.index !== undefined) {
          const insertPos = headingMatch.index + headingMatch[0].length;
          readmeContent =
            currentReadme.slice(0, insertPos) +
            `\n\n${badgeSnippet}` +
            currentReadme.slice(insertPos);
        } else {
          readmeContent = `${badgeSnippet}\n\n` + currentReadme;
        }
      }
    }
  } catch {
    readmeExists = false;
    readmeContent = `# ${login}\n\n${badgeSnippet}\n`;
  }

  // Check if workflow file exists
  let workflowExists = false;
  try {
    await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner: login,
        repo: login,
        path: ".github/workflows/update-stars.yml",
      }
    );
    workflowExists = true;
  } catch {
    workflowExists = false;
  }

  // Track stats
  await redis.zadd("stats:recent_users", {
    score: Date.now(),
    member: JSON.stringify({
      login,
      stars: totalStars,
      avatar: session.user.image || "",
    }),
  });
  const existing = await redis.hget<string>("stats:connected_users", login);
  const parsed = existing
    ? typeof existing === "string"
      ? JSON.parse(existing)
      : existing
    : {};
  await redis.hset("stats:connected_users", {
    [login]: JSON.stringify({
      login,
      stars: totalStars,
      avatar: session.user.image || "",
      connectedAt: parsed.connectedAt || Date.now(),
    }),
  });

  return NextResponse.json({
    success: true,
    login,
    defaultBranch: branch,
    readmeContent,
    readmeExists,
    workflowContent: workflowYaml,
    workflowExists,
    badgeSnippet,
  });
}
