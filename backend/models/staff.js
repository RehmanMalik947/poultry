const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Staff = sequelize.define(
  "Staff",
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
      allowNull: false,
      references: { model: "branches", key: "id" },
      onDelete: "CASCADE",
    },
    // Basic
    prefix: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Login & role (sign-in is via User model when userId is set)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    allowLogin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    accessLocations: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of branch ids or 'all'",
    },
    // Sales & Commission
    commissionType: {
      type: DataTypes.ENUM('percentage', 'fixed'),
      allowNull: false,
      defaultValue: 'percentage',
    },
    commissionValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },
    salesCommissionPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    maxSalesDiscountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    allowSelectedContacts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Working Schedule
    workingDays: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of days like ['Monday', 'Tuesday']",
    },
    startTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    endTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    breakStartTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    breakEndTime: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    // More info
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    maritalStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    bloodGroup: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    mobileNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    alternateContactNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    familyContactNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    facebookLink: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    twitterLink: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    socialMedia1: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    socialMedia2: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    customField: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    guardianName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    idProofName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Not collected in current add staff form; kept for backward compatibility",
    },
    idProofNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "CNIC number (displayed as CNIC No. in UI)",
    },
    permanentAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    currentAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Bank
    bankAccountHolderName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    bankAccountNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    bankName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    bankIdentifierCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Optional in Bank Details form",
    },
    bankBranch: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Optional in Bank Details form",
    },
    taxPayerId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Optional in Bank Details form",
    },
  },
  {
    tableName: "staff",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["role"] },
      { fields: ["is_active"] },
    ],
  }
);

module.exports = { Staff };
