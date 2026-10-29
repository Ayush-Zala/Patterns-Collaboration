import { PrismaClient } from "@prisma/client";

declare global {
  var __sharedInboxPrisma: PrismaClient | undefined;
}

function attachPrismaModelAliases(client: PrismaClient): PrismaClient {
  const prisma = client as PrismaClient & Record<string, unknown>;
  const aliases: Record<string, string> = {
    activityLog: "activitylog",
    authAccount: "authaccount",
    authInvitation: "authinvitation",
    authMember: "authmember",
    authOrganization: "authorganization",
    authSession: "authsession",
    authVerification: "authverification",
    automationRule: "automationrule",
    channelSyncState: "channelsyncstate",
    inboxChannel: "inboxchannel",
    messageTemplate: "messagetemplate",
    oAuthAccount: "oauthaccount",
    signatureChannel: "signaturechannel",
    templateFolder: "templatefolder",
  };

  for (const [alias, source] of Object.entries(aliases)) {
    if (!prisma[alias] && prisma[source]) {
      prisma[alias] = prisma[source];
    }
  }

  return prisma as PrismaClient;
}

export const prisma =
  global.__sharedInboxPrisma ||
  attachPrismaModelAliases(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  );

if (process.env.NODE_ENV !== "production") {
  global.__sharedInboxPrisma = prisma;
}
