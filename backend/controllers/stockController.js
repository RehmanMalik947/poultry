const { Stock, Product, StockLog, Branch, User, StockAdjustment, StockTransfer, sequelize, ProductVariation } = require("../models");
const { Op } = require("sequelize");

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

    return branchId;
}

function safeParseFloat(value, defaultValue = 0) {
    if (value === null || value === undefined || value === "") return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

//
// ✅ GET ALL STOCKS
//
async function getAllStocks(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const { search, page: pageParam, limit: limitParam } = req.query;

        const where = { organizationId };
        if (branchId) where.branchId = branchId;

        const productWhere = {};
        if (search && String(search).trim() !== "") {
            const term = `%${String(search).trim()}%`;
            productWhere[Op.or] = [
                { name: { [Op.like]: term } },
                { sku: { [Op.like]: term } },
            ];
        }

        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10));
        const offset = (page - 1) * limit;

        const { count, rows: stocks } = await Stock.findAndCountAll({
            where,
            include: [
                {
                    model: Product,
                    as: "product",
                    where: Object.getOwnPropertySymbols(productWhere).length > 0 ? productWhere : undefined,
                    attributes: ["id", "name", "sku", "primaryBarcode", "productImage", "alertQuantity", "unitId",      // ✅ unit ki jagah unitId
                        "categoryId", "purchasePriceExc", "sellingPriceInc"],
                },
                {
                    model: Branch,
                    as: "branch",
                    attributes: ["id", "name"]
                },
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "name", "email"],
                }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        return res.status(200).json({
            success: true,
            data: stocks,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        });
    } catch (err) {
        if (err.statusCode === 403)
            return res.status(403).json({ success: false, message: err.message });

        console.error("stock getAll error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

//
// ✅ GET SINGLE STOCK
//
async function getStockById(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const id = parseInt(req.params.id, 10);

        if (Number.isNaN(id)) {
            return res.status(400).json({ success: false, message: "Invalid ID" });
        }

        const stock = await Stock.findOne({
            where: { id, organizationId },
            include: [
                {
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "sku", "primaryBarcode"],
                },
            ],
        });

        if (!stock) {
            return res.status(404).json({
                success: false,
                message: "Stock not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: stock,
        });
    } catch (err) {
        if (err.statusCode === 403)
            return res.status(403).json({ success: false, message: err.message });

        console.error("stock getById error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

//
// ✅ Manage STOCK (MAIN FUNCTION)
//
async function manageStock(req, res) {
    const t = await sequelize.transaction();
    try {
        const organizationId = getOrganizationId(req);
        const branchIdFromHeader = await getBranchIdFromHeader(req, organizationId);

        const {
            productId,
            branchId,
            qty,
            type, // "add" | "subtract" | "set"
            newQuantity, // absolute value
            reason,
            alertQuantity,
            variations, // array of { variationId: number, qty: number, type?: string }
        } = req.body;

        const finalBranchId = branchId || branchIdFromHeader;

        if (!productId || !finalBranchId) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "productId and branchId (in body or header) are required",
            });
        }

        let stock = await Stock.findOne({
            where: {
                organizationId,
                productId,
                branchId: finalBranchId,
            },
            transaction: t,
        });

        // If stock not exists, create it
        if (!stock) {
            stock = await Stock.create({
                organizationId,
                productId,
                branchId: finalBranchId,
                qty: 0,
                alertQty: safeParseFloat(alertQuantity, 0),
                userId: req.user?.id || req.staff?.id || null,
            }, { transaction: t });
        }

        const oldQty = parseFloat(stock.qty);
        let updatedQty = oldQty;

        if (variations && Array.isArray(variations) && variations.length > 0) {
            // Handle variations stock
            let totalVariationStockAdded = 0;
            let totalVariationStockDeducted = 0;

            for (const vData of variations) {
                const varId = vData.variationId;
                const vQty = safeParseFloat(vData.qty);
                const vType = vData.type || type || "set";

                const variation = await ProductVariation.findByPk(varId, { transaction: t });
                if (variation) {
                    const oldVarQty = parseFloat(variation.currentStock) || 0;
                    let newVarQty = oldVarQty;

                    if (vType === "set") {
                        newVarQty = vQty;
                    } else if (vType === "add") {
                        newVarQty = oldVarQty + vQty;
                    } else if (vType === "subtract") {
                        newVarQty = oldVarQty - vQty;
                    }

                    if (newVarQty < 0) newVarQty = 0;

                    await variation.update({ currentStock: newVarQty }, { transaction: t });

                    // We calculate the net change to add to the main product stock
                    const diff = newVarQty - oldVarQty;
                    if (diff > 0) totalVariationStockAdded += diff;
                    else totalVariationStockDeducted += Math.abs(diff);
                }
            }
            
            updatedQty = oldQty + totalVariationStockAdded - totalVariationStockDeducted;
            if (updatedQty < 0) updatedQty = 0;

        } else {
            // Normal product stock update
            if (newQuantity !== undefined) {
                updatedQty = safeParseFloat(newQuantity);
            } else if (type === "set") {
                updatedQty = safeParseFloat(qty);
            } else if (type === "add") {
                updatedQty = oldQty + safeParseFloat(qty);
            } else if (type === "subtract") {
                updatedQty = oldQty - safeParseFloat(qty);
            } else if (qty !== undefined) {
                updatedQty = safeParseFloat(qty);
            }

            if (updatedQty < 0) updatedQty = 0;
        }

        const movementType = updatedQty > oldQty ? 'Added' : 'Deducted';

        stock.qty = updatedQty;
        if (alertQuantity !== undefined) {
            stock.alertQty = safeParseFloat(alertQuantity);
        }
        stock.userId = req.user?.id || req.staff?.id || null; // Update the user who made the last change
        await stock.save({ transaction: t });

        // Update main Product model currentStock
        const productToUpdate = await Product.findByPk(productId, { transaction: t });
        if (productToUpdate) {
            await productToUpdate.update({ currentStock: updatedQty }, { transaction: t });
        }

        // Record the stock log
        if (updatedQty !== oldQty) {
            await StockLog.create({
                organizationId,
                branchId: finalBranchId,
                productId,
                userId: req.user?.id || req.staff?.id || null,
                movementType,
                qtyChange: Math.abs(updatedQty - oldQty) * (updatedQty > oldQty ? 1 : -1),
                previousQty: oldQty,
                newQty: updatedQty,
                notes: reason || "Manual Stock Updated",
            }, { transaction: t });
        }

        await t.commit();

        return res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            data: stock,
        });
    } catch (err) {
        await t.rollback();
        if (err.statusCode === 403)
            return res.status(403).json({ success: false, message: err.message });

        console.error("stock manage error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

//
// ✅ LOW STOCK LIST
//
async function getLowStock(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const { page: pageParam, limit: limitParam } = req.query;

        const where = { organizationId };
        if (branchId) where.branchId = branchId;

        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10));
        const offset = (page - 1) * limit;

        // Use Op.lte to find low stock directly in DB if possible, 
        // but Stock table has alertQty, and Product might have alertQuantity.
        // For now, let's fetch all and filter, or optimize if alertQty is in Stock table.

        const stocks = await Stock.findAll({
            where,
            include: [
                {
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "sku", "alertQuantity"],
                },
            ],
        });

        const filtered = stocks.filter((s) => {
            const q = parseFloat(s.qty);
            const alert = parseFloat(s.alertQty || s.product?.alertQuantity || 0);
            return q <= alert;
        });

        // Handle pagination on the filtered list for now (simple)
        const count = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);

        return res.status(200).json({
            success: true,
            data: paginated,
            total: count,
            page,
            limit,
        });
    } catch (err) {
        console.error("low stock error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
}

//
// ✅ VARIANCE REPORT
//
async function getVariance(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const branchId = await getBranchIdFromHeader(req, organizationId);
        const { page: pageParam, limit: limitParam } = req.query;

        const where = { organizationId };
        if (branchId) where.branchId = branchId;

        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10));
        const offset = (page - 1) * limit;

        const { count, rows: stocks } = await Stock.findAndCountAll({
            where,
            include: [
                {
                    model: Product,
                    as: "product",
                    attributes: ["id", "name", "sku", "unitId", "categoryId"],
                },
            ],
            limit,
            offset,
        });

        // Simple variance mapping for frontend compatibility
        const data = stocks.map((s) => ({
            id: s.id,
            name: s.product?.name || "Unknown",
            category: s.product?.category || "N/A",
            unit: s.product?.unit || "pcs",
            currentQuantity: parseFloat(s.qty),
            totalWastage: 0, // Placeholder
            variance: 0, // Placeholder
            status: "good",
        }));

        return res.status(200).json({
            success: true,
            data,
            total: count,
            page,
            limit,
        });
    } catch (err) {
        console.error("variance report error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

//
// ✅ TRANSFER STOCK (Branch to Branch)
//
async function transferStock(req, res) {
    const t = await sequelize.transaction();
    try {
        const organizationId = getOrganizationId(req);
        const { productId, fromBranchId, toBranchId, qty, reason } = req.body;

        if (!productId || !fromBranchId || !toBranchId || !qty) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "productId, fromBranchId, toBranchId, and qty are required",
            });
        }

        if (fromBranchId === toBranchId) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Source and destination branch cannot be the same",
            });
        }

        const transferQty = safeParseFloat(qty);
        if (transferQty <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Transfer qty must be greater than 0" });
        }

        // Get or verify source stock
        let sourceStock = await Stock.findOne({
            where: { organizationId, productId, branchId: fromBranchId },
            transaction: t,
        });

        if (!sourceStock) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "No stock found in source branch for this product",
            });
        }

        const sourceQty = parseFloat(sourceStock.qty);
        if (sourceQty < transferQty) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${sourceQty}, Requested: ${transferQty}`,
            });
        }

        // Deduct from source
        sourceStock.qty = sourceQty - transferQty;
        await sourceStock.save({ transaction: t });

        // Log TRANSFER_OUT
        await StockLog.create({
            organizationId,
            branchId: fromBranchId,
            productId,
            userId: req.user?.id || req.staff?.id || null,
            movementType: 'TRANSFER_OUT',
            qtyChange: -transferQty,
            previousQty: sourceQty,
            newQty: sourceQty - transferQty,
            notes: reason || `Transferred out to branch ${toBranchId}`,
        }, { transaction: t });

        // Get or create destination stock
        let destStock = await Stock.findOne({
            where: { organizationId, productId, branchId: toBranchId },
            transaction: t,
        });

        const destOldQty = destStock ? parseFloat(destStock.qty) : 0;

        if (!destStock) {
            destStock = await Stock.create({
                organizationId,
                productId,
                branchId: toBranchId,
                qty: 0,
                alertQty: sourceStock.alertQty || 0,
            }, { transaction: t });
        }

        destStock.qty = destOldQty + transferQty;
        await destStock.save({ transaction: t });

        // Log TRANSFER_IN
        await StockLog.create({
            organizationId,
            branchId: toBranchId,
            productId,
            userId: req.user?.id || req.staff?.id || null,
            movementType: 'TRANSFER_IN',
            qtyChange: transferQty,
            previousQty: destOldQty,
            newQty: destOldQty + transferQty,
            notes: reason || `Transferred in from branch ${fromBranchId}`,
        }, { transaction: t });

        await t.commit();

        return res.status(200).json({
            success: true,
            message: `Transferred ${transferQty} units successfully`,
            data: { sourceStock, destStock },
        });
    } catch (err) {
        await t.rollback();
        if (err.statusCode === 403)
            return res.status(403).json({ success: false, message: err.message });
        console.error("stock transfer error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

async function getStockLogs(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const { productId, branchId: branchIdParam, page: pageParam, limit: limitParam } = req.query;

        const where = { organizationId };
        if (productId) where.productId = parseInt(productId, 10);
        if (branchIdParam) where.branchId = parseInt(branchIdParam, 10);

        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20));
        const offset = (page - 1) * limit;

        const { count, rows } = await StockLog.findAndCountAll({
            where,
            order: [["createdAt", "DESC"]],
            limit,
            offset,
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: ["id", "name", "email"]
                }
            ]
        });

        return res.status(200).json({
            success: true,
            data: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        });
    } catch (err) {
        if (err.statusCode === 403)
            return res.status(403).json({ success: false, message: err.message });
        console.error("stock logs error:", err);  // ← check your terminal for the exact error
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// --- NEW FUNCTIONS FOR FORMAL ADJUSTMENTS ---

async function getAllAdjustments(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const { branchId, search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { organizationId };
        if (branchId) where.branchId = branchId;
        if (search) {
            where.referenceNo = { [Op.like]: `%${search}%` };
        }

        const { count, rows: adjustments } = await StockAdjustment.findAndCountAll({
            distinct: true,
            where,
            include: [
                { model: User, as: "user", attributes: ["name"] },
                { model: StockLog, as: "logs", include: [{ model: Product, as: "product", attributes: ["name"] }] }
            ],
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset,
        });

        return res.status(200).json({ success: true, data: adjustments, total: count });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function createAdjustment(req, res) {
    const t = await sequelize.transaction();
    try {
        const organizationId = getOrganizationId(req);
        const { branchId, adjustmentType, reason, items } = req.body;

        if (!branchId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Branch and items are required" });
        }

        // Generate Ref No (Helper function niche add karenge ya yahan hi logic likh dein)
        const count = await StockAdjustment.count({ where: { organizationId } });
        const referenceNo = `ADJ-${String(count + 1).padStart(4, "0")}`;

        let totalAmount = 0;

        const adjustment = await StockAdjustment.create({
            organizationId,
            branchId,
            referenceNo,
            adjustmentType,
            reason,
            totalAmount: 0,
            userId: req.user?.id || req.staff?.id || null,
        }, { transaction: t });

        for (const item of items) {
            const product = await Product.findByPk(item.productId, { transaction: t });
            if (!product) continue;

            const qty = parseFloat(item.quantity);
            const action = item.action;
            const unitCost = parseFloat(product.purchasePrice || 0);
            const subtotal = qty * unitCost;
            totalAmount += subtotal;

            let stock = await Stock.findOne({
                where: { organizationId, branchId, productId: item.productId },
                transaction: t,
            });

            if (!stock) {
                stock = await Stock.create({ organizationId, branchId, productId: item.productId, qty: 0 }, { transaction: t });
            }

            const oldQty = parseFloat(stock.qty);
            const qtyChange = action === "add" ? qty : -qty;
            const newQty = oldQty + qtyChange;

            await stock.update({ qty: newQty }, { transaction: t });
            await product.update({ currentStock: (parseFloat(product.currentStock) || 0) + qtyChange }, { transaction: t });

            await StockLog.create({
                organizationId,
                branchId,
                productId: item.productId,
                userId: req.user?.id || req.staff?.id || null,
                movementType: action === "add" ? "Added" : "Deducted",
                qtyChange,
                previousQty: oldQty,
                newQty,
                unitCost,
                notes: `Adjustment: ${reason || "Manual"} (Ref: ${referenceNo})`,
                referenceId: adjustment.id,
            }, { transaction: t });
        }

        await adjustment.update({ totalAmount }, { transaction: t });
        await t.commit();
        return res.status(201).json({ success: true, data: adjustment });
    } catch (err) {
        await t.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
}

// --- NEW FUNCTIONS FOR STOCK TRANSFER MODULE ---

async function getAllTransfers(req, res) {
    try {
        const organizationId = getOrganizationId(req);
        const { fromBranchId, toBranchId, search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { organizationId };
        if (fromBranchId) where.fromBranchId = fromBranchId;
        if (toBranchId) where.toBranchId = toBranchId;
        if (search) where.referenceNo = { [Op.like]: `%${search}%` };

        // 1) Fetch paginated transfers
        const { count, rows: transfers } = await StockTransfer.findAndCountAll({
            where,
            include: [
                { model: User, as: "user", attributes: ["id", "name"] },
                { model: Branch, as: "fromBranch", attributes: ["id", "name"] },
                { model: Branch, as: "toBranch", attributes: ["id", "name"] },
            ],
            order: [["createdAt", "DESC"]],
            limit: parseInt(limit),
            offset,
        });

        const transferIds = transfers.map((t) => t.id);

        if (transferIds.length === 0) {
            return res.status(200).json({ success: true, data: [], total: 0 });
        }

        // 2) Fetch logs for paginated transfers only
        const logs = await StockLog.findAll({
            where: {
                organizationId,
                referenceId: { [Op.in]: transferIds },
                movementType: { [Op.in]: ["TRANSFER_OUT", "TRANSFER_IN"] },
            },
            include: [
                { model: Product, as: "product", attributes: ["id", "name"] },
            ],
            order: [["createdAt", "ASC"]],
        });

        // 3) Attach logs to each transfer
        const logsByTransferId = {};
        for (const log of logs) {
            if (!logsByTransferId[log.referenceId]) {
                logsByTransferId[log.referenceId] = [];
            }
            logsByTransferId[log.referenceId].push(log);
        }

        const finalData = transfers.map((t) => {
            const json = t.toJSON();
            json.logs = logsByTransferId[t.id] || [];
            return json;
        });

        return res.status(200).json({ success: true, data: finalData, total: count });
    } catch (err) {
        console.error("getAllTransfers error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
}

async function createBulkTransfer(req, res) {
    const t = await sequelize.transaction();
    try {
        const organizationId = getOrganizationId(req);
        const { fromBranchId, toBranchId, notes, items } = req.body;

        if (!fromBranchId || !toBranchId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Source branch, destination branch, and items are required" });
        }

        if (String(fromBranchId) === String(toBranchId)) {
            return res.status(400).json({ success: false, message: "Source and Destination branch cannot be the same" });
        }

        const count = await StockTransfer.count({ where: { organizationId } });
        const referenceNo = `TRF-${String(count + 1).padStart(4, "0")}`;

        const transfer = await StockTransfer.create({
            organizationId,
            fromBranchId,
            toBranchId,
            referenceNo,
            notes,
            userId: req.user?.id || req.staff?.id || null,
        }, { transaction: t });

        for (const item of items) {
            const productId = item.productId;
            const qty = parseFloat(item.quantity);

            // 1. Deduct from Source
            let sourceStock = await Stock.findOne({
                where: { organizationId, productId, branchId: fromBranchId },
                transaction: t,
            });

            if (!sourceStock || parseFloat(sourceStock.qty) < qty) {
                throw new Error(`Insufficient stock for product ID ${productId} in source branch`);
            }

            const sourceOldQty = parseFloat(sourceStock.qty);
            const sourceNewQty = sourceOldQty - qty;
            await sourceStock.update({ qty: sourceNewQty }, { transaction: t });

            // Log for Source Branch (Deducted)
            await StockLog.create({
                organizationId,
                branchId: fromBranchId,
                productId,
                userId: req.user?.id || req.staff?.id || null,
                movementType: 'Deducted',
                qtyChange: -qty,
                previousQty: sourceOldQty,
                newQty: sourceNewQty,
                notes: `Transfer Out (Ref: ${referenceNo})`,
                referenceId: transfer.id,
            }, { transaction: t });

            // 2. Add to Destination
            let destStock = await Stock.findOne({
                where: { organizationId, productId, branchId: toBranchId },
                transaction: t,
            });

            if (!destStock) {
                destStock = await Stock.create({
                    organizationId,
                    productId,
                    branchId: toBranchId,
                    qty: 0,
                }, { transaction: t });
            }

            const destOldQty = parseFloat(destStock.qty);
            const destNewQty = destOldQty + qty;
            await destStock.update({ qty: destNewQty }, { transaction: t });

            // Log for Destination Branch (Added)
            await StockLog.create({
                organizationId,
                branchId: toBranchId,
                productId,
                userId: req.user?.id || req.staff?.id || null,
                movementType: 'Added',
                qtyChange: qty,
                previousQty: destOldQty,
                newQty: destNewQty,
                notes: `Transfer In (Ref: ${referenceNo})`,
                referenceId: transfer.id,
            }, { transaction: t });
        }

        await t.commit();
        return res.status(201).json({ success: true, data: transfer });
    } catch (err) {
        await t.rollback();
        return res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getAllStocks,
    getStockById,
    manageStock,
    getLowStock,
    getVariance,
    transferStock,
    getStockLogs,
    getAllAdjustments,
    createAdjustment,
    getAllTransfers,
    createBulkTransfer,
};