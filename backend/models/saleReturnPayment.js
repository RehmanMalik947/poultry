const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const SaleReturnPayment = sequelize.define(
  "SaleReturnPayment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    saleReturnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sale_returns", key: "id" },
      onDelete: "CASCADE",
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "cash, card, bank_transfer, cheque",
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
    cardHolder: { type: DataTypes.STRING(100), allowNull: true },
    cardType: { type: DataTypes.STRING(50), allowNull: true },
    cardNumberLast4: { type: DataTypes.STRING(4), allowNull: true },
    chequeNo: { type: DataTypes.STRING(50), allowNull: true },
    chequeBank: { type: DataTypes.STRING(100), allowNull: true },
    chequeDate: { type: DataTypes.DATEONLY, allowNull: true },
    accountHolder: { type: DataTypes.STRING(100), allowNull: true },
    bankAccountNumber: { type: DataTypes.STRING(100), allowNull: true },
    transferDate: { type: DataTypes.DATEONLY, allowNull: true },
  },
  {
    tableName: "sale_return_payments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["sale_return_id"] },
      { fields: ["bank_id"] },
    ],
  }
);

module.exports = { SaleReturnPayment };
