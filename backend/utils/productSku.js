const { Op } = require("sequelize");

/**
 * First letter of each word in the branch name (e.g. "Main Branch" → "MB").
 */
function getBranchSkuPrefix(branchName) {
  if (!branchName || typeof branchName !== "string") return "PRD";
  const words = branchName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "PRD";
  const prefix = words
    .map((word) => {
      const letter = word.match(/[A-Za-z]/);
      return letter ? letter[0].toUpperCase() : "";
    })
    .join("");
  return prefix.length > 0 ? prefix.slice(0, 10) : "PRD";
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Next SKU for a branch: MB001, MB002, …
 */
async function generateNextProductSku(organizationId, branchId, { Product, Branch, transaction = null } = {}) {
  if (!Product || !Branch) {
    throw new Error("Product and Branch models are required");
  }

  let prefix = "PRD";
  if (branchId != null) {
    const branch = await Branch.findOne({
      where: { id: branchId, organizationId },
      transaction,
    });
    if (branch) {
      prefix = getBranchSkuPrefix(branch.name);
    }
  }

  const where = {
    organizationId,
    sku: { [Op.like]: `${prefix}%` },
  };
  if (branchId != null) {
    where.branchId = branchId;
  } else {
    where.branchId = null;
  }

  const rows = await Product.findAll({
    where,
    attributes: ["sku"],
    raw: true,
    transaction,
  });

  const re = new RegExp(`^${escapeRegex(prefix)}(\\d+)$`, "i");
  let maxNum = 0;
  for (const row of rows) {
    const sku = row.sku != null ? String(row.sku).trim() : "";
    const match = sku.match(re);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

module.exports = {
  getBranchSkuPrefix,
  generateNextProductSku,
};
