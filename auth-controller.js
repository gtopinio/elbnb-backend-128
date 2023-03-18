const User = require('./models/user');

exports.helloWorld = (req, res) => {
  res.send("Hello World!");
}

exports.getUsers = (pool) => (req, res) => {
pool.getConnection((err, connection) => {
  if (err) console.log(err);

  connection.query('SELECT * FROM USERS', (err, results, fields) => {
    if (err) console.log("Query Error:\n" + err);
    console.log(results);

    connection.release();

    res.send(results);
  });
});
}

exports.signUp = (pool) = (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  User.create(pool, firstName, lastName, email, password, (error, userId) => {
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    console.log(`User created with id ${userId}`);
    return res.send({ success: true });
  });
}
