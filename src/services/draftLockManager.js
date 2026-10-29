class DraftLockManager {
  constructor({ redisClient, defaultLockTtlSeconds = 60 }) {
    this.redisClient = redisClient || null;
    this.defaultLockTtlSeconds = defaultLockTtlSeconds;
    this.drafts = new Map();
    this.locks = new Map();
  }

  draftKey(threadId, userId) {
    return `draft:${threadId}:${userId}`;
  }

  lockKey(threadId) {
    return `draft_lock:${threadId}`;
  }

  async autosaveDraft({ threadId, userId, body, attachments }) {
    const payload = {
      thread_id: threadId,
      user_id: userId,
      body: body || "",
      attachments: attachments || [],
      autosaved_at: new Date().toISOString(),
    };
    const key = this.draftKey(threadId, userId);

    if (this.redisClient?.isOpen) {
      await this.redisClient.set(key, JSON.stringify(payload), { EX: 60 * 60 * 24 });
      return payload;
    }

    this.drafts.set(key, payload);
    return payload;
  }

  async getDraft({ threadId, userId }) {
    const key = this.draftKey(threadId, userId);
    if (this.redisClient?.isOpen) {
      const raw = await this.redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    }
    return this.drafts.get(key) || null;
  }

  async clearDraft({ threadId, userId }) {
    const key = this.draftKey(threadId, userId);
    if (this.redisClient?.isOpen) {
      await this.redisClient.del(key);
      return;
    }
    this.drafts.delete(key);
  }

  async acquireLock({ threadId, userId, ttlSeconds }) {
    const ttl = ttlSeconds || this.defaultLockTtlSeconds;
    const key = this.lockKey(threadId);
    const now = Date.now();

    if (this.redisClient?.isOpen) {
      const created = await this.redisClient.set(key, userId, { NX: true, EX: ttl });
      if (created === "OK") {
        return { acquired: true, owner: userId, ttl_seconds: ttl };
      }
      const owner = await this.redisClient.get(key);
      if (owner === userId) {
        await this.redisClient.expire(key, ttl);
        return { acquired: true, owner, ttl_seconds: ttl };
      }
      return { acquired: false, owner: owner || null, ttl_seconds: ttl };
    }

    const existing = this.locks.get(key);
    const isExpired = existing ? existing.expires_at <= now : true;
    if (!existing || isExpired || existing.owner === userId) {
      this.locks.set(key, { owner: userId, expires_at: now + ttl * 1000 });
      return { acquired: true, owner: userId, ttl_seconds: ttl };
    }
    return { acquired: false, owner: existing.owner, ttl_seconds: ttl };
  }

  async heartbeatLock({ threadId, userId, ttlSeconds }) {
    const ttl = ttlSeconds || this.defaultLockTtlSeconds;
    const key = this.lockKey(threadId);
    const now = Date.now();

    if (this.redisClient?.isOpen) {
      const owner = await this.redisClient.get(key);
      if (owner !== userId) {
        return { refreshed: false, owner: owner || null };
      }
      await this.redisClient.expire(key, ttl);
      return { refreshed: true, owner: userId, ttl_seconds: ttl };
    }

    const existing = this.locks.get(key);
    if (!existing || existing.owner !== userId) {
      return { refreshed: false, owner: existing?.owner || null };
    }
    this.locks.set(key, { owner: userId, expires_at: now + ttl * 1000 });
    return { refreshed: true, owner: userId, ttl_seconds: ttl };
  }

  async releaseLock({ threadId, userId }) {
    const key = this.lockKey(threadId);
    if (this.redisClient?.isOpen) {
      const owner = await this.redisClient.get(key);
      if (!owner) return { released: true, owner: null };
      if (owner !== userId) return { released: false, owner };
      await this.redisClient.del(key);
      return { released: true, owner };
    }

    const existing = this.locks.get(key);
    if (!existing) return { released: true, owner: null };
    if (existing.owner !== userId) return { released: false, owner: existing.owner };
    this.locks.delete(key);
    return { released: true, owner: userId };
  }

  async getLock(threadId) {
    const key = this.lockKey(threadId);
    if (this.redisClient?.isOpen) {
      const owner = await this.redisClient.get(key);
      return owner ? { owner } : null;
    }
    const lock = this.locks.get(key);
    if (!lock || lock.expires_at <= Date.now()) {
      this.locks.delete(key);
      return null;
    }
    return { owner: lock.owner };
  }
}

module.exports = { DraftLockManager };
