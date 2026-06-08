const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const PurchaseReturnItem = sequelize.define(
  'PurchaseReturnItem',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    purchaseReturnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'purchase_returns', key: 'id' },
      onDelete: 'CASCADE',
    },
    purchaseItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'purchase_items', key: 'id' },
      onDelete: 'CASCADE',
    },
    quantityReturned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    tableName: 'purchase_return_items',
    timestamps: true,
  }
);

module.exports = { PurchaseReturnItem };
