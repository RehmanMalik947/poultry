const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const StockTransfer = sequelize.define(
  "StockTransfer",
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
    },
    fromBranchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "branches", key: "id" },
    },
    toBranchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "branches", key: "id" },
    },
    referenceNo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM("Completed", "Pending", "Cancelled"),
      defaultValue: "Completed",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    tableName: "stock_transfers",
    timestamps: true,
    underscored: true,
  }
);

module.exports = { StockTransfer };
