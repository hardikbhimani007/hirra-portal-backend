// models/Job.js
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
  company_email: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  company_phone: {
    type: DataTypes.STRING(15),
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
  is_green_project: {
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
}, {
  tableName: 'jobs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// 🔥 Auto-add missing columns when model is loaded
(async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableDesc = await queryInterface.describeTable('jobs');

    if (!tableDesc.company_email) {
      await queryInterface.addColumn('jobs', 'company_email', {
        type: DataTypes.STRING(50),
        allowNull: true,
      });
      console.log('Added company_email column!');
    }

    if (!tableDesc.company_phone) {
      await queryInterface.addColumn('jobs', 'company_phone', {
        type: DataTypes.STRING(15),
        allowNull: true,
      });
      console.log('Added company_phone column!');
    }

    // Optional: sync the rest of the table
    await sequelize.sync({ alter: true });
    console.log('Job table synced!');
  } catch (err) {
    console.error('Error updating Job table:', err);
  }
})();

module.exports = Job;
