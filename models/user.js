const bcrypt = require("bcrypt");

const Admin = {
  create: (connection, email, password, username, firstName, lastName, callback) => {
    const sql = 'INSERT INTO admin (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, ADMIN_FNAME, ADMIN_LNAME) VALUES (?, ?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10);
    connection.query(sql, [email, hash, username, firstName, lastName], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results.insertId);
    });
  },
  checkIfEmailExists: (connection, email, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM admin WHERE ADMIN_EMAIL = ?';
    connection.query(sql, [email], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0].count > 0);
    });
  },
  findBy: (connection, field, value, callback) => {
    const sql = `SELECT * FROM admin WHERE ${field} = ?`;
    connection.query(sql, [value], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0]);
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
  delete: (connection, adminId, callback) => {
    const sql = 'DELETE FROM admin WHERE ADMIN_ID = ?';
    connection.query(sql, [adminId], (error) => {
      if (error) {
        return callback(error);
      }

      return callback(null);
    });
  },
  edit: (connection, adminId, newPassword, newUsername, newFirstName, newLastName, callback) => {
    const sql = 'UPDATE admin SET ADMIN_PASSWORD=?, ADMIN_USERNAME=?, ADMIN_FNAME=?, ADMIN_LNAME=? WHERE ADIMN_ID=?';
    connection.query(sql, [newPassword, newUsername, newFirstName, newLastName, adminId], (error) => {
      if (error) {
        return callback(error);
      }
      return callback(null);
    });
  }
}

const Owner = {
  create: (connection, email, password, username, firstName, lastName, contactNum, callback) => {
    const sql = 'INSERT INTO owner (OWNER_EMAIL, OWNER_PASSWORD, OWNER_USERNAME, OWNER_FNAME, OWNER_LNAME, OWNER_CONTACTNUM) VALUES (?, ?, ?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10);
    connection.query(sql, [email, hash, username, firstName, lastName, contactNum], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results.insertId);
    });
  },
  checkIfEmailExists: (connection, email, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM owner WHERE OWNER_EMAIL = ?';
    connection.query(sql, [email], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0].count > 0);
    });
  },
  findBy: (connection, field, value, callback) => {
    const sql = `SELECT * FROM owner WHERE ${field} = ?`;
    connection.query(sql, [value], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0]);
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
  delete: (connection, ownerId, callback) => {
    const sql = 'DELETE FROM owner WHERE OWNER_ID = ?';
    connection.query(sql, [ownerId], (error) => {
      if (error) {
        return callback(error);
      }

      return callback(null);
    });
  },
  edit: (connection, ownerId, newPassword, newUsername, newFirstName, newLastName, newContactNum, callback) => {
    const sql = 'UPDATE owner SET OWNER_PASSWORD=?, OWNER_USERNAME=?, OWNER_FNAME=?, OWNER_LNAME=?, OWNER_CONTACTNUM=? WHERE OWNER_ID=?';
    connection.query(sql, [newPassword, newUsername, newFirstName, newLastName, newContactNum, ownerId], (error) => {
        if (error) {
            return callback(error);
        }
        return callback(null);
    });
}

}

const Student = {
  create: (connection, email, password, username, firstName, lastName, callback) => {
    const sql = 'INSERT INTO student (STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_USERNAME, STUDENT_FNAME, STUDENT_LNAME) VALUES (?, ?, ?, ?, ?)';
    const hash = bcrypt.hashSync(password, 10);
    connection.query(sql, [email, hash, username, firstName, lastName], (error, results) => {
    if (error) {
        return callback(error);
    }
    return callback(null, results.insertId);
      });
    },

  checkIfEmailExists: (connection, email, callback) => {
    const sql = 'SELECT COUNT(*) AS count FROM student WHERE STUDENT_EMAIL = ?';
    connection.query(sql, [email], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0].count > 0);
    });
  },

  findBy: (connection, field, value, callback) => {
    const sql = `SELECT * FROM student WHERE ${field} = ?`;
    connection.query(sql, [value], (error, results) => {
      if (error) {
        return callback(error);
      }
      return callback(null, results[0]);
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

  delete: (connection, studentId, callback) => {
    const sql = 'DELETE FROM student WHERE STUDENT_ID = ?';
    connection.query(sql, [studentId], (error) => {
      if (error) {
        return callback(error);
      }

      return callback(null);
    });
  },

  edit: (connection, studentId, newPassword, newUsername, newFirstName, newLastName, callback) => {
    const sql = 'UPDATE student SET STUDENT_PASSWORD=?, STUDENT_USERNAME=?, STUDENT_FNAME=?, STUDENT_LNAME=? WHERE STUDENT_ID=?';
    connection.query(sql, [newPassword, newUsername, newFirstName, newLastName, studentId], (error) => {
        if (error) {
            return callback(error);
        }
        return callback(null);
    });
}
};

module.exports = { Admin, Owner, Student };
