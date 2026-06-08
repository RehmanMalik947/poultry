const { Op } = require("sequelize");
const { Package, Branch, Service } = require("../models");

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

/**
  Formats Package details and maps constituent service names/prices.
 */
async function enrichPackage(pkg, organizationId) {
  const servicesList = Array.isArray(pkg.services)
    ? pkg.services
    : JSON.parse(pkg.services || "[]");

  const enrichedServices = [];
  let totalServicesPrice = 0;

  for (const item of servicesList) {
    const serviceId = item?.serviceId ?? item?.service_id;
    if (serviceId == null || Number.isNaN(parseInt(serviceId, 10))) continue;

    const serviceRow = await Service.findOne({
      where: { id: parseInt(serviceId, 10), organizationId },
    });
    if (serviceRow) {
      const price = parseFloat(serviceRow.price) || 0;
      totalServicesPrice += price * (parseInt(item.quantity) || 1);
      enrichedServices.push({
        serviceId: parseInt(serviceId, 10),
        serviceName: serviceRow.serviceName,
        price: price,
        quantity: parseInt(item.quantity) || 1,
      });
    }
  }

  return {
    id: pkg.id,
    organizationId: pkg.organizationId,
    branchId: pkg.branchId,
    packageName: pkg.packageName,
    packageCode: pkg.packageCode,
    price: parseFloat(pkg.price) || 0,
    discountType: pkg.discountType || null,
    discount: parseFloat(pkg.discount) || 0,
    status: pkg.status || "active",
    description: pkg.description || null,
    services: enrichedServices,
    totalServicesPrice: totalServicesPrice,
    duration: pkg.duration != null ? parseInt(pkg.duration, 10) : 0, // Added duration to rich mapping
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

/**
 * GET /api/packages
 */
async function getAll(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);

    const where = { organizationId };
    if (branchId != null) where.branchId = branchId;
    if (req.query.status) where.status = req.query.status;

    const list = await Package.findAll({
      where,
      order: [["packageName", "ASC"]],
    });

    const data = [];
    for (const pkg of list) {
      data.push(await enrichPackage(pkg, organizationId));
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("packages getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/packages/:id
 */
async function getById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const pkg = await Package.findOne({
      where: { id, organizationId },
    });
    if (!pkg)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    const data = await enrichPackage(pkg, organizationId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("packages getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * POST /api/packages
 */
async function create(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can create packages.",
      });
    }
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const body = req.body;

    const packageName = body.packageName != null ? String(body.packageName).trim() : "";
    if (!packageName)
      return res
        .status(400)
        .json({ success: false, message: "Package name is required" });

    const price = body.price != null && body.price !== "" ? parseFloat(body.price) : 0;
    const services = (Array.isArray(body.services) ? body.services : []).filter(
      s => s && s.serviceId != null && !Number.isNaN(parseInt(s.serviceId, 10))
    );

    if (services.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one valid service is required in a package" });
    }

    const packageCode = body.packageCode != null ? String(body.packageCode).trim() || null : null;
    const discountType = body.discountType === "fixed" || body.discountType === "percentage" ? body.discountType : null;
    const discount = body.discount != null && body.discount !== "" ? parseFloat(body.discount) : 0;
    const status = body.status === "inactive" ? "inactive" : "active";
    const description = body.description != null ? String(body.description).trim() || null : null;

    // --- Dynamic Duration Processing ---
    let duration = body.duration != null && body.duration !== "" ? parseInt(body.duration, 10) : null;
    if (duration == null || Number.isNaN(duration) || duration <= 0) {
      duration = 0;
      // Auto-calculate sum of durations of selected services
      for (const item of services) {
        const serviceId = item?.serviceId ?? item?.service_id;
        if (serviceId == null || Number.isNaN(parseInt(serviceId, 10))) continue;
        const serviceRow = await Service.findOne({
          where: { id: parseInt(serviceId, 10), organizationId }
        });
        if (serviceRow && serviceRow.duration) {
          duration += parseInt(serviceRow.duration, 10) * (parseInt(item.quantity, 10) || 1);
        }
      }
    }

    const pkg = await Package.create({
      organizationId,
      branchId: branchId || body.branchId || null,
      packageName,
      packageCode,
      price: Number.isNaN(price) ? 0 : price,
      discountType,
      discount: Number.isNaN(discount) ? 0 : discount,
      status,
      description,
      services: services.map(s => ({
        serviceId: parseInt(s.serviceId, 10),
        quantity: parseInt(s.quantity, 10) || 1,
      })),
      duration: duration, // Saved package total duration
    });

    const data = await enrichPackage(pkg, organizationId);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("packages create error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * PUT /api/packages/:id
 */
async function update(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can update packages.",
      });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const pkg = await Package.findOne({ where: { id, organizationId } });
    if (!pkg)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    const body = req.body;

    if (body.packageName != null) pkg.packageName = String(body.packageName).trim();
    if (body.packageCode !== undefined) pkg.packageCode = body.packageCode != null ? String(body.packageCode).trim() || null : null;
    if (body.price !== undefined) {
      const p = parseFloat(body.price);
      pkg.price = Number.isNaN(p) ? 0 : p;
    }
    if (body.discountType !== undefined) {
      pkg.discountType = body.discountType === "fixed" || body.discountType === "percentage" ? body.discountType : null;
    }
    if (body.discount !== undefined) {
      const d = parseFloat(body.discount);
      pkg.discount = Number.isNaN(d) ? 0 : d;
    }
    if (body.status !== undefined) pkg.status = body.status === "inactive" ? "inactive" : "active";
    if (body.description !== undefined) pkg.description = body.description != null ? String(body.description).trim() || null : null;
    
    let targetServices = Array.isArray(body.services) ? body.services : null;
    if (targetServices) {
      targetServices = targetServices.filter(
        s => s && s.serviceId != null && !Number.isNaN(parseInt(s.serviceId, 10))
      );
      if (targetServices.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "At least one valid service is required in a package" });
      }
      pkg.services = targetServices.map(s => ({
        serviceId: parseInt(s.serviceId, 10),
        quantity: parseInt(s.quantity, 10) || 1,
      }));
    }

    // Update duration logic (re-calculates if left empty)
    if (body.duration !== undefined || targetServices) {
      let duration = body.duration != null && body.duration !== "" ? parseInt(body.duration, 10) : null;
      if (duration == null || Number.isNaN(duration) || duration <= 0) {
        duration = 0;
        const servicesList = targetServices || (Array.isArray(pkg.services) ? pkg.services : JSON.parse(pkg.services || "[]"));
        for (const item of servicesList) {
          const serviceId = item?.serviceId ?? item?.service_id;
          if (serviceId == null || Number.isNaN(parseInt(serviceId, 10))) continue;
          const serviceRow = await Service.findOne({
            where: { id: parseInt(serviceId, 10), organizationId }
          });
          if (serviceRow && serviceRow.duration) {
            duration += parseInt(serviceRow.duration, 10) * (parseInt(item.quantity, 10) || 1);
          }
        }
      }
      pkg.duration = duration;
    }

    await pkg.save();

    const data = await enrichPackage(pkg, organizationId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("packages update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * DELETE /api/packages/:id
 */
async function remove(req, res) {
  try {
    if (!canEditDelete(req)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin or Manager can delete packages.",
      });
    }
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const pkg = await Package.findOne({ where: { id, organizationId } });
    if (!pkg)
      return res
        .status(404)
        .json({ success: false, message: "Package not found" });

    await pkg.destroy();
    return res.status(200).json({ success: true, message: "Package deleted successfully" });
  } catch (err) {
    if (err.statusCode === 403)
      return res.status(403).json({ success: false, message: err.message });
    console.error("packages delete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getAll, getById, create, update, remove };