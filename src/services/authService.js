const crypto = require("crypto");
const config = require("../config");

class AuthService {
  constructor({ store }) {
    this.store = store;
    this.oauthStateTtlMs = 10 * 60 * 1000;
    this.oauthStates = new Map();
  }

  pruneExpiredStates() {
    const now = Date.now();
    for (const [state, meta] of this.oauthStates.entries()) {
      if (!meta?.createdAt || now - meta.createdAt > this.oauthStateTtlMs) {
        this.oauthStates.delete(state);
      }
    }
  }

  issueState(provider) {
    this.pruneExpiredStates();
    const nonce = crypto.randomBytes(24).toString("hex");
    const state = `${provider}:${nonce}`;
    this.oauthStates.set(state, {
      provider,
      createdAt: Date.now(),
    });
    return state;
  }

  consumeState(provider, state) {
    this.pruneExpiredStates();
    if (!state) return false;
    const stateMeta = this.oauthStates.get(state);
    if (!stateMeta) return false;
    const isProviderMatch = stateMeta.provider === provider;
    const isNotExpired = Date.now() - stateMeta.createdAt <= this.oauthStateTtlMs;
    this.oauthStates.delete(state);
    return isProviderMatch && isNotExpired;
  }

  isGoogleConfigured() {
    return Boolean(config.googleClientId && config.googleClientSecret);
  }

  getGoogleRedirectUri(inputRedirectUri) {
    return inputRedirectUri || config.googleOAuthRedirectUri;
  }

  getGoogleScopes() {
    return [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar",
    ];
  }

  startOAuth({ provider, redirectUri }) {
    if (provider === "gmail") {
      if (!this.isGoogleConfigured()) {
        throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
      }

      const finalRedirectUri = this.getGoogleRedirectUri(redirectUri);
      if (!finalRedirectUri) {
        throw new Error("Google OAuth redirect URI is required.");
      }

      const state = this.issueState(provider);
      const params = new URLSearchParams({
        client_id: config.googleClientId,
        redirect_uri: finalRedirectUri,
        response_type: "code",
        scope: this.getGoogleScopes().join(" "),
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      });

      return {
        provider,
        auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        state,
      };
    }

    const state = this.issueState(provider);
    return {
      provider,
      auth_url: `https://auth.${provider}.example/authorize?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(
        redirectUri || "http://localhost:4000/auth/callback"
      )}`,
      state,
    };
  }

  async completeGoogleOAuth({ code, state, redirectUri, userId }) {
    if (!this.isGoogleConfigured()) {
      throw new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }
    if (!code) {
      throw new Error("Google OAuth code is required.");
    }
    if (!this.consumeState("gmail", state)) {
      throw new Error("Invalid or expired OAuth state. Please retry channel connection.");
    }

    const finalRedirectUri = this.getGoogleRedirectUri(redirectUri);
    if (!finalRedirectUri) {
      throw new Error("Google OAuth redirect URI is required.");
    }

    console.log(`[AuthService] Exchanging code for token. Redirect URI: ${finalRedirectUri}`);
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenPayload = await tokenResponse.json();
    console.log(`[AuthService] Token exchange payload:`, JSON.stringify(tokenPayload));
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      const errorCode = tokenPayload.error ? String(tokenPayload.error) : "";
      const errorDescription = tokenPayload.error_description ? String(tokenPayload.error_description) : "";
      const reason = [errorCode, errorDescription].filter(Boolean).join(": ") || "Google token exchange failed.";
      throw new Error(`Google OAuth failed: ${reason}`);
    }

    console.log(`[AuthService] Fetching profile info...`);
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`,
      },
    });
    const profilePayload = await profileResponse.json();
    console.log(`[AuthService] Profile payload:`, JSON.stringify(profilePayload));
    const email = profilePayload.email?.toLowerCase?.();
    if (!profileResponse.ok || !email) {
      throw new Error("Unable to fetch Google account email.");
    }

    const now = new Date();
    const expiresInSec = Number(tokenPayload.expires_in || 3600);
    const expiresAt = new Date(now.getTime() + expiresInSec * 1000).toISOString();

    console.log(`[AuthService] Upserting OAuth account for email: ${email}`);

    return this.store.upsertOAuthAccount({
      provider: "gmail",
      email,
      user_id: userId || null,
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      expires_at: expiresAt,
    });
  }

  async completeOAuth({ provider, email, code, state, redirectUri, userId }) {
    if (provider === "gmail") {
      return this.completeGoogleOAuth({
        code,
        state,
        redirectUri,
        userId,
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 55 * 60 * 1000).toISOString();
    return this.store.upsertOAuthAccount({
      provider,
      email,
      user_id: userId || null,
      access_token: `access_${provider}_${code || "mock"}`,
      refresh_token: `refresh_${provider}_${code || "mock"}`,
      expires_at: expiresAt,
    });
  }

  async refreshGoogleAccessToken(account) {
    if (!account?.refresh_token) {
      return null;
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        refresh_token: String(account.refresh_token),
        grant_type: "refresh_token",
      }),
    });

    const tokenPayload = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenPayload.access_token) {
      const errorCode = tokenPayload.error ? String(tokenPayload.error) : "";
      const errorDescription = tokenPayload.error_description ? String(tokenPayload.error_description) : "";
      const reason = [errorCode, errorDescription].filter(Boolean).join(": ") || "Google token refresh failed.";
      throw new Error(`Google OAuth refresh failed: ${reason}`);
    }

    const expiresInSec = Number(tokenPayload.expires_in || 3600);
    return this.store.upsertOAuthAccount({
      provider: account.provider,
      email: account.email,
      user_id: account.user_id || null,
      access_token: tokenPayload.access_token,
      refresh_token:
        tokenPayload.refresh_token !== undefined
          ? tokenPayload.refresh_token
          : account.refresh_token,
      expires_at: new Date(Date.now() + expiresInSec * 1000).toISOString(),
    });
  }

  async refreshIfNeeded(account) {
    if (!account) return null;
    const remainingMs = new Date(account.expires_at).getTime() - Date.now();
    if (remainingMs > 5 * 60 * 1000) return account;

    if (account.provider === "gmail") {
      return this.refreshGoogleAccessToken(account);
    }

    return this.store.upsertOAuthAccount({
      ...account,
      access_token: `${account.access_token}_refreshed`,
      expires_at: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
    });
  }
}

module.exports = { AuthService };
