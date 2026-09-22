import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    provider: "pg",
    url: process.env.DATABASE_URL!,
  },

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
});
