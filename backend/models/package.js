const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Package = sequelize.define(
  "Package",
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
    packageName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    packageCode: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
    },
    discountType: {
      type: DataTypes.ENUM("fixed", "percentage"),
      allowNull: true,
    },
    discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    services: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "Array of constituent services: [{ serviceId: number, quantity: number }]",
    },
    duration: {
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
  comment: "Total package duration in minutes",
},
  },
  {
    tableName: "packages",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
    ],
  }
);

module.exports = { Package };
