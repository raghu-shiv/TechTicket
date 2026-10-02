import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],

  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-change-this-32-chars",
});
