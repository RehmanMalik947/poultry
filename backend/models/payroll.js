const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Payroll = sequelize.define(
  "Payroll",
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
      allowNull: false,
      references: { model: "branches", key: "id" },
      onDelete: "CASCADE",
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "staff", key: "id" },
      onDelete: "CASCADE",
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "1-12",
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "e.g. 2025",
    },
    baseSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    bonus: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deduction: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    netSalary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "paid"),
      allowNull: false,
      defaultValue: "pending",
    },
    generatedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "staff", key: "id" },
      onDelete: "SET NULL",
      comment: "Staff who generated this payroll",
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When marked as paid",
    },
  },
  {
    tableName: "payrolls",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["staff_id"] },
      { fields: ["month", "year"] },
      { fields: ["status"] },
    ],
  }
);

module.exports = { Payroll };
