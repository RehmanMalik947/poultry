// models/stockLog.js
const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const StockLog = sequelize.define(
    "StockLog",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        organizationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "organizations", key: "id" },
            onDelete: "CASCADE",
        },
        branchId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "branches", key: "id" },
            onDelete: "CASCADE",
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "products", key: "id" },
            onDelete: "CASCADE",
        },
        userId: {
            // Who performed the action
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },
        movementType: {
            // The reason for the stock change
            type: DataTypes.ENUM(
                'OPENING_STOCK',
                'PURCHASE',
                'SALE',
                'SALE_RETURN',
                'PURCHASE_RETURN',
                'ADJUSTMENT_ADD',
                'ADJUSTMENT_SUB',
                'TRANSFER_IN',
                'TRANSFER_OUT',
                'Added',
                'Deducted'
            ),
            allowNull: false,
        },
        qtyChange: {
            // The exact amount added (positive) or removed (negative)
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        previousQty: {
            // The stock level BEFORE this movement (useful for auditing)
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        newQty: {
            // The stock level AFTER this movement (useful for auditing)
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        unitCost: {
            // Price of the item at the time of movement
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0,
        },
        referenceId: {
            // Can store saleId, purchaseId, or transferId depending on the movementType
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        notes: {
            // Any specific manual notes (e.g., "Damaged goods", "Expired")
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "stock_logs",
        timestamps: true,
        underscored: true,
    }
);

module.exports = { StockLog };
