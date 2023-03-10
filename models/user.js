
const DATABASE_URL = "mysql://root:1P0DwS7uiI2Y3BiOO83e@containers-us-west-159.railway.app:6686/railway";
const Sequelize = require('sequelize');
const sequelize = new Sequelize(DATABASE_URL);

// Define a User model
const User = sequelize.define('User', {
    username: {
      type: Sequelize.STRING,
      allowNull: false
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false
    }
  });


module.exports = User;