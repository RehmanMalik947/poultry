const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Organization = sequelize.define(
  "Organization",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    emergencyContact: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    totalEmployees: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    industryCategory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "UTC",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "pending",
      comment: "pending | active | suspended | deleted",
    },
    subscriptionPlan: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Plan name assigned by Super Admin when approving (e.g. Basic, Pro, Enterprise)",
    },
    isSelfServiceEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "organizations",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["email"] }],
  }
);

module.exports = { Organization };
