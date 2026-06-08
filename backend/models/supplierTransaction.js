const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const SupplierTransaction = sequelize.define(
  "SupplierTransaction",
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
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "suppliers", key: "id" },
      onDelete: "CASCADE",
    },
    purchaseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "purchases", key: "id" },
      onDelete: "SET NULL",
    },
    // 'opening_balance' | 'purchase' | 'purchase_payment' | 'advance_payment'
    type: {
      type: DataTypes.ENUM(
        "opening_balance",
        "purchase",
        "purchase_payment",
        "advance_payment"
      ),
      allowNull: false,
    },
    // debit = amount we OWE the supplier (increases balance due)
    debit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    // credit = amount we PAID the supplier (decreases balance due)
    credit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    // Running balance snapshot at the time of this transaction
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true, // null for purchase entries
      comment: "cash, bank, cheque",
    },
    bankId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "banks", key: "id" },
      onDelete: "SET NULL",
    },
    referenceNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "supplier_transactions",
    timestamps: true,
  }
);

module.exports = { SupplierTransaction };
