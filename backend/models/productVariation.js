const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const ProductVariation = sequelize.define(
  "ProductVariation",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "products", key: "id" },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    purchasePriceExc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    purchasePriceInc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    sellingPriceExc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    sellingPriceInc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    currentStock: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    variationImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    hasDiscount: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    discountType: {
      type: DataTypes.STRING(20), // 'percentage' or 'fixed'
      allowNull: true,
      defaultValue: "fixed",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "product_variations",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["product_id"] },
    ],
  }
);

module.exports = { ProductVariation };
