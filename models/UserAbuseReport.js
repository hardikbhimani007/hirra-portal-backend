const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserAbuseReport = sequelize.define('UserAbuseReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  report_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  report_reason: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'user_abuse_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = UserAbuseReport;
