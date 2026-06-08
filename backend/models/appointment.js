const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Appointment = sequelize.define(
  "Appointment",
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
      onDelete: "CASCADE",
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Customers", key: "id" },
      onDelete: "CASCADE",
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "services", key: "id" },
      onDelete: "CASCADE",
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "staff", key: "id" },
      onDelete: "SET NULL",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: "Appointment date YYYY-MM-DD",
    },
    timeSlot: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "e.g. 09:00 AM",
    },
    status: {
      type: DataTypes.ENUM("pending", "booked", "arrived", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "booked",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bookingTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the appointment was booked (set on create)",
    },
    checkInTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the customer checked in (status → arrived)",
    },
    checkOutTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the customer checked out (status → completed)",
    },
    serviceDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Service duration in minutes (checkOutTime - checkInTime)",
    },
  },
  {
    tableName: "appointments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["date"] },
      { fields: ["status"] },
      { fields: ["branch_id", "date"] },
    ],
  }
);

module.exports = { Appointment };
