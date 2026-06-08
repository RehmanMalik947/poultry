const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const ExpenseCategory = sequelize.define(
  "ExpenseCategory",
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

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    categoryCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "expense_categories", key: "id" },
      onDelete: "SET NULL",
    },
  },
  {
    tableName: "expense_categories",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["parent_id"] },
    ],
  }
);

module.exports = { ExpenseCategory };