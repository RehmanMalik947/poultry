const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Branch = sequelize.define(
  "Branch",
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
    code: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Short branch code used for invoice numbering, e.g. LHR, KHI",
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "organizations", key: "id" },
      onDelete: "CASCADE",
    },
  },
  {
    tableName: "branches",
    timestamps: true,
    underscored: true,
    indexes: [{ fields: ["organization_id"] }],
  }
);

module.exports = { Branch };
