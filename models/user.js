const bcrypt = require("bcrypt");

const User = {
  create: (connection, firstName, lastName, email, password, callback) => {
    const sql = 'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10); // 10 is the number of rounds for salting
    connection.query(sql, [firstName, lastName, email, hash], (error, results) => {
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