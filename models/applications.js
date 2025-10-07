const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Job = require('./jobs');
const User = require('./user');

const Application = sequelize.define('Application', {
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
  application_status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
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
  tableName: 'applications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

Application.belongsTo(Job, { foreignKey: 'job_id' });
Application.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Application;
