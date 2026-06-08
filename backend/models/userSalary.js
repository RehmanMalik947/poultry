const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const UserSalary = sequelize.define(
  "UserSalary",
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
    salaryType: {
      type: DataTypes.ENUM("daily", "weekly", "monthly"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "Date from which this salary applies (YYYY-MM-DD)",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "active",
      comment: "active, inactive",
    },
  },
  {
    tableName: "user_salaries",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["staff_id"] },
      { fields: ["status"] },
    ],
  }
);

module.exports = { UserSalary };
