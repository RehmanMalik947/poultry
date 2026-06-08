const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const SuperAdmin = sequelize.define(
  "SuperAdmin",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "super_admins",
    timestamps: true,
    underscored: true,
  }
);

module.exports = { SuperAdmin };