const { Organization, Sale } = require("../models");
const { Op } = require("sequelize");

/**
 * GET /api/super-admin/dashboard-stats
 * Returns high-level platform stats for Super Admin.
 */
async function getDashboardStats(req, res) {
  try {
    const totalStores = await Organization.count({ where: { status: { [Op.ne]: "deleted" } } });
    const activeStores = await Organization.count({ where: { status: "active" } });
    const pendingRequests = await Organization.count({ where: { [Op.or]: [{ status: "pending" }, { status: null }] } });
    const suspendedStores = await Organization.count({ where: { status: "suspended" } });

    // Monthly revenue (sum of all paid sales across all organizations this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenueResult = await Sale.sum("total", {
      where: {
        status: "paid",
        createdAt: { [Op.gte]: startOfMonth },
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalStores,
        activeStores,
        pendingRequests,
        suspendedStores,
        monthlyRevenue: monthlyRevenueResult != null ? parseFloat(monthlyRevenueResult) : 0,
      },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  getDashboardStats,
};
