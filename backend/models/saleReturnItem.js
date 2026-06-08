const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const SaleReturnItem = sequelize.define(
  "SaleReturnItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    saleReturnId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sale_returns", key: "id" },
      onDelete: "CASCADE",
    },
    saleItemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sale_items", key: "id" },
      onDelete: "CASCADE",
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    itemType: {
      type: DataTypes.ENUM("product", "service", "package"),
      allowNull: false,
      defaultValue: "product",
    },
    itemName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    quantityReturned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "sale_return_items",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["sale_return_id"] },
      { fields: ["sale_item_id"] },
    ],
  }
);

module.exports = { SaleReturnItem };
