const User = require('./models/user');

exports.helloWorld = (req, res) => {
  res.send({message: "Hello World!"});
};

exports.getUsers = (req, res, pool) => {
  pool.getConnection((err, connection) => {
    if (err) console.log(err);

    connection.query('SELECT * FROM USERS', (err, results, fields) => {
      if (err) console.log("Query Error:\n" + err);
      console.log(results);

      connection.release();

      res.send(results);
    });
  });
};

exports.signUp = (req, res, pool) => {
  User.create(pool, req.body.firstName, req.body.lastName, req.body.email, req.body.password, (error, userId) => {
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    console.log(`User created with id ${userId}`);
    return res.send({ success: true });
  });
};
