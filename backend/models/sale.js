const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Sale = sequelize.define(
  "Sale",
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null for Walk-ins
      references: { model: "Customers", key: "id" },
      onDelete: "SET NULL",
    },
    staffId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "staff", key: "id" },
      onDelete: "SET NULL",
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountType: {
      type: DataTypes.ENUM("fixed", "percentage"),
      allowNull: false,
      defaultValue: "fixed",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
    },
    amountPaid: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    payTermNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    payTermType: {
      type: DataTypes.ENUM("days", "months"),
      allowNull: false,
      defaultValue: "days",
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("paid", "unpaid", "partial", "draft", "credit"),
      allowNull: true,
      defaultValue: "paid",
    },
    paymentMethod: {
      type: DataTypes.ENUM("Cash", "Card", "Cheque", "Multiple", "other", "credit"),
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM("paid", "overdue", "due"),
      allowNull: false,
      defaultValue: "paid",
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalItems: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    referenceNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
      comment: "Human-readable invoice number e.g. LHR-0001",
    },
    shippingDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingCharges: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    additionalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingStatus: {
      type: DataTypes.ENUM("pending", "ordered", "shipped", "delivered", "cancelled"),
      allowNull: true,
      defaultValue: "pending",
    },
    deliveredTo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    deliveryPerson: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    weight: {
  type: DataTypes.DECIMAL(12, 3),
  allowNull: false,
  defaultValue: 0,
},

rate: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
},

driverName: {
  type: DataTypes.STRING(150),
  allowNull: true,
},

lorryNo: {
  type: DataTypes.STRING(100),
  allowNull: true,
},
  },
  {
    tableName: "sales",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["customer_id"] },
      { fields: ["staff_id"] },
      { fields: ["status"] },
      { fields: ["created_at"] },
    ],
  }
);
module.exports = { Sale };