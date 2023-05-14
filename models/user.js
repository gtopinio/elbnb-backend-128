const bcrypt = require("bcrypt");

const User = {
  create: (connection, email, password, username, firstName, lastName, contactNum, userType, callback) => {
    const sql = 'INSERT INTO user (USER_EMAIL, USER_PASSWORD, USER_USERNAME, USER_FNAME, USER_LNAME, USER_CONTACTNUM, USER_TYPE) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10);
    connection.query(sql, [email, hash, username, firstName, lastName, contactNum, userType], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results.insertId);
    });
  },
  checkIfEmailExists: (connection, email, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM user WHERE USER_EMAIL = ?';
    connection.query(sql, [email], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0].count > 0);
    });
  },
  findBy: (connection, field, value, callback) => {
    const sql = `SELECT * FROM user WHERE ${field} = ?`;
    connection.query(sql, [value], (error, results) => {
      if (error) {
        return callback(error, null);
      } else{
        try{
          if(typeof results[0].USER_ID === "undefined") {
            console.log("Getting User: Undefined Object...");
            callback(null, 0);
          }
          else {
            console.log("Getting User: Defined Object...");
            callback(null, results[0]);
          }
        } catch (err) {
          console.log("User Not Found...");
          callback(err, null);
        }
      }
    });
  },
  comparePassword: (password, hash, callback) => {
    bcrypt.compare(password, hash, (error, result) => {
      if (error) {
        return callback(error);
      }
      return callback(null, result);
    });
  },
  delete: (connection, userId, callback) => {
    const sql = 'DELETE FROM user WHERE USER_ID = ?';
    connection.query(sql, [userId], (error) => {
      if (error) {
        return callback(error);
      }

      return callback(null);
    });
  },
  edit: (connection, userId, newPassword, newUsername, newFirstName, newLastName, newContactNum, callback) => {
    const sql = 'UPDATE user SET USER_PASSWORD=?, USER_USERNAME=?, USER_FNAME=?, USER_LNAME=?, USER_CONTACTNUM=? WHERE USER_ID=?';
    const hash = bcrypt.hashSync(newPassword, 10);
    connection.query(sql, [hash, newUsername, newFirstName, newLastName, newContactNum, userId], (error) => {
      if (error) {
        return callback(error);
      }
      return callback(null);
    });
  }
}

module.exports = { User };
