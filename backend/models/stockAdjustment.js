const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const StockAdjustment = sequelize.define(
  "StockAdjustment",
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
    referenceNo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    adjustmentType: {
      type: DataTypes.ENUM("Normal", "Abnormal"),
      allowNull: false,
      defaultValue: "Normal",
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
  },
  {
    tableName: "stock_adjustments",
    timestamps: true,
    underscored: true,
  }
);

module.exports = { StockAdjustment };
