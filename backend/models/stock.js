const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Stock = sequelize.define(
    "Stock",
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

        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onDelete: "SET NULL",
        },

        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: "products", key: "id" },
            onDelete: "CASCADE",
        },

        qty: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },

        alertQty: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0,
        },
    },
    {
        tableName: "stocks",
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ["organization_id", "branch_id", "product_id"] },
        ],
    }
);

module.exports = { Stock };