const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Product = sequelize.define(
  "Product",
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

    // ✅ RELATIONAL FIELDS
    brandId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "brands", key: "id" },
      onDelete: "SET NULL",
    },

    unitId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "units", key: "id" },
    },

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "categories", key: "id" },
    },

    subCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "categories", key: "id" },
    },

    // ✅ BASIC INFO
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    barcodeType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "c128",
    },
    primaryBarcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    secondaryBarcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ⚠️ unit string removed (now FK)

    manageStock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    alertQuantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    productDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    enableImei: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    notForSelling: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    weight: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    serviceTimer: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    applicableTax: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "none",
    },

    sellingPriceTaxType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "exclusive",
    },

    productType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "single",
    },

    purchasePriceExc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    discountType: {
      type: DataTypes.ARRAY,
      allowNull: true,
    },
    discountAmount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    purchasePriceInc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    margin: {
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


    productImage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    productBrochure: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    hasDiscount: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    discountType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "fixed",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },

  },
  {
    tableName: "products",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["brand_id"] },
      { fields: ["unit_id"] },
      { fields: ["category_id"] },
      { fields: ["sub_category_id"] },
    ],
  }
);

module.exports = { Product };