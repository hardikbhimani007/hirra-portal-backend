const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(8000),
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  lat: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  long: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  hourly_rate: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  is_greeen_project: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  tableName: 'jobs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Job;
