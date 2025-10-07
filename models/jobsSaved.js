const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const JobsSaved = sequelize.define('JobsSaved', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  job_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // created_at: {
  //   type: DataTypes.DATE,
  //   defaultValue: DataTypes.NOW,
  // },
  // updated_at: {
  //   type: DataTypes.DATE,
  //   defaultValue: DataTypes.NOW,
  // },
}, {
  tableName: 'jobs_saved',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = JobsSaved;
