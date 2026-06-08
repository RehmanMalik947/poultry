const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const StaffAttachment = sequelize.define(
  "StaffAttachment",
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
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "staff", key: "id" },
      onDelete: "CASCADE",
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Original filename as uploaded by the user",
    },
    storedFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Filename stored on disk (unique)",
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    sizeBytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    uploadedByStaffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "staff", key: "id" },
      onDelete: "SET NULL",
    },
  },
  {
    tableName: "staff_attachments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["staff_id"] },
      { fields: ["uploaded_by_staff_id"] },
    ],
  }
);

module.exports = { StaffAttachment };

