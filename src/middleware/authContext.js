function authContext(store) {
  return async (req, _res, next) => {
    try {
      const userId = req.header("x-user-id") || "u-sales-1";
      const orgId = req.header("x-org-id");
      const role = req.header("x-user-role");
      
      const user = await store.getUser(userId);
      
      req.auth = {
        user_id: userId,
        organization_id: orgId || null,
        role: role || user?.role || "sales_agent",
        user: user || null,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { authContext };
