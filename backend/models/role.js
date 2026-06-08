const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Role = sequelize.define(
  "Role",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "organizations", key: "id" },
      onDelete: "CASCADE",
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "JSON array of permission ids",
      get() {
        const raw = this.getDataValue("permissions");
        if (!raw) return [];
        try {
          return JSON.parse(raw);
        } catch {
          return [];
        }
      },
      set(val) {
        const out = Array.isArray(val) ? val : val ? [val] : [];
        this.setDataValue("permissions", JSON.stringify(out));
      },
    },
  },
  {
    tableName: "roles",
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ["organization_id", "name"] },
    ],
  }
);

module.exports = { Role };
