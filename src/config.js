const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  redisUrl: process.env.REDIS_URL || "",
  lockTtlSeconds: Number(process.env.LOCK_TTL_SECONDS || 60),
  storeMode: process.env.STORE_MODE || (process.env.DATABASE_URL ? "database" : "memory"),
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSeedOnBoot: String(process.env.DB_SEED_ON_BOOT || "true").toLowerCase() !== "false",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "",
  googlePubSubTopic: process.env.GOOGLE_PUBSUB_TOPIC || "",
  googleWatchLabelIds: process.env.GOOGLE_WATCH_LABEL_IDS || "INBOX,SENT",
};
