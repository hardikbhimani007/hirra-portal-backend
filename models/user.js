const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_type: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  jwt_token: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  profile_pictures: {
    type: DataTypes.STRING(4000),
    allowNull: true,
  },
  description: {
    type: DataTypes.STRING(2000),
    allowNull: true,
  },
  cscs_file: {
    type: DataTypes.STRING(4000),
    allowNull: true,
  },
  cscs_file_name: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  is_cscsfile_verified: {
    type: DataTypes.TINYINT(1),
  },
  location: {
    type: DataTypes.STRING(4000),
    allowNull: true,
  },
  radius: {
    type: DataTypes.DECIMAL(18, 2),
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
  min_hour_rate: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
  },
  availability: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  otp: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  otp_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  profile_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  trade: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  skill: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    defaultValue: true,
  },
  is_online: {
    type: DataTypes.TINYINT(1),
    defaultValue: true,
  },
  last_seen_time: {
    type: DataTypes.DATE
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
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;
