const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const CashRegisterTransaction = sequelize.define(
  "CashRegisterTransaction",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    registerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("cash_in", "cash_out"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "CashRegisterTransactions",
    timestamps: true,
  }
);

module.exports = { CashRegisterTransaction };
