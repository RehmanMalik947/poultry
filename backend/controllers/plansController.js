const { Subscription } = require("../models/subscription");
const { Organization } = require("../models/organization");

/**
 * GET /api/super-admin/plans
 * List all subscription plans with store count per plan
 */
async function getPlans(req, res) {
  try {
    const plans = await Subscription.findAll({
      order: [["id", "ASC"]],
    });

    const storeCountByPlan = await Organization.findAll({
      where: { status: "active" },
      attributes: ["subscriptionPlan"],
    });
    const countMap = {};
    storeCountByPlan.forEach((o) => {
      const name = o.subscriptionPlan || "None";
      countMap[name] = (countMap[name] || 0) + 1;
    });

    const data = plans.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price ? Number(p.price) : 0,
      durationDays: p.durationDays,
      storeCount: countMap[p.name] || 0,
      features: [], // extend later
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get plans error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/super-admin/plans
 * Body: { name, price, durationDays }
 */
async function createPlan(req, res) {
  try {
    const { name, price, durationDays } = req.body;
    if (!name || durationDays == null) {
      return res.status(400).json({ success: false, message: "Name and durationDays required" });
    }
    const plan = await Subscription.create({
      name: String(name).trim(),
      price: price != null ? Number(price) : 0,
      durationDays: Number(durationDays) || 30,
    });
    return res.status(201).json({ success: true, data: plan });
  } catch (err) {
    console.error("Create plan error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/super-admin/plans/:id
 */
async function updatePlan(req, res) {
  try {
    const plan = await Subscription.findByPk(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    const { name, price, durationDays } = req.body;
    if (name !== undefined) plan.name = String(name).trim();
    if (price !== undefined) plan.price = Number(price);
    if (durationDays !== undefined) plan.durationDays = Number(durationDays);
    await plan.save();
    return res.status(200).json({ success: true, data: plan });
  } catch (err) {
    console.error("Update plan error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getPlans, createPlan, updatePlan };
