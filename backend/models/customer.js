const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Customer = sequelize.define(
  "Customer",
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

    // Basic Info
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    businessName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    mobile: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Business Fields
    taxNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    creditLimit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },

    payTerm: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Financial Fields
    openingBalance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    totalSaleDue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    totalSellReturnDue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    // Classification
    customerGroup: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // New proper active field
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Old field kept for compatibility only
    // Do not use this as Active anymore
    platinum: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Custom Fields
    customField1: { type: DataTypes.STRING, allowNull: true },
    customField2: { type: DataTypes.STRING, allowNull: true },
    customField3: { type: DataTypes.STRING, allowNull: true },
    customField4: { type: DataTypes.STRING, allowNull: true },
    customField5: { type: DataTypes.STRING, allowNull: true },
    customField6: { type: DataTypes.STRING, allowNull: true },
    customField7: { type: DataTypes.STRING, allowNull: true },
    customField8: { type: DataTypes.STRING, allowNull: true },
    customField9: { type: DataTypes.STRING, allowNull: true },

    // Optional old model fields
    visits: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    totalSpent: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    lastVisit: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    tableName: "customers",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["name"] },
      { fields: ["mobile"] },
      { fields: ["active"] },
    ],
  }
);

module.exports = { Customer };