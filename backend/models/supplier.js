const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Supplier = sequelize.define(
  "Supplier",
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

    // Main visible fields for poultry/farm supplier
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    taxNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "tax_number",
    },

    businessName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "business_name",
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    openingBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: "opening_balance",
    },

    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Old / detailed fields kept for compatibility.
    // These are not visible in the simplified frontend for now.
    contactId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "contact_id",
    },

    isIndividual: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_individual",
    },

    prefix: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    firstName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "first_name",
    },

    lastName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "last_name",
    },

    alternateNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "alternate_number",
    },

    landline: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    addressLine1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "address_line_1",
    },

    addressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "address_line_2",
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    zipCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "zip_code",
    },

    payTerm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "pay_term",
    },

    payTermType: {
      type: DataTypes.ENUM("days", "months"),
      allowNull: true,
      field: "pay_term_type",
    },

    advanceBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: "advance_balance",
    },

    customField1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_1",
    },

    customField2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_2",
    },

    customField3: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_3",
    },

    customField4: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_4",
    },

    customField5: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_5",
    },

    customField6: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_6",
    },

    customField7: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_7",
    },

    customField8: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_8",
    },

    customField9: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_9",
    },

    customField10: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "custom_field_10",
    },

    contactPersons: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "contact_persons",
    },
  },
  {
    tableName: "suppliers",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["name"] },
      { fields: ["phone"] },
      { fields: ["tax_number"] },
      { fields: ["business_name"] },
      { fields: ["active"] },
    ],
  }
);

module.exports = { Supplier };