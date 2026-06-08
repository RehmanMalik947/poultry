const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const SaleItem = sequelize.define(
  "SaleItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "sales", key: "id" },
      onDelete: "CASCADE",
    },
    itemId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Generic ID for Product or Service",
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    variationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "product_variations", key: "id" },
      onDelete: "SET NULL",
    },
    itemDiscountType: {
  type: DataTypes.ENUM("fixed", "percentage"),
  allowNull: true,
},
itemDiscountAmount: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
},
itemTaxPercent: {
  type: DataTypes.DECIMAL(5, 2),
  allowNull: false,
  defaultValue: 0,
},
lineTotal: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
},
  },
  {
    tableName: "sale_items",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["sale_id"] },
      { fields: ["item_id"] },
    ],
  }
);

module.exports = { SaleItem };
