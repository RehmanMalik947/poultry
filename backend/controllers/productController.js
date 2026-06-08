const { Product, Brand, Category, Unit, Branch, ProductVariation, Stock, sequelize } = require("../models");
const { Op } = require("sequelize");
const { generateNextProductSku, getBranchSkuPrefix } = require("../utils/productSku");
const { logActivity } = require("../utils/activityLogger");

function getOrganizationId(req) {
  const id = req.user?.organizationId ?? req.staff?.organizationId;
  if (!id) {
    const err = new Error("Organization context required");
    err.statusCode = 403;
    throw err;
  }
  return id;
}

async function getBranchIdFromHeader(req, organizationId) {
  const raw = req.headers["x-branch-id"];
  if (raw == null || raw === "") return null;
  const branchId = parseInt(raw, 10);
  if (Number.isNaN(branchId)) return null;
  const branch = await Branch.findOne({ where: { id: branchId, organizationId } });
  return branch ? branch.id : null;
}

// Helper function to safely parse integer
function safeParseInt(value, defaultValue = null) {
  if (value === null || value === undefined || value === "") return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to safely parse float
function safeParseFloat(value, defaultValue = null) {
  if (value === null || value === undefined || value === "") return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Convert model instance to plain JSON
function toJson(p) {
  return {
    id: p.id,
    organizationId: p.organizationId,
    branchId: p.branchId,
    name: p.name,
    sku: p.sku,
    barcodeType: p.barcodeType,
    primaryBarcode: p.primaryBarcode,
    secondaryBarcode: p.secondaryBarcode,
    unitId: p.unitId,
    unit: p.unit ? p.unit.name : null,
    brandId: p.brandId,
    brand: p.brand ? p.brand.name : null,
    categoryId: p.categoryId,
    category: p.category ? p.category.name : null,
    subCategoryId: p.subCategoryId,
    subCategory: p.subCategory ? p.subCategory.name : null,
    branchId: p.branchId,
    branch: p.branch ? p.branch.name : null,
    manageStock: p.manageStock,
    alertQuantity: p.alertQuantity ? parseFloat(p.alertQuantity) : null,
    productDescription: p.productDescription,
    enableImei: p.enableImei,
    notForSelling: p.notForSelling,
    weight: p.weight,
    serviceTimer: p.serviceTimer,
    applicableTax: p.applicableTax,
    sellingPriceTaxType: p.sellingPriceTaxType,
    productType: p.productType,
    purchasePriceExc: p.purchasePriceExc ? parseFloat(p.purchasePriceExc) : null,
    purchasePriceInc: p.purchasePriceInc ? parseFloat(p.purchasePriceInc) : null,
    margin: p.margin ? parseFloat(p.margin) : null,
    sellingPriceExc: p.sellingPriceExc ? parseFloat(p.sellingPriceExc) : null,
    sellingPriceInc: p.sellingPriceInc ? parseFloat(p.sellingPriceInc) : null,
    productImage: p.productImage,
    productBrochure: p.productBrochure,
    barcodeUrl: p.primaryBarcode ? `/api/products/barcode/${p.primaryBarcode}` : (p.sku ? `/api/products/barcode/${p.sku}` : null),
    variations: (p.ProductVariations || []).map(v => ({
      ...v.toJSON ? v.toJSON() : v,
      barcodeUrl: v.sku ? `/api/products/barcode/${v.sku}` : null
    })),
    hasDiscount: p.hasDiscount,
    discountType: p.discountType,
    discountAmount: p.discountAmount ? parseFloat(p.discountAmount) : 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function getAllProducts(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { search, page: pageParam, limit: limitParam } = req.query;

    const where = { organizationId };
    const andConditions = [];

    if (branchId != null) {
      andConditions.push({
        [Op.or]: [{ branchId }, { branchId: null }],
      });
    }

    if (search != null && String(search).trim() !== "") {
      const term = `%${String(search).trim()}%`;
      andConditions.push({
        [Op.or]: [
          { name: { [Op.like]: term } },
          { sku: { [Op.like]: term } },
          { primaryBarcode: { [Op.like]: term } },
          { secondaryBarcode: { [Op.like]: term } },
          { "$ProductVariations.sku$": { [Op.like]: term } },
          { "$ProductVariations.name$": { [Op.like]: term } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }

    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10));
    const offset = (page - 1) * limit;

    const { count, rows: list } = await Product.findAndCountAll({
      distinct: true,
      subQuery: false,   // ← required so $ProductVariations.sku$ works in WHERE with pagination
      where,
      include: [
        { model: Brand, as: "brand", attributes: ["name"] },
        { model: Category, as: "category", attributes: ["name"] },
        { model: Category, as: "subCategory", attributes: ["name"] },
        { model: Unit, as: "unit", attributes: ["name"] },
        { model: Branch, as: "branch", attributes: ["name"] },
        { model: ProductVariation, as: "ProductVariations", required: false },
        {
          model: Stock,
          as: "Stocks",
          where: branchId ? { branchId } : undefined,
          required: false,
          attributes: ["qty", "alertQty"]
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const mappedData = list.map(p => {
      const data = toJson(p);

      // ✅ Stock table se lao, chahe branchId ho ya na ho
      if (p.Stocks && p.Stocks.length > 0) {
        data.currentStock = parseFloat(p.Stocks[0].qty);
      } else {
        data.currentStock = 0; // ✅ Stock record nahi tou 0
      }

      return data;
    });

    return res.status(200).json({
      success: true,
      data: mappedData,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("products getAll error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function getProductById(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const p = await Product.findOne({
      where: { id, organizationId },
      include: [
        { model: Brand, as: "brand", attributes: ["name"] },
        { model: Category, as: "category", attributes: ["name"] },
        { model: Category, as: "subCategory", attributes: ["name"] },
        { model: Unit, as: "unit", attributes: ["name"] },
        { model: Branch, as: "branch", attributes: ["name"] },
        { model: ProductVariation, as: "ProductVariations" },
      ],
    });
    if (!p) return res.status(404).json({ success: false, message: "Product not found" });

    return res.status(200).json({ success: true, data: toJson(p) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("products getById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function createProduct(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const body = req.body;

    // Validate required fields
    const name = body.name != null ? String(body.name).trim() : "";
    if (!name) {
      return res.status(400).json({ success: false, message: "Product Name is required" });
    }

    // Handle Unit ID (required)
    let unitId = null;
    if (body.unitId) {
      unitId = safeParseInt(body.unitId);
    } else if (body.unit) {
      unitId = safeParseInt(body.unit);
    }

    // if (!unitId) {
    //   return res.status(400).json({ success: false, message: "Unit is required" });
    // }

    // Handle optional IDs with safe parsing
    let brandId = null;
    if (body.brandId) {
      brandId = safeParseInt(body.brandId);
    } else if (body.brand && body.brand !== "none") {
      brandId = safeParseInt(body.brand);
    }

    let categoryId = null;
    if (body.categoryId) {
      categoryId = safeParseInt(body.categoryId);
    } else if (body.category && body.category !== "none") {
      categoryId = safeParseInt(body.category);
    }

    let subCategoryId = null;
    if (body.subCategoryId) {
      subCategoryId = safeParseInt(body.subCategoryId);
    } else if (body.subCategory && body.subCategory !== "none") {
      subCategoryId = safeParseInt(body.subCategory);
    }

    console.log("DEBUG: branchId from header:", branchId);
    console.log("DEBUG: body.branchId:", body.branchId);
    console.log("DEBUG: body.branch:", body.branch);

    let finalBranchId = branchId;
    if (body.branchId) {
      finalBranchId = safeParseInt(body.branchId);
    } else if (body.branch_id) {
      finalBranchId = safeParseInt(body.branch_id);
    } else if (body.branch && body.branch !== "none") {
      finalBranchId = safeParseInt(body.branch);
    }

    // Log for debugging
    console.log("Creating product with:", {
      name,
      unitId,
      brandId,
      categoryId,
      subCategoryId,
      branchId: finalBranchId,
      sku: body.sku,
      primaryBarcode: body.primaryBarcode,
      secondaryBarcode: body.secondaryBarcode,
      productType: body.productType
    });

    console.log("BARCODE DEBUG:", {
      primaryBarcode: body.primaryBarcode,
      typeof: typeof body.primaryBarcode,
      allKeys: Object.keys(body)
    });

    const skuInput = body.sku != null ? String(body.sku).trim() : "";
    const productSku =
      skuInput ||
      (await generateNextProductSku(organizationId, finalBranchId, { Product, Branch }));

    const product = await Product.create({
      organizationId,
      branchId: finalBranchId,

      name,
      sku: productSku,
      barcodeType: body.barcodeType || "c128",
      primaryBarcode: (body.primaryBarcode && body.primaryBarcode.trim() !== "") ? body.primaryBarcode : null,
      secondaryBarcode: (body.secondaryBarcode && body.secondaryBarcode.trim() !== "") ? body.secondaryBarcode : null,

      unitId,
      brandId,
      categoryId,
      subCategoryId,

      manageStock: body.manageStock === true || body.manageStock === "true",

      alertQuantity: body.alertQuantity ? safeParseFloat(body.alertQuantity) : null,

      productDescription: body.productDescription || null,

      enableImei: body.enableImei === true || body.enableImei === "true",
      notForSelling: body.notForSelling === true || body.notForSelling === "true",

      weight: body.weight || null,

      serviceTimer: body.serviceTimer ? safeParseInt(body.serviceTimer) : null,

      applicableTax: body.applicableTax || "none",
      sellingPriceTaxType: body.sellingPriceTaxType || "exclusive",
      productType: body.productType || "single",

      purchasePriceExc: body.purchasePriceExc ? safeParseFloat(body.purchasePriceExc) : null,
      purchasePriceInc: body.purchasePriceInc ? safeParseFloat(body.purchasePriceInc) : null,
      margin: body.margin ? safeParseFloat(body.margin) : null,
      sellingPriceExc: body.sellingPriceExc ? safeParseFloat(body.sellingPriceExc) : null,
      sellingPriceInc: body.sellingPriceInc ? safeParseFloat(body.sellingPriceInc) : null,
      currentStock: body.currentStock ? safeParseFloat(body.currentStock) : 0,

      productImage: (req.files && req.files.find(f => f.fieldname === "productImage"))
        ? `/api/uploads/products/${req.files.find(f => f.fieldname === "productImage").filename}`
        : body.productImage || null,

      productBrochure: body.productBrochure || null,

      hasDiscount: body.hasDiscount === true || body.hasDiscount === "true",
      discountType: body.discountType || "fixed",
      discountAmount: body.discountAmount ? safeParseFloat(body.discountAmount) : 0,
    });

    // Sync Stock table
    if (finalBranchId) {
      await syncStockTable(product.id, finalBranchId, product.currentStock, organizationId);
    }

    // Handle variations in the new table
    if (body.productType === "variable" && body.variations) {
      try {
        const variationOptions = typeof body.variations === 'string' ? JSON.parse(body.variations) : body.variations;

        if (Array.isArray(variationOptions)) {
          const variationsToCreate = [];

          variationOptions.forEach((v, vIdx) => {
            if (v.subItems && Array.isArray(v.subItems)) {
              v.subItems.forEach((s, sIdx) => {
                let varImg = s.variationImage || null;
                const fieldName = `variationImage_${vIdx}_${sIdx}`;
                const file = req.files ? req.files.find(f => f.fieldname === fieldName) : null;
                if (file) {
                  varImg = `/api/uploads/products/${file.filename}`;
                }

                variationsToCreate.push({
                  productId: product.id,
                  name: s.name || s.value || `${v.name || 'Variation'} Option`,
                  sku: s.sku || `${product.sku}-${vIdx}-${sIdx}`,
                  purchasePriceExc: safeParseFloat(s.purchasePriceExc || s.purchaseExc),
                  purchasePriceInc: safeParseFloat(s.purchasePriceInc || s.purchaseInc),
                  sellingPriceExc: safeParseFloat(s.sellingPriceExc || s.sellingExc),
                  sellingPriceInc: safeParseFloat(s.sellingPriceInc || s.sellingInc),
                  currentStock: safeParseFloat(s.currentStock || s.stock) || 0,
                  variationImage: varImg,
                  hasDiscount: s.hasDiscount === true || s.hasDiscount === "true",
                  discountType: s.discountType || "fixed",
                  discountAmount: safeParseFloat(s.discountAmount) || 0,
                });
              });
            }
          });

          if (variationsToCreate.length > 0) {
            await ProductVariation.bulkCreate(variationsToCreate);
          }
        }
      } catch (e) {
        console.error("Error creating variations:", e);
      }
    }

    // Explicitly reload product with variations for the response
    const finalProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        { model: Brand, as: "brand", attributes: ["name"] },
        { model: Category, as: "category", attributes: ["name"] },
        { model: Unit, as: "unit", attributes: ["name"] },
        { model: ProductVariation, as: "ProductVariations" },
      ]
    });

    logActivity({
      organizationId,
      branchId: finalBranchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Products',
      action: 'Created',
      description: `Product '${finalProduct.name}' (SKU: ${finalProduct.sku}) created`
    });

    return res.status(201).json({
      success: true,
      data: toJson(finalProduct),
    });
  } catch (err) {
    if (err.statusCode === 403) {
      return res.status(403).json({ success: false, message: err.message });
    }

    console.error("products create error:", err);

    // Handle foreign key constraint errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: `Invalid reference: ${err.fields?.join(', ') || 'Foreign key'} does not exist`
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}

// Helper to update stock table
async function syncStockTable(productId, branchId, qty, organizationId, transaction = null) {
  if (!branchId || qty === null || qty === undefined) return;

  let stock = await Stock.findOne({
    where: { productId, branchId, organizationId },
    transaction
  });

  if (stock) {
    stock.qty = parseFloat(qty);
    await stock.save({ transaction });
  } else {
    await Stock.create({
      productId,
      branchId,
      organizationId,
      qty: parseFloat(qty),
      alertQty: 0
    }, { transaction });
  }
}

async function updateProduct(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const product = await Product.findOne({ where: { id, organizationId } });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const body = req.body;

    // Update basic fields
    if (body.name != null) product.name = String(body.name).trim();
    if (body.sku !== undefined) product.sku = body.sku || null;
    if (body.barcodeType !== undefined) product.barcodeType = body.barcodeType || "c128";
    if (body.primaryBarcode !== undefined) product.primaryBarcode = body.primaryBarcode || null;
    if (body.secondaryBarcode !== undefined) product.secondaryBarcode = body.secondaryBarcode || null;

    console.log("Updating product with barcodes:", {
      id,
      primaryBarcode: product.primaryBarcode,
      secondaryBarcode: product.secondaryBarcode
    });

    // Handle FK fields with safe parsing
    if (body.unitId !== undefined || body.unit !== undefined) {
      const unitVal = body.unitId || body.unit;
      product.unitId = unitVal ? safeParseInt(unitVal) : null;
    }

    if (body.brandId !== undefined || body.brand !== undefined) {
      const brandVal = body.brandId || body.brand;
      product.brandId = (brandVal && brandVal !== "none") ? safeParseInt(brandVal) : null;
    }

    if (body.categoryId !== undefined || body.category !== undefined) {
      const catVal = body.categoryId || body.category;
      product.categoryId = (catVal && catVal !== "none") ? safeParseInt(catVal) : null;
    }

    if (body.subCategoryId !== undefined || body.subCategory !== undefined) {
      const subCatVal = body.subCategoryId || body.subCategory;
      product.subCategoryId = (subCatVal && subCatVal !== "none") ? safeParseInt(subCatVal) : null;
    }

    if (body.branchId !== undefined || body.branch !== undefined) {
      const branchVal = body.branchId || body.branch;
      product.branchId = (branchVal && branchVal !== "none") ? safeParseInt(branchVal) : branchId;
    }

    // Update other fields
    if (body.manageStock !== undefined) product.manageStock = body.manageStock === true || body.manageStock === "true";
    if (body.alertQuantity !== undefined) product.alertQuantity = body.alertQuantity ? safeParseFloat(body.alertQuantity) : null;
    if (body.productDescription !== undefined) product.productDescription = body.productDescription || null;
    if (body.enableImei !== undefined) product.enableImei = body.enableImei === true || body.enableImei === "true";
    if (body.notForSelling !== undefined) product.notForSelling = body.notForSelling === true || body.notForSelling === "true";
    if (body.weight !== undefined) product.weight = body.weight || null;
    if (body.serviceTimer !== undefined) product.serviceTimer = body.serviceTimer ? safeParseInt(body.serviceTimer) : null;
    if (body.applicableTax !== undefined) product.applicableTax = body.applicableTax || "none";
    if (body.sellingPriceTaxType !== undefined) product.sellingPriceTaxType = body.sellingPriceTaxType || "exclusive";
    if (body.productType !== undefined) product.productType = body.productType || "single";
    if (body.purchasePriceExc !== undefined) product.purchasePriceExc = body.purchasePriceExc ? safeParseFloat(body.purchasePriceExc) : null;
    if (body.purchasePriceInc !== undefined) product.purchasePriceInc = body.purchasePriceInc ? safeParseFloat(body.purchasePriceInc) : null;
    if (body.margin !== undefined) product.margin = body.margin ? safeParseFloat(body.margin) : null;
    if (body.sellingPriceExc !== undefined) product.sellingPriceExc = body.sellingPriceExc ? safeParseFloat(body.sellingPriceExc) : null;
    if (body.sellingPriceInc !== undefined) product.sellingPriceInc = body.sellingPriceInc ? safeParseFloat(body.sellingPriceInc) : null;

    // Handle file upload
    if (req.files) {
      const mainImg = req.files.find(f => f.fieldname === "productImage");
      if (mainImg) {
        product.productImage = `/api/uploads/products/${mainImg.filename}`;
      }
    } else if (body.productImage !== undefined) {
      product.productImage = body.productImage || null;
    }

    if (body.productBrochure !== undefined) product.productBrochure = body.productBrochure || null;

    if (body.variations !== undefined) {
      const variationOptions = typeof body.variations === 'string' ? JSON.parse(body.variations) : body.variations;

      // Delete old variations
      await ProductVariation.destroy({ where: { productId: product.id } });

      if (product.productType === "variable" && Array.isArray(variationOptions)) {
        const variationsToCreate = [];

        variationOptions.forEach((v, vIdx) => {
          if (v.subItems && Array.isArray(v.subItems)) {
            v.subItems.forEach((s, sIdx) => {
              let varImg = s.variationImage || null;
              const fieldName = `variationImage_${vIdx}_${sIdx}`;
              const file = req.files ? req.files.find(f => f.fieldname === fieldName) : null;
              if (file) {
                varImg = `/api/uploads/products/${file.filename}`;
              }

              variationsToCreate.push({
                productId: product.id,
                name: s.name || s.value || `${v.name || 'Variation'} Option`,
                sku: s.sku || `${product.sku}-${vIdx}-${sIdx}`,
                purchasePriceExc: safeParseFloat(s.purchasePriceExc || s.purchaseExc),
                purchasePriceInc: safeParseFloat(s.purchasePriceInc || s.purchaseInc),
                sellingPriceExc: safeParseFloat(s.sellingPriceExc || s.sellingExc),
                sellingPriceInc: safeParseFloat(s.sellingPriceInc || s.sellingInc),
                variationImage: varImg,
                hasDiscount: s.hasDiscount === true || s.hasDiscount === "true",
                discountType: s.discountType || "fixed",
                discountAmount: safeParseFloat(s.discountAmount) || 0,
              });
            });
          }
        });

        if (variationsToCreate.length > 0) {
          await ProductVariation.bulkCreate(variationsToCreate);
        }
      }
    }

    if (body.hasDiscount !== undefined) product.hasDiscount = body.hasDiscount === true || body.hasDiscount === "true";
    if (body.discountType !== undefined) product.discountType = body.discountType || "fixed";
    if (body.discountAmount !== undefined) product.discountAmount = body.discountAmount ? safeParseFloat(body.discountAmount) : 0;

    await product.save();

    // Sync Stock table should NOT be called on update to prevent overwriting existing stock.
    // Stock is managed through stock adjustments, purchases, or opening stock.

    // Reload with associations
    const finalProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        { model: Brand, as: "brand", attributes: ["name"] },
        { model: Category, as: "category", attributes: ["name"] },
        { model: Unit, as: "unit", attributes: ["name"] },
        { model: ProductVariation, as: "ProductVariations" },
      ]
    });

    logActivity({
      organizationId,
      branchId: finalProduct.branchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Products',
      action: 'Updated',
      description: `Product '${finalProduct.name}' (SKU: ${finalProduct.sku}) updated`
    });

    return res.status(200).json({ success: true, data: toJson(finalProduct) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("products update error:", err);

    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: `Invalid reference: ${err.fields?.join(', ') || 'Foreign key'} does not exist`
      });
    }

    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function deleteProduct(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    const product = await Product.findOne({ where: { id, organizationId } });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const productName = product.name;
    const productSku = product.sku;

    await product.destroy();

    logActivity({
      organizationId,
      branchId: product.branchId || null,
      userId: req.staff?.id || req.user?.id || null,
      module: 'Products',
      action: 'Deleted',
      description: `Product '${productName}' (SKU: ${productSku}) deleted`
    });

    return res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("products delete error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * GET /api/products/next-sku?branchId=1
 * Preview next SKU for a branch (e.g. MB001).
 */
async function getNextSku(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    let branchId = await getBranchIdFromHeader(req, organizationId);
    if (req.query.branchId != null && String(req.query.branchId).trim() !== "") {
      const parsed = parseInt(req.query.branchId, 10);
      if (!Number.isNaN(parsed)) branchId = parsed;
    }

    const sku = await generateNextProductSku(organizationId, branchId, { Product, Branch });
    const prefix = branchId
      ? getBranchSkuPrefix(
          (await Branch.findOne({ where: { id: branchId, organizationId }, attributes: ["name"] }))?.name
        )
      : "PRD";

    return res.status(200).json({ success: true, data: { sku, prefix } });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("products getNextSku error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function searchProducts(req, res) {
  try {
    const organizationId = getOrganizationId(req);
    const branchId = await getBranchIdFromHeader(req, organizationId);
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(200).json({ success: true, data: [] });
    }

    const term = `%${q.trim()}%`;
    const where = {
      organizationId,
      [Op.or]: [
        { name: { [Op.like]: term } },
        { sku: { [Op.like]: term } },
        { primaryBarcode: { [Op.like]: term } },
        { secondaryBarcode: { [Op.like]: term } },
        { "$ProductVariations.sku$": { [Op.like]: term } },
        { "$ProductVariations.name$": { [Op.like]: term } },
      ],
    };

    if (branchId != null) {
      where.branchId = { [Op.or]: [branchId, null] };
    }

    const products = await Product.findAll({
      subQuery: false,   // ← required so $ProductVariations.sku$ works in WHERE with limit
      where,
      include: [
        { model: Brand, as: "brand", attributes: ["name"] },
        { model: Category, as: "category", attributes: ["name"] },
        { model: Category, as: "subCategory", attributes: ["name"] },
        { model: Unit, as: "unit", attributes: ["name"] },
        { model: Branch, as: "branch", attributes: ["name"] },
        { model: ProductVariation, as: "ProductVariations", required: false },
      ],
      limit: 50,
      order: [["name", "ASC"]],
    });

    return res.status(200).json({ success: true, data: products.map(toJson) });
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ success: false, message: err.message });
    console.error("products search error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  getNextSku,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};