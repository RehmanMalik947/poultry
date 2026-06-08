const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const PayrollBonusDeduction = sequelize.define(
  "PayrollBonusDeduction",
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
    payrollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "payrolls", key: "id" },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("bonus", "deduction"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "Optional date for the line (YYYY-MM-DD)",
    },
  },
  {
    tableName: "payroll_bonus_deductions",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["payroll_id"] },
      { fields: ["type"] },
    ],
  }
);

module.exports = { PayrollBonusDeduction };
