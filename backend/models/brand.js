const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Brand = sequelize.define(
  "Brand",
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  },
  {
    tableName: "brands",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["name"] },
    ],
  }
);

module.exports = { Brand };
