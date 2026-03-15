import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Octokit } from "@octokit/core";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const name = searchParams.get("name");

  if (!owner || !name) {
    return NextResponse.json(
      { error: "Missing owner or name" },
      { status: 400 }
    );
  }

  const octokit = new Octokit({ auth: session.accessToken });

  try {
    const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo: name,
    });

    if (data.private) {
      return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    }

    return NextResponse.json({
      name: data.name,
      owner: data.owner.login,
      stargazerCount: data.stargazers_count,
      description: data.description,
      url: data.html_url,
    });
  } catch {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
}
