import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { redis } from "@/lib/redis";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      login: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      authorization: {
        params: {
          scope: "repo workflow read:user",
        },
      },
      profile(profile) {
        return {
          id: String(profile.id),
          login: profile.login,
          name: profile.name,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (user?.id) {
        const login = (profile as { login?: string })?.login || user.name || "";
        await redis.sadd("stats:unique_github", user.id);
        // Check if user already exists in connected_users
        const existing = await redis.hget<string>("stats:connected_users", login);
        if (existing) {
          // Keep existing entry (preserve stars and original connectedAt)
          const parsed = typeof existing === "string" ? JSON.parse(existing) : existing;
          await redis.hset("stats:connected_users", {
            [login]: JSON.stringify({
              ...parsed,
              avatar: user.image || parsed.avatar || "",
            }),
          });
        } else {
          await redis.hset("stats:connected_users", {
            [login]: JSON.stringify({
              login,
              avatar: user.image || "",
              stars: 0,
              connectedAt: Date.now(),
            }),
          });
        }
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.login = (profile as { login: string }).login;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (token.login) {
        session.user.login = token.login as string;
      }
      return session;
    },
  },
});
