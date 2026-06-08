const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const PurchaseReturnPayment = sequelize.define(
  'PurchaseReturnPayment',
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
    purchaseReturnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'purchase_returns', key: 'id' },
      onDelete: 'CASCADE',
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    paymentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      defaultValue: 'cash',
    },
    bankId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: 'purchase_return_payments',
    timestamps: true,
  }
);

module.exports = { PurchaseReturnPayment };
