const { Op } = require("sequelize");
const { getBranchSkuPrefix } = require("./productSku");

const SERVICE_TYPE_TAG = "SVR";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** e.g. "Main Branch" → "MB-SVR" */
function getServiceCodePrefix(branchName) {
  const branchPart = getBranchSkuPrefix(branchName);
  return `${branchPart}-${SERVICE_TYPE_TAG}`;
}

/**
 * Next service code for a branch: MB-SVR-001, MB-SVR-002, …
 */
async function generateNextServiceCode(organizationId, branchId, { Service, Branch, transaction = null } = {}) {
  if (!Service || !Branch) {
    throw new Error("Service and Branch models are required");
  }

  let codePrefix = `GEN-${SERVICE_TYPE_TAG}`;
  if (branchId != null) {
    const branch = await Branch.findOne({
      where: { id: branchId, organizationId },
      transaction,
    });
    if (branch) {
      codePrefix = getServiceCodePrefix(branch.name);
    }
  }

  const where = {
    organizationId,
    serviceCode: { [Op.like]: `${codePrefix}-%` },
  };
  if (branchId != null) {
    where.branchId = branchId;
  } else {
    where.branchId = null;
  }

  const rows = await Service.findAll({
    where,
    attributes: ["serviceCode"],
    raw: true,
    transaction,
  });

  const re = new RegExp(`^${escapeRegex(codePrefix)}-(\\d+)$`, "i");
  let maxNum = 0;
  for (const row of rows) {
    const code = row.serviceCode != null ? String(row.serviceCode).trim() : "";
    const match = code.match(re);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  return `${codePrefix}-${String(maxNum + 1).padStart(3, "0")}`;
}

module.exports = {
  getServiceCodePrefix,
  generateNextServiceCode,
};
