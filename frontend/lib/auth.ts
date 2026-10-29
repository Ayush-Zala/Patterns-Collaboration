import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { adminAc, memberAc } from "better-auth/plugins/organization/access";

import { prisma } from "@/lib/prisma";

const productGoogleClientId = process.env.PRODUCT_GOOGLE_CLIENT_ID || "";
const productGoogleClientSecret = process.env.PRODUCT_GOOGLE_CLIENT_SECRET || "";

const hasProductGoogleAuth = Boolean(productGoogleClientId && productGoogleClientSecret);
const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "shared-inbox-dev-secret-change-me";

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "http://localhost:3000",
  ],
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false, // Must be false to allow invited users to create accounts
    requireEmailVerification: false,
  },
  email: {
    from: "no-reply@patterns.ai",
    server: {
      host: "localhost",
      port: 1025,
    },
    async sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
      console.log("------------------------------------------");
      console.log(`EMAIL SENT TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`BODY: ${body}`);
      console.log("------------------------------------------");
      // For development, we just log to console.
    },
  },
  user: {
    modelName: "user",
    fields: {
      name: "name",
      email: "email",
      emailVerified: "emailVerified",
      image: "image",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "member",
        input: true,
      },
      firstName: {
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
      },
      username: {
        type: "string",
        required: false,
        input: true,
      },
      status: {
        type: "string",
        required: false,
        defaultValue: "available",
        input: false,
      },
      twoFactorEnabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "authsession",
    fields: {
      expiresAt: "expiresAt",
      token: "token",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      ipAddress: "ipAddress",
      userAgent: "userAgent",
      userId: "userId",
    },
  },
  account: {
    modelName: "authaccount",
    fields: {
      accountId: "accountId",
      providerId: "providerId",
      userId: "userId",
      accessToken: "accessToken",
      refreshToken: "refreshToken",
      idToken: "idToken",
      accessTokenExpiresAt: "accessTokenExpiresAt",
      refreshTokenExpiresAt: "refreshTokenExpiresAt",
      scope: "scope",
      password: "password",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  verification: {
    modelName: "authverification",
    fields: {
      identifier: "identifier",
      value: "value",
      expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  plugins: [
    organization({
      creatorRole: "admin",
      schema: {
        organization: {
          modelName: "authorganization",
        },
        member: {
          modelName: "authmember",
        },
        invitation: {
          modelName: "authinvitation",
        },
        session: {
          fields: {
            activeOrganizationId: "activeOrganizationId",
          },
        },
      },
      roles: {
        owner: adminAc,
        admin: adminAc,
        member: memberAc,
      },
    }),
    nextCookies(),
  ],
});
