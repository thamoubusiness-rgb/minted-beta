import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import { upsertCreator, X_USER_FIELDS, type XUser } from "./x";

// X sign-in (OAuth 2.0 + PKCE). We only read the profile: no posting scopes.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.AUTH_TWITTER_ID,
      clientSecret: process.env.AUTH_TWITTER_SECRET,
      userinfo: `https://api.x.com/2/users/me?user.fields=${X_USER_FIELDS}`,
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, profile }) {
      // First sign-in: store the creator and keep only their id in the session cookie.
      if (account && profile) {
        const u = (profile as unknown as { data: XUser }).data;
        const creator = await upsertCreator(u);
        token.creatorId = creator.id;
        token.xUserId = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as { creatorId?: string }).creatorId = token.creatorId as string | undefined;
      return session;
    },
  },
});
