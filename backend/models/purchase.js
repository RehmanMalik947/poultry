const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Purchase = sequelize.define(
  "Purchase",
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
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "suppliers", key: "id" },
      onDelete: "SET NULL",
    },
    referenceNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("received", "pending", "ordered"),
      allowNull: false,
      defaultValue: "received",
    },
    discountType: {
      type: DataTypes.ENUM("none", "fixed", "percentage"),
      allowNull: false,
      defaultValue: "none",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    shippingDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingCharges: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    document: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    paidAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paymentStatus: {
      type: DataTypes.ENUM("paid", "due", "partial"),
      allowNull: false,
      defaultValue: "due",
    },
  },
  {
    tableName: "purchases",
    timestamps: true,
    // underscored: true,
  }
);

module.exports = { Purchase };