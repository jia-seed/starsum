import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPinnedRepos, fetchPublicRepos } from "@/lib/github";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.login) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pinned, publicRepos] = await Promise.all([
    fetchPinnedRepos(session.accessToken, session.user.login),
    fetchPublicRepos(session.accessToken, session.user.login),
  ]);

  return NextResponse.json({ pinned, public: publicRepos });
}
