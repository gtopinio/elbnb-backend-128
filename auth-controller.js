const User = require('./models/user');

// Test Endpoints 
exports.helloWorld = (req, res) => {
  res.send("Hello World!");
}

exports.getUsers = (pool) => (req, res) => {
pool.getConnection((err, connection) => {
  if (err) console.log(err);

  connection.query('SELECT * FROM USER', (err, results, fields) => {
    if (err) console.log("Query Error:\n" + err);
    console.log(results);

    connection.release();

    res.send(results);
  });
});
}

// User Management Edpoitns
exports.signUp = (pool) => (req, res) => {
  User.create(pool, req.body.first_name, req.body.last_name, req.body.email, req.body.password, req.body.contact_no, req.body.is_business_account, req.body.is_admin, (error, userId) => {
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    console.log(`User created with id ${userId}`);
    return res.send({ success: true });
  });
}
