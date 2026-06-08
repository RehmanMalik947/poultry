const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const StaffLog = sequelize.define(
  "StaffLog",
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
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "staff", key: "id" },
      onDelete: "CASCADE",
    },
    saleId: {
      type: DataTypes.INTEGER,
      allowNull: true, 
      references: { model: "sales", key: "id" },
      onDelete: "CASCADE",
    },
    actionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Commission', 
    },
    itemName: {
      type: DataTypes.STRING(255),
      allowNull: true, 
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    commissionRate: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    amountEarned: { 
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "staff_logs",
    timestamps: true,
    underscored: true,
  }
);

module.exports = { StaffLog };
