const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Unit = sequelize.define(
  "Unit",
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
    },
    shortName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    allowDecimal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    }
  },
  {
    tableName: "units",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["name"] },
    ],
  }
);

module.exports = { Unit };
