import { redis } from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const vid = req.nextUrl.searchParams.get("vid");
  if (!vid) {
    return NextResponse.json({ error: "missing vid" }, { status: 400 });
  }

  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;

  const pipe = redis.pipeline();

  // Try to set dedup key — only succeeds if visitor hasn't been counted in 5 min
  pipe.set(`stats:seen:${vid}`, "1", { nx: true, ex: 300 });
  // Track active visitor
  pipe.zadd("stats:active_visitors", { score: now, member: vid });
  // Prune stale visitors
  pipe.zremrangebyscore("stats:active_visitors", 0, fiveMinAgo);
  // Count active visitors
  pipe.zcard("stats:active_visitors");
  // Get total views
  pipe.get("stats:total_views");
  // Get unique GitHub connections
  pipe.scard("stats:unique_github");
  // Get 5 most recent users (highest scores = most recent)
  pipe.zrange("stats:recent_users", 0, 4, { rev: true });
  const results = await pipe.exec();

  // If SET NX succeeded (returned "OK"), increment total views
  const dedupResult = results[0];
  if (dedupResult === "OK") {
    await redis.incr("stats:total_views");
  }

  const activeVisitors = results[3] as number;
  const totalViews =
    (dedupResult === "OK" ? 1 : 0) + (Number(results[4]) || 0);
  const uniqueGithub = results[5] as number;
  const recentUsersRaw = (results[6] as string[]) || [];
  const recentUsers = recentUsersRaw.map((entry) => {
    try {
      return JSON.parse(entry);
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Fetch connected users outside pipeline (hgetall returns parsed object)
  const connectedRaw = await redis.hgetall<Record<string, string>>("stats:connected_users") || {};
  const connectedUsers = Object.values(connectedRaw).map((entry) => {
    try {
      return typeof entry === "string" ? JSON.parse(entry) : entry;
    } catch {
      return null;
    }
  }).filter(Boolean);

  return NextResponse.json({ totalViews, activeVisitors, uniqueGithub, recentUsers, connectedUsers });
}
