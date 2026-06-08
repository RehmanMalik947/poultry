const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Category = sequelize.define(
  "Category",
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
      comment: "e.g. Haircut, Colouring, Treatment, Styling, Grooming",
    },
    categoryCode:{
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "categories", key: "id" },
      onDelete: "SET NULL",
    },
    categoryType: {
  type: DataTypes.ENUM("product", "service", "both"),
  allowNull: false,
  defaultValue: "product",
}
  },
  {
    tableName: "categories",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["name"] },
    ],
  }
);

module.exports = { Category };
