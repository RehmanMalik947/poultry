const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sales", key: "id" },
      onDelete: "CASCADE",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "cash, card, bank_transfer, etc.",
    },
    bankId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "banks", key: "id" },
      onDelete: "SET NULL",
    },
    transactionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Card Details
    cardHolder: { type: DataTypes.STRING(100), allowNull: true },
    cardType: { type: DataTypes.STRING(50), allowNull: true },
    cardNumberLast4: { type: DataTypes.STRING(4), allowNull: true },
    cardMonth: { type: DataTypes.STRING(2), allowNull: true },
    cardYear: { type: DataTypes.STRING(4), allowNull: true },
    // Cheque Details
    chequeNo: { type: DataTypes.STRING(50), allowNull: true },
    chequeBank: { type: DataTypes.STRING(100), allowNull: true },
    chequeDate: { type: DataTypes.DATEONLY, allowNull: true },
    accountHolder: { type: DataTypes.STRING(100), allowNull: true },
    // Bank Transfer Details
    bankAccountNumber: { type: DataTypes.STRING(100), allowNull: true },
    transferDate: { type: DataTypes.DATEONLY, allowNull: true },
  },
  {
    tableName: "payments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["sale_id"] },
      { fields: ["bank_id"] },
    ],
  }
);

module.exports = { Payment };