// Imports
const jwt = require("jsonwebtoken");
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
  console.log("Auth-controller: " + req.body);
  User.create(pool, req.body.first_name, req.body.last_name, req.body.email, req.body.password, req.body.contact_no, req.body.is_business_account, req.body.is_admin, (error, userId) => {
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    console.log(`User created with id ${userId}`);
    return res.send({ success: true });
  });
}

exports.login = (pool) => (req, res) => {

  console.log("Body (login): " + req.body);
  // Credentials
  const email = req.body.email.trim();
  const password = req.body.password;
  console.log("email (login): " + email);
  console.log("password (login): " + password);

  // Check if email exists in the database
  User.checkIfEmailExists(pool, email, (error, results) => {
    // If an error occured or user is not found
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    if (!results.exists) {
      console.log("User not found");
      return res.send({ success: false });
    }

    // If user is found, check if password is correct
    const user = results.result[0]
    User.comparePassword(password, user.user_password, (error, isMatch) => {
      // If an error occured or incorrect password
      if (error) {
        console.log(error);
        return res.send({ success: false });
      }
      if (!isMatch) {
        console.log("Incorrect password");
        return res.send({ success: false });
      }

      // Successful login
      console.log("Successfully logged in");
      const tokenPayload = {
          // TODO: Token payload subject to change
          _id: user._id
      }
      // TODO: JWT secretKey placeholder only
      const token = jwt.sign(tokenPayload, "CD718D6872E1A6D69F47578A41FCD");

      // Return response with token
      return res.send({
        success: true,
        token,
        fname: user.user_first_name,
        lname: user.user_last_name
      });
    })
  });
}