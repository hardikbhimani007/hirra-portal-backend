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
    type: DataTypes.STRING(2000),
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
  year_of_experience: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  hours_of_availability: {
    type: DataTypes.STRING(100),
    allowNull: true,
    // comment: 'Example: "Full-time", "Part-time", "20 hours/week"',
  },
  daily_rate: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    // comment: 'Daily wages or rate',
  },
  company_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  address_house_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    // comment: 'House or flat number',
  },
  apartment: {
    type: DataTypes.STRING(100),
    allowNull: true,
    // comment: 'Street name',
  },
  // address_area: {
  //   type: DataTypes.STRING(255),
  //   allowNull: true,
  //   // comment: 'Area or locality name',
  // },
  // address_landmark: {
  //   type: DataTypes.STRING(255),
  //   allowNull: true,
  //   // comment: 'Nearby known place, for easier identification',
  // },
  address_city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  business_number: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  address_postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  address_country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    // defaultValue: 'United Kingdom',
  },
  work_location: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  work_address_postal_code: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  work_address_city: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  work_address_house_number: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  work_apartment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  work_address_country: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  use_same_address: {
    type: DataTypes.TINYINT(1),
    defaultValue: false,
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
