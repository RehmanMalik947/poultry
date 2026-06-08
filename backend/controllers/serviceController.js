const { Op } = require("sequelize");
const {
  Service,
  ServiceItem,
  Category,
  Product,
  Sale,
  Staff,
  StaffService,
} = require("../models");
const { Branch } = require("../models/branch");
const { generateNextServiceCode, getServiceCodePrefix } = require("../utils/serviceSku");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

function canEditDelete(req) {
  if (req.user) return true;
  if (req.staff && (req.staff.role === "Admin" || req.staff.role === "Manager"))
    return true;
  return false;
}

async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (raw == null || raw === "") return null;
  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;
  const branch = await Branch.findOne({
    where: { id: branchId, organizationId },
  });
  return branch ? branch.id : null;
}

function toJson(svc, items = []) {
  const categoryName = svc.Category ? svc.Category.name : null;
  return {
    id: svc.id,
    organizationId: svc.organizationId,
    branchId: svc.branchId,
    serviceName: svc.serviceName,
    serviceCode: svc.serviceCode ?? null,
    category: svc.category ?? categoryName ?? null,
    categoryId: svc.categoryId ?? null,
    categoryName: categoryName ?? null,
    price:
      svc.price != null && svc.price !== ""
        ? parseFloat(String(svc.price))
        : null,
    duration: svc.duration ?? null,
    status: svc.status ?? "active",
    description: svc.description ?? null,
    date: svc.date,
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      itemName: i.Product ? i.Product.name : null,
      quantity: parseFloat(i.quantity),
    })),
    staffs: svc.Staffs ? svc.Staffs.map(s => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName
    })) : [],
    createdAt: svc.createdAt,
    updatedAt: svc.updatedAt,
  };
}

/**
 * Enrich service items with unit cost (from Product purchasePriceExc) and line total. Items have productId and optionally Product included.
 */
