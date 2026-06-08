const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Bank = sequelize.define(
  "Bank",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "organizations", key: "id" },
      onDelete: "CASCADE",
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "branches", key: "id" },
      onDelete: "CASCADE",
    },

    bankName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    accountHolder: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    accountType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Savings",
    },
    accountNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "Active", // "Active" or "Closed"
    },
  },
  {
    tableName: "banks",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] }
    ],

  }
);

module.exports = { Bank };