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
  }
};

module.exports = { Admin, Owner, Student };
