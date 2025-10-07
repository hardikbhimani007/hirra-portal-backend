const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(4000),
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING(4000),
    allowNull: true,
  },
  file: {
    type: DataTypes.STRING(4000),
    allowNull: true,
  },
  file_name: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  file_size: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  is_delivered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_admin_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Message;
