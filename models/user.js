const bcrypt = require("bcrypt");
const { connect } = require("undici");

// TODO: Needs input validation for empty strings
// TODO: Is this client-side or server-side?
const User = {
  create: (connection, firstName, lastName, email, password, contactNum, is_registered, is_admin, callback) => {
    console.log("User Model: " + firstName + " " + lastName + " " + email + " " + password + " " + contactNum + " " + is_registered + " " + is_admin + " ");
    const sql = 'INSERT INTO user (user_first_name, user_last_name, user_email, user_password, user_contact_num, is_business_account, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10); // 10 is the number of rounds for salting
    connection.query(sql, [firstName, lastName, email, hash, contactNum, is_registered, is_admin], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results.insertId);
    });
  },

  // TODO: Subject to change, adding custom functions for testing
  // TODO: Will replace if better way of querying is found
  // Check if User email exists
  checkIfEmailExists: (connection, email, callback) => {
    const sql = 'SELECT * FROM user WHERE user_email = ? LIMIT 1';
    connection.query(sql, [email], (error, result) => {
      if (error) {
        return callback(error);
      }
      if (Array.isArray(result) && !result.length) {
        return callback(null, { exists: false });
      }
      return callback(null, { exists: true, result: result });
    });
  },

  // TODO: Subject to change, adding custom functions for testing
  // TODO: Will replace if better way of querying is found
  // Check if User ID exists
  findBy: (connection, field, value, callback) => {
    const sql = 'SELECT * FROM user WHERE ? = ? LIMIT 1';
    connection.query(sql, [field, value], (error, result) => {
      if (error) {
        return callback(error);
      }
      if (Array.isArray(result) && !result.length) {
        return callback(null, { exists: false });
      }
      return callback(null, { exists: true, result: result });
    });
  },

  comparePassword: (password, hash, callback) => {
    bcrypt.compare(password, hash, (err, isMatch) => {
      if (err) {
        return callback(err);
      }
      return callback(null, isMatch);
    });
  }
}

module.exports = User;