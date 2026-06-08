const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const StaffService = sequelize.define("StaffService", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  staffId: {
    type: DataTypes.INTEGER,
    references: { model: "staff", key: "id" },
    onDelete: "CASCADE",
  },
  serviceId: {
    type: DataTypes.INTEGER,
    references: { model: "services", key: "id" },
    onDelete: "CASCADE",
  },
  // Per-job commission (overrides global staff commission for this specific service)
  commissionType: {
    type: DataTypes.ENUM("percentage", "fixed"),
    allowNull: true,
    defaultValue: null,
    comment: "Commission type for this specific service. null = use staff global commission",
  },
  commissionValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null,
    comment: "Commission value for this specific service. null = use staff global commission",
  },
}, {
  tableName: "staff_services",
  timestamps: false,
});

module.exports = { StaffService };
