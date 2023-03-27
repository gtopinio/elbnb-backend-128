const bcrypt = require("bcrypt");

const User = {
  create: (connection, firstName, lastName, email, password, contactNum, is_registered, is_admin, callback) => {
    const sql = 'INSERT INTO users (user_first_name, user_last_name, user_email, user_password, user_contact_num, is_business_account, is_admin) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10); // 10 is the number of rounds for salting
    connection.query(sql, [firstName, lastName, email, hash, contactNum, is_registered, is_admin], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results.insertId);
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