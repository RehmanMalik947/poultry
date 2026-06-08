const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Service = sequelize.define(
  "Service",
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
    serviceName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    serviceCode: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Legacy: POS category string; prefer categoryId",
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "categories", key: "id" },
      onDelete: "SET NULL",
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: "Selling price for POS",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duration in minutes",
    },
    discountType: {
      type: DataTypes.ENUM("fixed", "percentage"),
      allowNull: true,
    },
    discount: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "services",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["category_id"] },
      { fields: ["date"] },
    ],
  },
);

module.exports = { Service };