async function enrichItemsWithCost(organizationId, items) {
  const enriched = [];
  let totalCost = 0;
  for (const it of items) {
    const qty = parseFloat(it.quantity) || 0;
    let unitCost = 0;
    const prodRow =
      it.Product ||
      (it.productId != null
        ? await Product.findOne({ where: { id: it.productId, organizationId } })
        : null);
    if (prodRow && prodRow.purchasePriceExc != null) {
      unitCost = parseFloat(prodRow.purchasePriceExc) || 0;
    }
    const lineTotal = qty * unitCost;
    totalCost += lineTotal;
    enriched.push({
      id: it.id,
      productId: it.productId,
      itemName: prodRow ? prodRow.name : null,
      quantity: it.quantity,
      unitCost: Math.round(unitCost * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
    });
  }
  return { items: enriched, totalCost: Math.round(totalCost * 100) / 100 };
}

/**
 * GET /api/services/cogs
 * Cost of Goods Sold = total cost from utilization records for paid POS sales that still exist.
 * When there are no sales (or all deleted), COGS is 0.
 */
async function getCogs(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId, serviceName: { [Op.like]: "POS Sale #%" } };
    if (branchId != null) where.branchId = branchId;

    const list = await Service.findAll({
      where,
      attributes: ["id", "serviceName"],
      include: [
        {
          model: ServiceItem,
          as: "ServiceItems",
          required: true,
          attributes: ["quantity"],
          include: [
            { model: Product, as: "Product", attributes: ["purchasePriceExc"] },
          ],
        },
      ],
    });

    // Only count COGS for utilization where the corresponding Sale still exists
    const saleWhere = { organizationId };
    if (branchId != null) saleWhere.branchId = branchId;
    const existingSaleIds = new Set(
      (await Sale.findAll({ where: saleWhere, attributes: ["id"] })).map(
        (s) => s.id,
      ),
    );

    let cogs = 0;
    for (const svc of list) {
      const match = (svc.serviceName || "").match(/^POS Sale #(\d+)$/);
      const saleId = match ? parseInt(match[1], 10) : null;
      if (saleId == null || !existingSaleIds.has(saleId)) continue;
      for (const it of svc.ServiceItems || []) {
        const qty = parseFloat(it.quantity) || 0;
        const cost =
          it.Product && it.Product.purchasePriceExc != null
            ? parseFloat(it.Product.purchasePriceExc) || 0
            : 0;
        cogs += qty * cost;
      }
    }
    cogs = Math.round(cogs * 100) / 100;

    return res.status(200).json({ success: true, cogs });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("services getCogs error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/services?page=1&limit=10
 * Filter by branch when X-Branch-Id present. Pagination: page (1-based), limit (default 10, max 100).
 * Excludes system-generated "POS Sale #" records (used only for COGS, not shown in utilization list).
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    // const branchId = await getBranchIdFromHeader(req, organizationId);
const branchId = req.headers['x-branch-id'];


    const where = {
      organizationId,
      branchId,
      serviceName: { [Op.notLike]: "POS Sale #%" },
    };
    if (branchId != null) where.branchId = branchId;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      5000,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );
    const offset = (page - 1) * limit;

    const { count, rows: list } = await Service.findAndCountAll({
      distinct: true,
      where,
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
      include: [
        {
          model: Category,
          as: "Category",
          required: false,
          attributes: ["id", "name"],
        },
        {
          model: ServiceItem,
          as: "ServiceItems",
          required: false,
          include: [
            {
              model: Product,
              as: "Product",
              attributes: ["id", "name", "purchasePriceExc"],
            },
          ],
        },
        {
          model: Staff,
          as: "Staffs",
          required: false,
          attributes: ["id", "firstName", "lastName"],
          through: { attributes: [] }
        },
      ],
      limit,
      offset,
    });

    const data = [];
    for (const s of list) {
      const json = toJson(s, s.ServiceItems || []);
      const enriched = await enrichItemsWithCost(
        organizationId,
        s.ServiceItems || [],
      );
      data.push({
        ...json,
        items: enriched.items,
        totalCost: enriched.totalCost,
      });
    }

    return res
      .status(200)
      .json({ success: true, data, total: count, page, limit });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("services getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/services/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const s = await Service.findOne({
      where: { id, organizationId },
      include: [
        {
          model: Category,
          as: "Category",
          required: false,
          attributes: ["id", "name"],
        },
        {
          model: ServiceItem,
          as: "ServiceItems",
          required: false,
          include: [
            {
              model: Product,
              as: "Product",
              attributes: ["id", "name", "purchasePriceExc"],
            },
          ],
        },
      ],
    });
    if (!s)
      return res
        .status(404)
        .json({ success: false, message: "Service record not found" });
    if (s.serviceName && String(s.serviceName).startsWith("POS Sale #")) {
      return res
        .status(404)
        .json({ success: false, message: "Service record not found" });
    }

    const json = toJson(s, s.ServiceItems || []);
    const enriched = await enrichItemsWithCost(
      organizationId,
      s.ServiceItems || [],
    );
    return res.status(200).json({
      success: true,
      data: { ...json, items: enriched.items, totalCost: enriched.totalCost },
    });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("services getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/services
 * Body: serviceName*, date*, items* (array of { name, quantity } or { itemName, quantity }), category?, price?
 */
async function create(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can add services.",
      });
    }
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const body = req.body;

    const serviceName =
      body.serviceName != null ? String(body.serviceName).trim() : "";
    if (!serviceName)
      return res
        .status(400)
        .json({ success: false, message: "Service name is required" });

    const date = body.date != null ? String(body.date).trim() : "";
    if (!date)
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });

    const rawItems = Array.isArray(body.items) ? body.items : [];

    const finalBranchId =
      branchId ||
      (body.branchId != null ? parseInt(body.branchId, 10) : null) ||
      null;
    const category =
      body.category != null ? String(body.category).trim() || null : null;
    const categoryId =
      body.categoryId != null ? parseInt(body.categoryId, 10) : null;
    const price =
      body.price != null && body.price !== "" ? parseFloat(body.price) : null;
    const duration =
      body.duration != null && body.duration !== ""
        ? parseInt(body.duration, 10)
        : null;
    const status = body.status === "inactive" ? "inactive" : "active";
    const description =
      body.description != null ? String(body.description).trim() || null : null;

    const codeInput =
      body.serviceCode != null ? String(body.serviceCode).trim() : "";
    const serviceCode =
      codeInput ||
      (await generateNextServiceCode(organizationId, finalBranchId, {
        Service,
        Branch,
      }));

    const svc = await Service.create({
      organizationId,
      branchId: finalBranchId,
      serviceName,
      serviceCode,
      category: category || null,
      categoryId: Number.isNaN(categoryId) ? null : categoryId,
      price: Number.isNaN(price) ? null : price,
      duration: Number.isNaN(duration) ? null : duration,
      status,
      description,
      date,
    });
    const staffIds = Array.isArray(body.staffIds) ? body.staffIds : [];

    if (staffIds.length > 0) {

  await StaffService.bulkCreate(
    staffIds.map((staffId) => ({
      serviceId: svc.id,
      staffId,
    }))
  );
}

    for (const it of rawItems) {
      const prodId = it.productId != null ? parseInt(it.productId, 10) : null;
      const qty =
        it.quantity != null && it.quantity !== "" ? parseFloat(it.quantity) : 0;
      if (prodId == null || Number.isNaN(prodId)) continue;
      const prod = await Product.findOne({
        where: { id: prodId, organizationId },
      });
      if (!prod) continue;
      const itemQty = Number.isNaN(qty) ? 0 : qty;
      await ServiceItem.create({
        serviceId: svc.id,
        productId: prodId,
        quantity: itemQty,
      });
    }

    const items = await ServiceItem.findAll({
      where: { serviceId: svc.id },
      include: [
        {
          model: Product,
          as: "Product",
          attributes: ["id", "name", "purchasePriceExc"],
        },
      ],
    });
    const json = toJson(svc, items);
    const enriched = await enrichItemsWithCost(organizationId, items);
    return res.status(201).json({
      success: true,
      data: { ...json, items: enriched.items, totalCost: enriched.totalCost },
    });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("services create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/services/:id
 * Body: serviceName?, date?, items? (replaces all items), category?, price?
 */
async function update(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can edit services.",
      });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const s = await Service.findOne({ where: { id, organizationId } });
    if (!s)
      return res
        .status(404)
        .json({ success: false, message: "Service record not found" });

    if (s.serviceName && String(s.serviceName).startsWith("POS Sale #")) {
      return res.status(400).json({
        success: false,
        message:
          "This record is generated automatically when a sale is paid and cannot be edited.",
      });
    }
    const body = req.body
    if (Array.isArray(body.staffIds)) {
      await StaffService.destroy({
        where: {
          serviceId: s.id,
        },
      });

      if (body.staffIds.length > 0) {

  await StaffService.bulkCreate(
    body.staffIds.map((staffId) => ({
      serviceId: s.id,
      staffId,
    }))
  );
}
    }
    ;
    if (body.serviceName != null)
      s.serviceName = String(body.serviceName).trim();
    if (body.serviceCode !== undefined) {
      s.serviceCode =
        body.serviceCode != null ? String(body.serviceCode).trim() || null : null;
    }
    if (body.date != null) s.date = String(body.date).trim();
    if (body.category !== undefined)
      s.category =
        body.category != null ? String(body.category).trim() || null : null;
    if (body.categoryId !== undefined) {
      const cid =
        body.categoryId != null ? parseInt(body.categoryId, 10) : null;
      s.categoryId = Number.isNaN(cid) ? null : cid;
    }
    if (body.price !== undefined)
      s.price =
        body.price != null && body.price !== ""
          ? Number.isNaN(parseFloat(body.price))
            ? null
            : parseFloat(body.price)
          : null;
    if (body.duration !== undefined) {
      const dur =
        body.duration != null && body.duration !== ""
          ? parseInt(body.duration, 10)
          : null;
      s.duration = Number.isNaN(dur) ? null : dur;
    }
    if (body.status !== undefined)
      s.status = body.status === "inactive" ? "inactive" : "active";
    if (body.description !== undefined)
      s.description =
        body.description != null
          ? String(body.description).trim() || null
          : null;
    await s.save();

    if (Array.isArray(body.items)) {
      await ServiceItem.destroy({ where: { serviceId: s.id } });
      for (const it of body.items) {
        const prodId = it.productId != null ? parseInt(it.productId, 10) : null;
        const qty =
          it.quantity != null && it.quantity !== ""
            ? parseFloat(it.quantity)
            : 0;
        if (prodId == null || Number.isNaN(prodId)) continue;
        const prod = await Product.findOne({
          where: { id: prodId, organizationId },
        });
        if (!prod) continue;
        await ServiceItem.create({
          serviceId: s.id,
          productId: prodId,
          quantity: Number.isNaN(qty) ? 0 : qty,
        });
      }
    }

    const items = await ServiceItem.findAll({
      where: { serviceId: s.id },
      include: [
        {
          model: Product,
          as: "Product",
          attributes: ["id", "name", "purchasePriceExc"],
        },
      ],
    });
    const json = toJson(s, items);
    const enriched = await enrichItemsWithCost(organizationId, items);
    return res.status(200).json({
      success: true,
      data: { ...json, items: enriched.items, totalCost: enriched.totalCost },
    });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("services update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/services/:id
 */
async function remove(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can delete services.",
      });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const s = await Service.findOne({ where: { id, organizationId } });
    if (!s)
      return res
        .status(404)
        .json({ success: false, message: "Service record not found" });

    if (s.serviceName && String(s.serviceName).startsWith("POS Sale #")) {
      return res.status(400).json({
        success: false,
        message:
          "This record is generated automatically when a sale is paid. It is used only for Cost of Goods Sold and cannot be edited or deleted.",
      });
    }
await StaffService.destroy({
  where: {
    serviceId: s.id,
  },
});
    await ServiceItem.destroy({ where: { serviceId: s.id } });
    await s.destroy();
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    if (err.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete: this service has been used in sales.",
      });
    }
    console.error("services remove error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/services/next-code?branchId=1
 * Preview next service code (e.g. MB-SVR-001).
 */
async function getNextCode(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    let branchId = await getBranchIdFromHeader(req, organizationId);
    if (req.query.branchId != null && String(req.query.branchId).trim() !== "") {
      const parsed = parseInt(req.query.branchId, 10);
      if (!Number.isNaN(parsed)) branchId = parsed;
    }

    const branch =
      branchId != null
        ? await Branch.findOne({
            where: { id: branchId, organizationId },
            attributes: ["name"],
          })
        : null;
    const prefix = branch ? getServiceCodePrefix(branch.name) : `GEN-SVR`;
    const serviceCode = await generateNextServiceCode(organizationId, branchId, {
      Service,
      Branch,
    });

    return res.status(200).json({ success: true, data: { serviceCode, prefix } });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("services getNextCode error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAll, getById, getCogs, getNextCode, create, update, remove };
