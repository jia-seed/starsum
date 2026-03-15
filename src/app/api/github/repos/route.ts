import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPinnedRepos, fetchPublicRepos } from "@/lib/github";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken || !session?.user?.login) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = session.user.login;

  const [pinned, publicRepos] = await Promise.all([
    fetchPinnedRepos(session.accessToken, login),
    fetchPublicRepos(session.accessToken, login),
  ]);

  // Update connected user's total stars
  const totalStars = publicRepos.reduce((sum: number, r: { stargazerCount: number }) => sum + r.stargazerCount, 0);
  const existing = await redis.hget<string>("stats:connected_users", login);
  const parsed = existing ? (typeof existing === "string" ? JSON.parse(existing) : existing) : {};
  if (parsed.connectedAt) {
    redis.hset("stats:connected_users", {
      [login]: JSON.stringify({
        ...parsed,
        stars: totalStars,
      }),
    });
  }

  return NextResponse.json({ pinned, public: publicRepos });
}
