import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOctokit, checkProfileRepo, createProfileRepo } from "@/lib/github";
import { generateWorkflow } from "@/lib/workflow-template";
import { generateBadgeMarkdown } from "@/lib/utils";

interface CreatePRRequest {
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

  const body: CreatePRRequest = await request.json();
  const { mode, color, style, totalStars, repos } = body;
  const login = session.user.login;
  const token = session.accessToken;

  let profileRepo = await checkProfileRepo(token, login);
  if (!profileRepo.exists) {
    try {
      const created = await createProfileRepo(token, login);
      profileRepo = { exists: true, hasReadme: true, defaultBranch: created.defaultBranch };
    } catch (createErr: any) {
      return NextResponse.json(
        {
          error: "Failed to create profile repo",
          message: createErr.message,
        },
        { status: 500 }
      );
    }
  }

  const badgeMd = generateBadgeMarkdown(totalStars, color, style);
  const workflowYaml = generateWorkflow({ mode, color, style, repos });
  const octokit = getOctokit(token);

  function updateReadme(file: {
    exists: boolean;
    encoding: string;
    content: string;
  }): string {
    if (!file.exists) {
      return `# ${login}\n\n<!--STARS_START-->\n${badgeMd}\n<!--STARS_END-->\n`;
    }

    let readme = Buffer.from(file.content, "base64").toString("utf-8");
    const markerRegex = /<!--STARS_START-->[\s\S]*?<!--STARS_END-->/;

    if (markerRegex.test(readme)) {
      readme = readme.replace(
        markerRegex,
        `<!--STARS_START-->\n${badgeMd}\n<!--STARS_END-->`
      );
    } else {
      const headingMatch = readme.match(/^#.+$/m);
      if (headingMatch && headingMatch.index !== undefined) {
        const insertPos = headingMatch.index + headingMatch[0].length;
        readme =
          readme.slice(0, insertPos) +
          `\n\n<!--STARS_START-->\n${badgeMd}\n<!--STARS_END-->` +
          readme.slice(insertPos);
      } else {
        readme =
          `<!--STARS_START-->\n${badgeMd}\n<!--STARS_END-->\n\n` + readme;
      }
    }

    return readme;
  }

  try {
    const pr = await (octokit as any).createPullRequest({
      owner: login,
      repo: login,
      title: "Add GitHub Star Aggregator badge",
      body: `## What this PR does\n\n- Adds a total GitHub stars badge to your profile README\n- Adds a GitHub Action that automatically updates the star count every 6 hours\n\n### Badge Preview\n${badgeMd}\n\n### Files changed\n- \`README.md\` — Added star count badge with comment markers\n- \`.github/workflows/update-stars.yml\` — Auto-update workflow\n\n> **Note:** After merging, go to your repo's **Settings > Actions > General > Workflow permissions** and enable **Read and write permissions** so the Action can push updates.\n\n---\n*Created by [GitHub Star Aggregator](https://star-aggregator.jia.build)*`,
      head: "add-star-aggregator",
      base: profileRepo.defaultBranch,
      createWhenEmpty: false,
      changes: [
        {
          files: {
            "README.md": (file: any) => updateReadme(file),
            ".github/workflows/update-stars.yml": workflowYaml,
          },
          commit: "Add GitHub Star Aggregator badge and workflow",
        },
      ],
    });

    if (!pr) {
      return NextResponse.json({
        success: true,
        message: "No changes needed — badge is already up to date.",
      });
    }

    return NextResponse.json({
      success: true,
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
    });
  } catch (error: any) {
    if (error.message?.includes("Reference already exists")) {
      try {
        const pr = await (octokit as any).createPullRequest({
          owner: login,
          repo: login,
          title: "Update GitHub Star Aggregator badge",
          body: `Updated star count badge configuration.\n\n*Created by [GitHub Star Aggregator](https://star-aggregator.jia.build)*`,
          head: "add-star-aggregator",
          base: profileRepo.defaultBranch,
          update: true,
          changes: [
            {
              files: {
                "README.md": (file: any) => updateReadme(file),
                ".github/workflows/update-stars.yml": workflowYaml,
              },
              commit: "Update GitHub Star Aggregator badge and workflow",
            },
          ],
        });

        return NextResponse.json({
          success: true,
          prUrl: pr?.data.html_url,
          prNumber: pr?.data.number,
          updated: true,
        });
      } catch (retryError: any) {
        return NextResponse.json(
          { error: "Failed to update PR", message: retryError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create PR", message: error.message },
      { status: 500 }
    );
  }
}
