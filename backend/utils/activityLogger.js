const { ActivityLog } = require("../models/activityLog");

/**
 * Utility function to log user activities
 * @param {Object} params
 * @param {number} params.organizationId
 * @param {number|null} [params.branchId=null]
 * @param {number|null} [params.userId=null]
 * @param {string} params.module - e.g., 'Sales', 'Products', 'Settings'
 * @param {string} params.action - e.g., 'Created', 'Updated', 'Deleted', 'Login'
 * @param {string} [params.description=''] - Detailed description of the action
 */
async function logActivity({ organizationId, branchId = null, userId = null, module, action, description = "" }) {
  try {
    if (!organizationId || !module || !action) {
      console.warn("logActivity: Missing required fields (organizationId, module, action)");
      return null;
    }

    const log = await ActivityLog.create({
      organizationId,
      branchId,
      userId,
      module,
      action,
      description,
    });
    return log;
  } catch (err) {
    console.error("Failed to insert Activity Log:", err);
    return null;
  }
}

module.exports = { logActivity };
