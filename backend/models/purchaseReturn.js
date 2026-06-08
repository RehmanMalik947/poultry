const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

// PurchaseReturn model
const PurchaseReturn = sequelize.define(
  'PurchaseReturn',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' },
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    purchaseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'purchases', key: 'id' },
      onDelete: 'CASCADE',
    },
    returnDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amountReturned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('paid', 'partial', 'due'),
      allowNull: true,
      defaultValue: 'due',
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    tableName: 'purchase_returns',
    timestamps: true,
  }
);

module.exports = { PurchaseReturn };
