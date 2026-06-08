const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const ServiceItem = sequelize.define(
  "ServiceItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    serviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "services", key: "id" },
      onDelete: "CASCADE",
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "products", key: "id" },
      onDelete: "CASCADE",
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "service_items",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["service_id"] },
      { fields: ["product_id"] },
    ],
  }
);

module.exports = { ServiceItem };
