import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  })],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // After sign in, always go to dashboard
      if (url === baseUrl || url === `${baseUrl}/` || url.includes('/login') || url.includes('/api/auth')) {
        return `${baseUrl}/dashboard`;
      }
      return url.startsWith(baseUrl) ? url : `${baseUrl}/dashboard`;
    },
    async signIn({ user }) {
      const domains = (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
      const emails = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

      if ((domains.length > 0 || emails.length > 0) && user.email) {
        const domainAllowed = domains.some(d => user.email!.endsWith('@' + d));
        const emailAllowed = emails.includes(user.email.toLowerCase());

        if (!domainAllowed && !emailAllowed) {
          return false;
        }
      }

      return true;
    },
  },
});
