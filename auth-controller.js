// Imports
const jwt = require("jsonwebtoken");
const User = require('./models/user');

// Test Endpoints 
exports.helloWorld = (req, res) => {
  req.cookies.title = 'cookie';
  console.log(req.cookies);
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

exports.login = (pool) => (req, res) => {

  // Credentials
  const email = req.body.email.trim();
  const password = req.body.password;

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
      const tokenPayload = {
          // TODO: Token payload subject to change
          user_id: user.user_id
      }
      // TODO: JWT secretKey placeholder only
      const token = jwt.sign(tokenPayload, "THIS_IS_A_SECRET_STRING");
      console.log("Successfully logged in");

      // Return response with token
      // res.cookie('authToken', token, { maxAge: 900000, httpOnly: true });
      return res.send({
        success: true,
        authToken: token,
        fname: user.user_first_name,
        lname: user.user_last_name
      });
    })
  });
}

exports.checkIfLoggedIn = (pool) => (req, res) => {
  // Checking if cookies/authToken cookie exists
  if (!req.cookies.authToken) {
    console.log("failed")
    return res.send({ isLoggedIn: false });
  }

  jwt.verify(
    req.cookies.authToken,
    "THIS_IS_A_SECRET_STRING",
    (err, tokenPayload) => {
      if (err) {
        return res.send({ isLoggedIn: false });
      }

      const user_id = tokenPayload.user_id; // Use the id that has been sent
      User.findBy(pool, "user_id", user_id, (error, result) => {
        // If an error occured or user is not found
        if (error) {
          console.log(error);
          return res.send({ isLoggedIn: false });
        }
        if (!result.exists) {
          console.log("User not found");
          return res.send({ isLoggedIn: false });
        }

        console.log("User is currently logged in");
        return res.send({ isLoggedIn: true });
      });
    });
}

exports.addAccommodation = (pool) => (req, res) => {
  const { name, type, description, location, price, amenities } = req.body; // assuming amenities is an array of strings

  console.log("Name: " + name);
  console.log("Type: " + type);
  console.log("Price: " + price);
  console.log("Description: " + description);
  console.log("Location: " + location);

  let hasDup = false;

  // See if there's an accommodation with the same name
  const checkQuery = `SELECT ACCOMMODATION_ID FROM accommodations WHERE ACCOMMODATION_NAME = ?`;
  connection.query(checkQuery, [name], (err, result) => {
    if (err) console.log("Error: " + err);

    if(result > 0){
      hasDup = true;
    }
  });

  return res.send({success: hasDup});

  // pool.getConnection((err, connection) => {
  //   if (err){
  //     console.log("Erro 1: " + err);
  //   } 

  //   else{
  //   // start a transaction to ensure atomicity
  //   connection.beginTransaction((err) => {
  //     if (err){
  //       console.log("Error 2: " + err);
  //     } 
  //     else{
  //         // check if the accommodation name already exists
  //         const checkQuery = `
  //         SELECT ACCOMMODATION_ID
  //         FROM accommodations
  //         WHERE ACCOMMODATION_NAME = ?
  //       `;
  //       connection.query(checkQuery, [name], (err, result) => {
  //         if (err) {
  //           console.log("Error 3: " + err);
  //         }

  //         else if (result !== 'undefined') {
  //           console.log("Result: " + result);
  //           // accommodation name already exists, rollback and return failure
  //           console.log("Error 4: " + err);
  //             return res.send({ success: false });
  //         }

  //         // accommodation name doesn't exist, proceed with inserting the new accommodation
  //         const accommodationQuery = `
  //           INSERT INTO accommodations
  //             (ACCOMMODATION_NAME, ACCOMMODATION_TYPE, ACCOMMODATION_DESCRIPTION, ACCOMMODATION_PRICE, ACCOMMODATION_LOCATION)
  //           VALUES
  //             (?, ?, ?, ?, ?)
  //         `;
  //         connection.query(accommodationQuery, [name, type, description, price, location], (err, resultQuery) => {
  //           if (err) {
  //             connection.rollback(() => {
  //               console.log("Error 5: " + err);
  //             });
  //           }
  //           else {
  //             const accommodationId = resultQuery.insertId; // get the auto-generated id of the newly inserted accommodation

  //             if (amenities.length > 0) {
  //               // if there are amenities, insert them into the accommodation_amenities table
  //               const amenityQueries = amenities.map((amenity) => {
  //                 return [`${accommodationId}-${amenity}`, accommodationId];
  //               });
  //               const amenityQuery = `
  //                 INSERT INTO accommodation_amenities
  //                   (ACCOMMODATION_AMENITIES_ID, ACCOMMODATION_ID)
  //                 VALUES
  //                   ?
  //               `;
  //               connection.query(amenityQuery, [amenityQueries], (err) => {
  //                 if (err) {
  //                   connection.rollback(() => {
  //                     console.log("Error 6: " + err);
  //                   });
  //                 }

  //                 // commit the transaction if everything is successful
  //                 else connection.commit((err) => {
  //                   if (err) {
  //                     connection.rollback(() => {
  //                        console.log("Error 7: " + err);
  //                     });
  //                   }

  //                   // return a JSON object indicating success
  //                   else{
  //                     hasResponded = true;
  //                     return res.send({ success: true });
  //                   }  
  //                 });
  //               });
  //             } else {
  //               // commit the transaction if there are no amenities
  //               connection.commit((err) => {
  //                 if (err) {
  //                   connection.rollback(() => {
  //                     console.log("Error 8: " + err);
  //                   });
  //                 }

  //                 // return a JSON object indicating success
  //                 else{
  //                   hasResponded = true;
  //                   return res.send({ success: true });
  //                 } 

  //               });
  //             }
  //           }
            
  //         });
  //       });
  //     }
      
  //   });
  // } // else block
  // });
  // // If unsuccessful transactions, return false success
  // if(!hasResponded) return res.send({ success: false });
};
