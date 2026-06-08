const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const BankTransaction = sequelize.define(
  "BankTransaction",
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
    bankId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "banks", key: "id" },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("credit", "debit"),
      allowNull: false,
      comment: "credit = income, debit = expense",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    transactionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "sale, purchase, expense, payroll, etc.",
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID of the related sale/expense/etc.",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "bank_transactions",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["bank_id"] },
      { fields: ["transaction_type"] },
      { fields: ["reference_id"] },
    ],
  }
);

module.exports = { BankTransaction };
