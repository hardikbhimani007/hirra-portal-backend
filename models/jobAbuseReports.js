const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const JobAbuseReport = sequelize.define('JobAbuseReport', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  report_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  report_reason: {
    type: DataTypes.STRING(4000),
    allowNull: false,
  },
}, {
  tableName: 'job_abuse_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = JobAbuseReport;
