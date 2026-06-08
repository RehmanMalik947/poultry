const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Attendance = sequelize.define(
  "Attendance",
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
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "staff", key: "id" },
      onDelete: "CASCADE",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "Attendance date YYYY-MM-DD",
    },
    status: {
      type: DataTypes.ENUM("present", "absent", "leave", "late"),
      
      allowNull: false,
      defaultValue: "present",
    },
  },
  {
    tableName: "attendances",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["staff_id"] },
      { fields: ["date"] },
      { fields: ["branch_id", "date"] },
      { fields: ["staff_id", "date"] },
    ],
  }
);

module.exports = { Attendance };
