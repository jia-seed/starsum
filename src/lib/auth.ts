import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

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
