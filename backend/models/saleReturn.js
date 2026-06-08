const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const SaleReturn = sequelize.define(
  "SaleReturn",
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
      allowNull: true,
      references: { model: "branches", key: "id" },
      onDelete: "SET NULL",
    },
    saleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sales", key: "id" },
      onDelete: "CASCADE",
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "customers", key: "id" },
      onDelete: "SET NULL",
    },
    returnDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountReturned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("paid", "partial", "due"),
      allowNull: false,
      defaultValue: "due",
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: "Human-readable return invoice number e.g. LHR-RT-0001",
    },
  },
  {
    tableName: "sale_returns",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["sale_id"] },
      { fields: ["customer_id"] },
    ],
  }
);

module.exports = { SaleReturn };