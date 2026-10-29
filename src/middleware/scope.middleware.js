function scopeMiddleware() {
  return (req, res, next) => {
    // Extract scope_type and scope_id from query parameters or headers.
    // Default to 'company' and 'global' if not provided to maintain backward compatibility.
    const scopeType = req.query.scope_type || req.headers['x-scope-type'] || 'company';
    const scopeId = req.query.scope_id || req.headers['x-scope-id'] || 'global';

    console.log(`[ScopeMiddleware] Parsed scope: type=${scopeType}, id=${scopeId} (from headers: type=${req.headers['x-scope-type']}, id=${req.headers['x-scope-id']})`);

    req.scopeContext = {
      type: scopeType,
      id: scopeId,
    };

    next();
  };
}

module.exports = { scopeMiddleware };
