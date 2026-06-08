const { sequelize } = require("../config/db");
const { DataTypes } = require("sequelize");

const Expense = sequelize.define(
  "Expense",
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

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "expense_categories", key: "id" },
      onDelete: "RESTRICT",
    },

    subCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "expense_categories", key: "id" },
      onDelete: "SET NULL",
    },

    referenceNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    expenseFor: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    amount: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
},

// New tax fields
applicableTax: {
  type: DataTypes.STRING(50),
  allowNull: true,
  defaultValue: "none",
},
taxAmount: {
  type: DataTypes.DECIMAL(12, 2),
  allowNull: true,
  defaultValue: 0,
},

    
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    createdById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ID of the person who created this (Staff or Admin)",
    },

    usedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "staff", key: "id" },
      onDelete: "SET NULL",
    },

    // 💰 PAYMENT FIELDS (IMPORTANT)
    paymentMethod: {
      type: DataTypes.ENUM("cash", "cheque", "bank_transfer"),
      allowNull: false,
      defaultValue: "cash",
    },

    paymentAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "banks", key: "id" },
      onDelete: "SET NULL",
    },

    chequeNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    externalAccountNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    paymentNote: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    paidOn: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  
  {
    tableName: "expenses",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["organization_id"] },
      { fields: ["branch_id"] },
      { fields: ["category_id"] },
      { fields: ["date"] },
      { fields: ["branch_id", "date"] },
    ],
  }
);

module.exports = { Expense };
