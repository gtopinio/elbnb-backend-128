// Imports
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const { Admin, Owner, Student } = require('./models/user');

// Configuration for cloudinary (cloud for uploading unstructured files) 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


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

// MOCKUP-BACKEND-128 ENDPOINTS

// This function exports a route handler for signing up a user. 
// It takes a MySQL connection pool as a parameter and returns a function that handles HTTP requests and responses. 
// The function first gets a database connection from the pool, and then begins a transaction. 
// It then extracts the necessary data from the HTTP request body, such as email, password, username, first name, last name, contact number, and account type. 
// Based on the account type, it checks if the email already exists in the database using the appropriate user class (Admin, Owner, or Student), and creates a new user if the email is unique. 
// If an error occurs during any of these steps, the function logs the error and rolls back the transaction. 
// If everything is successful, the function commits the transaction and sends a response indicating success or failure.
exports.signUp = (pool) => (req, res) => {
  pool.getConnection((err, connection) => {
    if(err){
      console.log(err);
    } else{
      connection.beginTransaction((err) => {
        if(err){
          console.log(err);
        } else {
            const { email, password, username, firstName, lastName, contactNum, isBusinessAccount, isAdmin } = req.body;
        
            // Create the appropriate user based on the isAdmin and isBusinessAccount flags
            if (isAdmin) {
              // Check first if email already exists
              Admin.checkIfEmailExists(pool, email, (error, result) => {
                // If an error occured or user is not found
                if (error) {
                  console.log(error);
                  return res.send({ success: false });
                }
                if (!result) {
                  console.log("Email is unique! Creating admin...");
                  user = Admin.create(connection, email, password, username, firstName, lastName, (error, userId) => {
                    if (error) {
                      console.log(error);
                      connection.rollback();
                      return res.send({ success: false });
                    }
                    console.log(`Admin created with id ${userId}`);
                    connection.commit();
                    return res.send({ success: true });
                  });
                } else {
                  console.log("Email is already registered!");
                  return res.send({ success: false });
                }});
              
            } else if (isBusinessAccount) {
              // Check first if email already exists
              Owner.checkIfEmailExists(pool, email, (error, result) => {
                // If an error occured or user is not found
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({ success: false });
                }
                if (!result) {
                  console.log("Email is unique! Creating owner...");
                  user = Owner.create(connection, email, password, username, firstName, lastName, contactNum, (error, userId) => {
                    if (error) {
                      console.log(error);
                      return res.send({ success: false });
                    }
                    console.log(`Owner created with id ${userId}`);
                    connection.commit();
                    return res.send({ success: true });
                  });
                } else {
                  console.log("Email is already registered!");
                  return res.send({ success: false });
                }});
              
            } else {
              // Check first if email already exists
              Student.checkIfEmailExists(pool, email, (error, result) => {
                // If an error occured or user is not found
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({ success: false });
                }
                if (!result) {
                  console.log("Email is unique! Creating student...");
                  user = Student.create(connection, email, password, username, firstName, lastName, (error, userId) => {
                    if (error) {
                      console.log(error);
                      return res.send({ success: false });
                    }
                    console.log(`Student created with id ${userId}`);
                    // If everything is successful, commit the transaction
                    connection.commit();
                    return res.send({ success: true });
                  });
                } else {
                  console.log("Email is already registered!");
                  return res.send({ success: false });
                }});
              
            }
        }
      });
    }
  });
};


// This login function takes a connection pool as a parameter and handles login requests for admins, owners, and students. 
// It extracts the email and password from the request body, checks if the email exists in the admin table, owner table, or student table, and finds the corresponding user in the table. 
// It then compares the provided password with the hashed password in the table and generates a JSON Web Token (JWT) with a user payload containing user information, including the user type. 
// Finally, it returns the JWT and user information as a response if the login is successful. 
// If the login fails or an error occurs, it returns a response with success false.
exports.login = (pool) => (req, res) => {

  // Credentials
  const email = req.body.email.trim();
  const password = req.body.password;

  pool.getConnection((err, connection) => {
    if(err){
      console.log(err);
      return res.send({success: false});
    } else{
       // Check if email exists in the admin table
      Admin.checkIfEmailExists(connection, email, (error, results) => {
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    if (results) {
      // After finding out that the user exists, we find the user
      var admin;
      Admin.findBy(connection, "ADMIN_EMAIL", email, (err, result) => {
        if(err){
          console.log(err);
          return res.send({success: false});
        }
        if(typeof result === "undefined"){
          console.log("User does not exist.");
        } else {// user exists
          admin = result;
          Admin.comparePassword(password, admin.ADMIN_PASSWORD, (error, isMatch) => {
            if (error) {
              console.log(error);
              return res.send({ success: false });
            }
            if (!isMatch) {
              console.log("Incorrect password");
              return res.send({ success: false });
            }
            const tokenPayload = {
                user_id: admin.ADMIN_ID,
                user_type: "admin"
            }
            const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET_STRING);
            console.log("Successfully logged in as admin");
            return res.send({
              success: true,
              authToken: token,
              userId: admin.ADMIN_ID,
              fname: admin.ADMIN_FNAME,
              lname: admin.ADMIN_LNAME,
              email: email
            });
          });
        }
      });
    } else {
      // Check if email exists in the owner table
      Owner.checkIfEmailExists(pool, email, (error, results) => {
        if (error) {
          console.log(error);
          return res.send({ success: false });
        }
        if (results) {
          // After finding out that the user exists, we find the user
          var owner;
          Owner.findBy(connection, "OWNER_EMAIL", email, (err, result) => {
            if(err){
              console.log(err);
              return res.send({success: false});
            }
            if(typeof result === "undefined"){
              console.log("User does not exist.");
            } else {// user exists
              owner = result;
              Owner.comparePassword(password, owner.OWNER_PASSWORD, (error, isMatch) => {
                if (error) {
                  console.log(error);
                  return res.send({ success: false });
                }
                if (!isMatch) {
                  console.log("Incorrect password");
                  return res.send({ success: false });
                }
                const tokenPayload = {
                    user_id: owner.OWNER_ID,
                    user_type: "owner"
                }
                const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET_STRING);
                console.log("Successfully logged in as owner");
                return res.send({
                  success: true,
                  authToken: token,
                  userId: owner.OWNER_ID,
                  fname: owner.OWNER_FNAME,
                  lname: owner.OWNER_LNAME,
                  email: email
                });
              });
            }
          });
        } else {
          // Check if email exists in the student table
          Student.checkIfEmailExists(pool, email, (error, results) => {
            if (error) {
              console.log(error);
              return res.send({ success: false });
            }
            if (results) {
              // After finding out that the user exists, we find the user
              var student;
              Student.findBy(connection, "STUDENT_EMAIL", email, (err, result) => {
                if(err){
                  console.log(err);
                  return res.send({success: false});
                }
                if(typeof result === "undefined"){
                  console.log("User does not exist.");
                } else {// user exists
                  student = result;
                  Student.comparePassword(password, student.STUDENT_PASSWORD, (error, isMatch) => {
                    if (error) {
                      console.log(error);
                      return res.send({ success: false });
                    }
                    if (!isMatch) {
                      console.log("Incorrect password");
                      return res.send({ success: false });
                    }
                    const tokenPayload = {
                        user_id: student.STUDENT_ID,
                        user_type: "student"
                    }
                    const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET_STRING);
                    console.log("Successfully logged in as student");
                    return res.send({
                      success: true,
                      authToken: token,
                      userId: student.STUDENT_ID,
                      fname: student.STUDENT_FNAME,
                      lname: student.STUDENT_LNAME,
                      email: email
                    });
                  });
                }
              });
            } else {
              console.log("User not found");
              return res.send({ success: false });
            }
          });
        }
      });
    }
  });
}});
}



// The checkIfLoggedIn function checks if the user is logged in by verifying the presence and validity of a JWT token stored in a cookie. 
// It also verifies the user type and checks if the user exists in the database for that user type. It returns a JSON object containing 'isLoggedIn',
// which could either be true or false depending if the user is really logged in or not.
exports.checkIfLoggedIn = (pool) => (req, res) => {
  // Checking if cookies/authToken cookie exists
  if (!req.cookies.authToken) {
    console.log("failed")
    return res.send({ isLoggedIn: false });
  }

  jwt.verify(
    req.cookies.authToken,
    process.env.AUTH_SECRET_STRING,
    (err, tokenPayload) => {
      if (err) {
        return res.send({ isLoggedIn: false });
      }

      const user_id = tokenPayload.user_id; // Use the id that has been sent
      const user_type = tokenPayload.user_type; // Get the user type from the token

      // Check if the user type is admin, student, or owner
      if (user_type !== "admin" && user_type !== "student" && user_type !== "owner") {
        console.log("Invalid user type");
        return res.send({ isLoggedIn: false });
      }

      // Find the user based on the user type and id
      if (user_type === "admin") {
        Admin.findBy(pool, "admin_id", user_id, (error, result) => {
          // If an error occured or user is not found
          if (error) {
            console.log(error);
            return res.send({ isLoggedIn: false });
          }
          if (result <= 0) {
            console.log("Admin not found");
            return res.send({ isLoggedIn: false });
          } else {
            console.log("Admin is currently logged in");
            return res.send({ isLoggedIn: true });
          }
        });
      } else if (user_type === "student") {
        Student.findBy(pool, "student_id", user_id, (error, result) => {
          // If an error occured or user is not found
          if (error) {
            console.log(error);
            return res.send({ isLoggedIn: false });
          }
          if (result <= 0) {
            console.log("Student not found");
            return res.send({ isLoggedIn: false });
          } else {
            console.log("Student is currently logged in");
            return res.send({ isLoggedIn: true });
          }
        });
      } else if (user_type === "owner") {
        Owner.findBy(pool, "owner_id", user_id, (error, result) => {
          // If an error occured or user is not found
          if (error) {
            console.log(error);
            return res.send({ isLoggedIn: false });
          }
          if (result <= 0) {
            console.log("Owner not found");
            return res.send({ isLoggedIn: false });
          } else {
            console.log("Owner is currently logged in");
            return res.send({ isLoggedIn: true });
          }
        });
      }
    });
}

// The deleteUserByEmail function takes a MySQL pool as its input and also receives a POST request object.
// The req object is expected to have a body property containing an email field representing the email address of the user to be deleted. 
// This function deletes the user with the specified email address from the database. 
// It first begins a transaction and checks whether the email exists in any of the three tables (Admin, Owner, Student). 
// If the email exists in any table, it deletes the user and logs a message to the console with the email address of the deleted user. 
// If the email does not exist in any table, it rolls back the transaction and returns a response with a success property set to false. 
// Finally, if the deletion is successful, it commits the transaction and returns a response with a success property set to true.
exports.deleteUserByEmail = (pool) => (req, res) => {
  const email = req.body.email;

  // Console log the email to be deleted
  console.log("=== DELETING USER BY EMAIL ===");
  console.log(email);

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
    } else {
      connection.beginTransaction((err) => {
        if (err) {
          console.log(err);
        } else {
          // Check if email exists in any of the tables
          Admin.findBy(connection, "ADMIN_EMAIL", email, (error, admin) => {
            if (error) {
              console.log(error);
              connection.rollback();
              return res.send({success:false});
            }
            if (admin) {
              Admin.delete(connection, admin.ADMIN_ID, (error) => {
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({success:false});
                }
                console.log(`Admin with email ${email} has been deleted.`);
                connection.commit();
                return res.send({success:true});
              });
            } else {
              Owner.findBy(connection, "OWNER_EMAIL", email, (error, owner) => {
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({success:false});
                }
                if (owner) {
                  Owner.delete(connection, owner.OWNER_ID, (error) => {
                    if (error) {
                      console.log(error);
                      connection.rollback();
                      return res.send({success:false});
                    }
                    console.log(`Owner with email ${email} has been deleted.`);
                    connection.commit();
                    return res.send({success:true});
                  });
                } else {
                  Student.findBy(connection, "STUDENT_EMAIL", email, (error, student) => {
                    if (error) {
                      console.log(error);
                      connection.rollback();
                      return res.send({success:false});
                    }
                    if (student) {
                      Student.delete(connection, student.STUDENT_ID, (error) => {
                        if (error) {
                          console.log(error);
                          connection.rollback();
                          return res.send({success:false});
                        }
                        console.log(`Student with email ${email} has been deleted.`);
                        connection.commit();
                        return res.send({success:true});
                      });
                    } else {
                      console.log(`User with email ${email} does not exist.`);
                      connection.rollback();
                      return res.send({success:false});
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};


// The editUserByEmail takes in a pool object and returns a function that handles editing user information by email. 
// The function expects a POST request that contains the user email to be edited, as well as the new password, username, first name, last name, and contact number (if applicable) to be updated. 
// The function begins by logging the email to be edited, then attempts to establish a connection to the database. 
// If successful, the function checks if the email exists in any of the three user tables (Admin, Owner, Student), and if 
// found, updates the corresponding user's information in the database with the new data provided in the request body. 
// If the email is not found, the function returns a response indicating that the user does not exist. If any errors occur during the process, the function logs the error and returns a response indicating that the operation was unsuccessful. 
// The function returns a response indicating whether the operation was successful or not.
exports.editUserByEmail = (pool) => (req, res) => {
  const { email, newPassword, newUsername, newFirstName, newLastName, newContactNum} = req.body;

  // Console log the email to be deleted
  console.log("=== EDIT USER BY EMAIL ===");
  console.log(email);

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      return res.send({success:false});
    } else {
      connection.beginTransaction((err) => {
        if (err) {
          console.log(err);
          return res.send({success:false});
        } else {
          // Check if email exists in any of the tables
          Admin.findBy(connection, "ADMIN_EMAIL", email, (error, admin) => {
            if (error) {
              console.log(error);
              connection.rollback();
              return res.send({success:false});
            }
            if (admin) {
              Admin.edit(connection, admin.ADMIN_ID, newPassword, newUsername, newFirstName, newLastName, (error) => {
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({success:false});
                }
                console.log(`Admin with email ${email} has been edited.`);
                connection.commit();
                return res.send({success:true});
              });
            } else {
              Owner.findBy(connection, "OWNER_EMAIL", email, (error, owner) => {
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({success:false});
                }
                if (owner) {
                  Owner.edit(connection, owner.OWNER_ID, newPassword, newUsername, newFirstName, newLastName, newContactNum, (error) => {
                    if (error) {
                      console.log(error);
                      connection.rollback();
                      return res.send({success:false});
                    }
                    console.log(`Owner with email ${email} has been edited.`);
                    connection.commit();
                    return res.send({success:true});
                  });
                } else {
                  Student.findBy(connection, "STUDENT_EMAIL", email, (error, student) => {
                    if (error) {
                      console.log(error);
                      connection.rollback();
                      return res.send({success:false});
                    }
                    if (student) {
                      Student.edit(connection, student.STUDENT_ID, newPassword, newUsername, newFirstName, newLastName, (error) => {
                        if (error) {
                          console.log(error);
                          connection.rollback();
                          return res.send({success:false});
                        }
                        console.log(`Student with email ${email} has been edited.`);
                        connection.commit();
                        return res.send({success:true});
                      });
                    } else {
                      console.log(`User with email ${email} does not exist.`);
                      connection.rollback();
                      return res.send({success:false});
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
};


// The viewProfile function retrieves the user profile information for the user identified by the provided email address. 
// It checks if the email exists in any of the tables for admins, owners, or students. 
// If it finds a match, it returns the corresponding profile information in JSON format.
exports.viewProfile = (pool) => (req, res) => {
  const email = req.body.email;

  // Console log the email to be deleted
  console.log("=== VIEWING USER BY EMAIL ===");
  console.log(email);

  pool.getConnection((err, connection) => {
    if (err) {
      console.log(err);
    } else {
        // Check if email exists in any of the tables
        Admin.findBy(connection, "ADMIN_EMAIL", email, (error, admin) => {
          if (error) {
            console.log(error);
            return res.send({success:false, message: "Error finding user"});
          }
          if (admin) {
              console.log("Admin found! Sending profile data...");
              return res.send({
                first_name: admin.ADMIN_FNAME,
                last_name: admin.ADMIN_LNAME,
                email: admin.ADMIN_EMAIL,
                user_id: admin.ADMIN_ID
              });
          } else {
            Owner.findBy(connection, "OWNER_EMAIL", email, (error, owner) => {
              if (error) {
                console.log(error);
                return res.send({success:false, message: "Error finding user"});
              }
              if (owner) {
                return res.send({
                  first_name: owner.OWNER_FNAME,
                  last_name: owner.OWNER_LNAME,
                  email: owner.OWNER_EMAIL,
                  contact_no: owner.OWNER_CONTACTNUM,
                  user_id: owner.OWNER_ID
                });
              } else {
                Student.findBy(connection, "STUDENT_EMAIL", email, (error, student) => {
                  if (error) {
                    console.log(error);
                    return res.send({success:false, message: "Error finding user"});
                  }
                  if (student) {
                    return res.send({
                      first_name: student.STUDENT_FNAME,
                      last_name: student.STUDENT_LNAME,
                      email: student.STUDENT_EMAIL,
                      user_id: student.STUDENT_ID
                    });
                  } else {
                    console.log(`User with email ${email} does not exist.`);
                    return res.send({success:false, message: "User not found"});
                  }
                });
              }
            });
          }
        });
    }
  });
};


// The checkAccommDup function checks if an accommodation with the given name already exists in the database by querying the accommodations table. 
function checkAccommDup(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT ACCOMMODATION_ID FROM accommodations WHERE ACCOMMODATION_NAME = ?`;
      connection.query(checkQuery, [name], (err, result) => {
        if (err) {
          console.log("Check Accom Dup Error: " + err);
          callback(err, null);
        } else {
          callback(null, result.length > 0);
        }
      });
    }
  });
}

// This function is used to add a new accommodation to the database. 
// It takes in a pool object as input, which is used to establish a database connection. 
// The function then reads the details of the new accommodation from the request body, including its name, type, description, location, price, capacity, and amenities (an array of strings). 
// If an accommodation with the same name already exists in the database, the function returns a JSON object indicating failure. 
// Otherwise, the function begins a transaction and inserts the new accommodation into the accommodations table, along with its amenities (if any). 
// If everything is successful, the function returns a JSON object indicating success.
exports.addAccommodation = (pool) => (req, res) => {
  const { name, type, description, location, price, capacity, amenities } = req.body; // assuming amenities is an array of strings
  // Printing the details of the accommodation query
  console.log("========== ACCOMMODATION DETAILS ==========")
  console.log("Name: " + name);
  console.log("Type: " + type);
  console.log("Price: " + price);
  console.log("Description: " + description);
  console.log("Location: " + location);
  console.log("Capacity: " + capacity);

  // check if there's an accommodation that already has the same name
  checkAccommDup(pool, name, (err, hasDup) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (hasDup) {
      console.log("Duplicate accommodation.");
      return res.send({ success: false });
    } else {
    // get pool connection
    pool.getConnection((err, connection) => {
      if(err) {
        console.log("Get Connection Error: " + err);
        return res.send({success:false});
      }
        // begin transaction
    connection.beginTransaction((err) => {
      if(err){
        console.log("Begin Transaction Error: " + err);
        return res.send({success:false});
      }

      else{
        // accommodation name doesn't exist, proceed with inserting the new accommodation
        const accommodationQuery = `
        INSERT INTO accommodations
          (ACCOMMODATION_NAME, ACCOMMODATION_TYPE, ACCOMMODATION_DESCRIPTION, ACCOMMODATION_PRICE, ACCOMMODATION_LOCATION, ACCOMMODATION_CAPACITY)
        VALUES
          (?, ?, ?, ?, ?, ?)
      `;
      connection.query(accommodationQuery, [name, type, description, price, location, capacity], (err, resultQuery) => {
                  if (err) {
                    connection.rollback(() => {
                      console.log("Insert Accommodation Error: " + err);
                      res.send({success:false});
                    });
                  }
                  else { // Successful insertion
                    const accommodationId = resultQuery.insertId; // get the auto-generated id of the newly inserted accommodation

                      if (amenities.length > 0) {
                        // if there are amenities, insert them into the accommodation_amenities table
                        const amenityQueries = amenities.map((amenity) => {
                          return [`${accommodationId}-${amenity}`, accommodationId];
                        });
                        const amenityQuery = `
                          INSERT INTO accommodation_amenities
                            (ACCOMMODATION_AMENITIES_ID, ACCOMMODATION_ID)
                          VALUES
                            ?
                        `;
                        connection.query(amenityQuery, [amenityQueries], (err) => {
                          if (err) {
                            connection.rollback(() => {
                              console.log("Query Amenities Error: " + err);
                              res.send({success:false});
                            });
                          }

                          // commit the transaction if everything is successful
                          else connection.commit((err) => {
                            if (err) {
                              connection.rollback(() => {
                                console.log("Insert Amenities Error: " + err);
                              });
                            }

                            // return a JSON object indicating success
                            else{
                              return res.send({ success: true });
                            }  
                          });
                        });
                      } else {
                        // commit the transaction if there are no amenities
                        connection.commit((err) => {
                          if (err) {
                            connection.rollback(() => {
                              console.log("Commit Error: " + err);
                              res.send({success:false});
                            });
                          }

                          // return a JSON object indicating success
                          else{
                            return res.send({ success: true });
                          } 

                        });
                      }
            
                  }
          });
        }   // else when no errors in beginning transaction
      });
    });
  }     // else when there's no duplicate
  }); // end of checkAccommDup
};


// This function takes a database connection pool, an accommodation name (unique), and a callback function as inputs. 
// It queries the database to retrieve the accommodation ID for the provided name and passes the result to the callback function. 
// If there is an error in the database query or connection, it logs the error and passes it to the callback function as the first parameter.
function getAccommodationIdByName(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT ACCOMMODATION_ID FROM accommodations WHERE ACCOMMODATION_NAME = ?`;
      connection.query(checkQuery, [name], (err, result) => {
        if (err) {
          console.log("Get Accomm Id Error: " + err);
          callback(err, null);
        } else {
          try{
            if(typeof result[0].ACCOMMODATION_ID === "undefined") {
              console.log("Get Accom Id: Undefined Object");
              callback(null, 0);
            }
            else {
              console.log("Get Accom Id: Defined Object");
              callback(null, result[0].ACCOMMODATION_ID);
            }
          } catch (err) {
            console.log("Accommodation Not Found...");
            callback(err, null);
          }
          
        }
      });
    }
  });
}

// The editAccommodation function takes a MySQL connection pool as input and returns a callback function that handles an POST request for editing an accommodation. 
// The function first extracts the updated accommodation details from the request body. It then tries to retrieve the ID of the accommodation to be updated by its name. 
// If the accommodation exists, it checks if the updated name already exists for another accommodation. 
// If the updated name is unique, the function updates the accommodation details in the database using a transaction to ensure data consistency. 
// The output of the function is a response object sent back to the client indicating whether the update was successful or not.
exports.editAccommodation = (pool) => (req, res) => {
  const {name, newName, newType, newDescription, newLocation, newPrice, newCapacity} = req.body;

  // Try to get the id first if accommodation exists
  // check if there's an accommodation that has the same name
  var id = null;
  getAccommodationIdByName(pool, name, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0) {
      id = accommodationId;
        // check if the updated name already exists for another accommodation
        const checkNameDupQuery = `
        SELECT COUNT(*) AS count
        FROM accommodations
        WHERE ACCOMMODATION_NAME = ? AND ACCOMMODATION_ID != ?
      `;

      // get pool connection
      pool.getConnection((err, connection) => {
        if(err) {
          console.log("Get Connection Error: " + err);
          return res.send({success:false});
        }
          // begin transaction
      connection.beginTransaction((err) => {
        if(err){
          console.log("Begin Transaction Error: " + err);
          return res.send({success:false});
        }

        else{
          connection.query(checkNameDupQuery, [newName, id], (err, result) => {
            if (err) {
              console.log("Error: " + err);
              return res.send({ success: false });
            } else if (result[0].count > 0) {
              console.log("Duplicate accommodation name.");
              return res.send({ success: false });
            } else {
              // update the accommodation details
              const updateQuery = `
                UPDATE accommodations
                SET
                  ACCOMMODATION_NAME = ?,
                  ACCOMMODATION_TYPE = ?,
                  ACCOMMODATION_DESCRIPTION = ?,
                  ACCOMMODATION_LOCATION = ?,
                  ACCOMMODATION_PRICE = ?,
                  ACCOMMODATION_CAPACITY = ?
                WHERE ACCOMMODATION_ID = ?
              `;
              connection.query(updateQuery, [newName, newType, newDescription, newLocation, newPrice, newCapacity, id], (err) => {
                if (err) {
                  connection.rollback(() => {
                    console.log("Error updating accommodation: " + err);
                    res.send({success:false});
                  });
                } else {
                  connection.commit((err) => {
                    if(err){
                      connection.rollback(() => {
                        console.log("Commit Error: " + err);
                        res.send({success:false});
                      });
                    } else {
                      console.log("Successfully updated accommodation: " + name);
                      return res.send({ success: true });
                    }
                  });
                }
              });
            }
          });
        }});
      });
    } else {
      console.log("Accommodation not found! Cannot proceed to editing...");
      return res.send({success: false});
    }});
};


// This function, archiveAccommodation, takes in a MySQL connection pool object as input and returns an Express request handler function. 
// This function handles a POST request that receives the name of an accommodation and a boolean value that represents whether it should be archived or unarchived. 
// It uses the getAccommodationIdByName helper function to get the ID of the specified accommodation, and then archives or unarchives it using a SQL UPDATE query. 
// If the query is successful, it sends a response with a boolean value of true, indicating that the accommodation has been successfully archived or unarchived. 
// If any errors occur during the process, it sends a response with a boolean value of false, and logs the error to the console.
exports.archiveAccommodation = (pool) => (req, res) => {
  const {name, isArchived } = req.body;

  // Try to get the id first if accommodation exists using the name
  var id = null;
  getAccommodationIdByName(pool, name, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId !== "undefined") {
      id = accommodationId;

      // get pool connection
      pool.getConnection((err, connection) => {
        if(err) {
          console.log("Get Connection Error: " + err);
          return res.send({success:false});
        }
          // begin transaction
      connection.beginTransaction((err) => {
        if(err){
          console.log("Begin Transaction Error: " + err);
          return res.send({success:false});
        }

        else{
              // archive the accommodation details
              const archiveQuery = `
                UPDATE accommodations
                SET
                  ACCOMMODATION_ISARCHIVED = ?
                WHERE ACCOMMODATION_ID = ?
              `;
              connection.query(archiveQuery, [isArchived, id], (err) => {
                if (err) {
                  connection.rollback(() => {
                    console.log("Error archiving accommodation: " + err);
                    res.send({success:false});
                  });
                } else {
                  connection.commit((err) => {
                    if(err){
                      connection.rollback(() => {
                        console.log("Commit Error: " + err);
                        res.send({success:false});
                      });
                    } else {
                      console.log("Successfully archived accommodation: " + name);
                      return res.send({ success: true });
                    }});
                }
              });
            }
          });
      });
    } else {
      console.log("Accommodation not found! Cannot proceed to archiving...");
      return res.send({success: false});
    }});
};

// The deleteAccommodation function takes in a pool object and processes the request object containing the name of the accommodation to be deleted. 
// The function tries to get the ID of the accommodation by its name, and if found, it will first delete the accommodation's amenities before deleting the accommodation itself. 
// The function returns a JSON response indicating whether the operation was successful or not.
exports.deleteAccommodation = (pool) => (req, res) => {
  const {name} = req.body;

  // Try to get the id first if accommodation exists
  // check if there's an accommodation that has the same name
  var id = null;
  getAccommodationIdByName(pool, name, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0) {
      id = accommodationId;
        // check if the accommodation has amenities
        const deleteAmenitiesQuery = `
        DELETE FROM accommodation_amenities
        WHERE ACCOMMODATION_ID = ?;
      `;

      // TODO: Delete also the other affected tables: favorites, review, pictures

      // get pool connection
      pool.getConnection((err, connection) => {
        if(err) {
          console.log("Get Connection Error: " + err);
          return res.send({success:false});
        }
          // begin transaction
      connection.beginTransaction((err) => {
        if(err){
          console.log("Begin Transaction Error: " + err);
          return res.send({success:false});
        }

        else{
          // Delete the accommodation's amenities first
          connection.query(deleteAmenitiesQuery, [id], (err, result) => {
            if (err) {
              connection.rollback(() => {
                console.log("Error deleting accommodation amenities: " + err);
                res.send({success:false});
              });
            } else if (result.affectedRows > 0 || result.affectedRows == 0) {

              connection.commit((err) => {
                if(err){
                  connection.rollback(() => {
                    console.log("Commit Error: " + err);
                    res.send({success:false});
                  });
                } else {
                  // delete the accommodation
                  const deleteQuery = `
                  DELETE FROM accommodations
                  WHERE ACCOMMODATION_ID = ?;
                  `;
                  connection.query(deleteQuery, [id], (err) => {
                    if (err) {
                      connection.rollback(() => {
                        console.log("Error deleting accommodation: " + err);
                        res.send({success:false});
                      });
                    } else {
                      connection.commit((err) => {
                        if(err){
                          connection.rollback(() => {
                            console.log("Commit Error: " + err);
                            res.send({success:false});
                          });
                        } else {
                          console.log("Successfully deleted accommodation: " + name);
                          return res.send({ success: true });
                        }
                      });
                    }
                  });

                }});
            }
          });
        }});
      });
    } else {
      console.log("Accommodation not found! Cannot proceed to deleting...");
      return res.send({success: false});
    }});
};



// The function takes in a database connection pool object and returns a callback function that filters accommodations based on the user's search criteria specified in the req.query object. 
// The function constructs a SQL query using the search criteria and executes it against the database. 
// The results are returned in a JSON object with a success property indicating whether the query was successful and an accommodations property containing the filtered results. 
// The function also logs the filter details and SQL query for debugging purposes.
exports.filterAccommodations = (pool) => (req, res) => {
  const { minPrice, maxPrice, capacity, type } = req.query;
  
  let whereClause = "";
  let orderByClause = "ORDER BY ACCOMMODATION_NAME ASC";
  let filterValues = [];

  if (minPrice || maxPrice || capacity || type) {

    // Print the filters
    console.log("========== FILTER DETAILS ==========")
    console.log("Type: " + type);
    console.log("Min Price: " + minPrice);
    console.log("Max Price: " + maxPrice);
    console.log("Capacity: " + capacity);

    if (minPrice && maxPrice) {
      whereClause += "WHERE ACCOMMODATION_PRICE BETWEEN ? AND ? ";
      filterValues.push(minPrice, maxPrice);
    } else if (minPrice) {
      whereClause += "WHERE ACCOMMODATION_PRICE >= ? ";
      filterValues.push(minPrice);
    } else if (maxPrice) {
      whereClause += "WHERE ACCOMMODATION_PRICE <= ? ";
      filterValues.push(maxPrice);
    }

    if (capacity) {
      if (whereClause) whereClause += "AND ";
      else whereClause += "WHERE ";
      whereClause += "ACCOMMODATION_CAPACITY >= ? ";
      filterValues.push(capacity);
    }

    if (type && type.length > 0) {
      if (whereClause) whereClause += "AND ";
      else whereClause += "WHERE ";
      whereClause += "ACCOMMODATION_TYPE IN (?) ";
      filterValues.push(type);
    }

    if (minPrice || maxPrice || capacity || (type && type.length > 0)) {
      orderByClause = "ORDER BY ";
      if (minPrice) orderByClause += "ACCOMMODATION_PRICE ASC, ";
      if (capacity) orderByClause += "ACCOMMODATION_CAPACITY DESC, ";
      orderByClause += "ACCOMMODATION_NAME ASC";
    }
  }

  const query = `
    SELECT *
    FROM accommodations
    ${whereClause}
    ${orderByClause}
  `;

  // Printing the query
  console.log("Query: " + query);
  console.log("\nWhere Clause: " + whereClause);
  console.log("Order By Clause: " + orderByClause);
  console.log("Filter Values: " + filterValues);
  
  pool.query(query, filterValues, (err, results) => {
    if (err) {
      console.log("Filter Accommodations Error: " + err);
      return res.send({ success: false });
    } else {
      return res.send({ success: true, accommodations: results });
    }
  });
};

// This is a function that uploads an image to Cloudinary and updates the accommodation_pictures table in 
// a database with the accommodation picture ID and accommodation ID. It first extracts the image data from the request body, 
// converts the buffer to a base64 data URL, and finds the accommodation ID from the request parameters. 
// It then checks if there is an accommodation with the same name and gets the accommodation ID using the getAccommodationIdByName function.
// If there is no error and the accommodation ID is greater than 0, it establishes a connection to the database and uploads the image to Cloudinary using the cloudinary.uploader.upload method. 
// It then inserts a new row in the accommodation_pictures table with the accommodation picture ID and accommodation ID using an SQL INSERT statement.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
exports.uploadAccommodationPic = (pool) => async (req, res) => {

  // Extract the image data from the request body
  const imageData = req.files.data[0].buffer;

   // Convert the buffer to a base64 data URL
   const mimeType = req.files.data[0].mimetype;
   const imageDataUrl = `data:${mimeType};base64,${imageData.toString('base64')}`;
    
  // Find the accommodation id from the request parameters
  const accommodationName = req.body.accommodationName;

  // console.log("Data: " + base64Data);
  console.log("Accommodation Name: " + accommodationName);
  
  // check if there's an accommodation that has the same name
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0) {

      pool.getConnection(async (err, connection) => {
        if (err) {
          console.log("Error: " + err);
          callback(err, null);
        } else {
  
        // Upload the image to Cloudinary
        try {
          const result = await cloudinary.uploader.upload(imageDataUrl, { upload_preset: 'mockup_setup' });
          const accommodationPictureId = result.public_id;
          
          // Update the accommodation_pictures table
          const insertAccommodationPictureQuery = `INSERT INTO accommodation_pictures (ACCOMMODATION_PICTURE_ID, ACCOMMODATION_ID) VALUES ('${accommodationPictureId}', ${accommodationId})`;
          await connection.query(insertAccommodationPictureQuery);
          
          // Return success response
          console.log("Successfully uploaded the image to cloudinary!");
          return res.send({ success: true });
        } catch (error) {
          console.error(error);
          return res.send({ success: false, message: 'Error uploading image' });
        }
      }
    });
  } else {
    console.log("Full upload error");
    return res.send({ success: false });
  }
  });
}

// Function to check if a Room Name already exists. Currently not in use
// TODO: Use for adding rooms!
function checkRoomIfExists(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT ROOM_ID FROM room WHERE ROOM_NAME = ?`;
      connection.query(checkQuery, [name], (err, result) => {
        if (err) {
          console.log("Check Room if Exists error: " + err);
          callback(err, null);
        } else {
          callback(null, result.length > 0);
        }
      });
    }
  });
}


// This function takes a database connection pool, a room name (unique), an accommodation_id, and a callback function as inputs. 
// It queries the database to retrieve a Room ID associated with the room name in the parameter input.
// The function returns the callback which includes an error in the first parameter, if the query fails, and the Room ID in the second parameter if the query succeeds.
function getRoomIDbyName(pool, name, accomm_name, callback) {

  // Get accommodation ID from accommodation name.
  var accommid = null;
  getAccommodationIdByName(pool, accomm_name, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
      accommid = accommodationId;

      // Start connection.
      pool.getConnection((err, connection) => {
        if (err) {
          console.log("Error: " + err);
          callback(err, null);
        } else {
          const checkQuery = `SELECT ROOM_ID FROM room WHERE ROOM_NAME = ? AND ACCOMMODATION_ID = ?`;
          connection.query(checkQuery, [name, accommid], (err, result) => {
            if (err) {
              console.log("Get Room ID Error: " + err);
              callback(err, null);
            } else {
              // Room ID error.
              try{
                if(typeof result[0].ROOM_ID === "undefined") {
                  console.log("Get Room ID: Undefined Object");
                  callback(null, 0);
                }
              // Room ID success.
                else {
                  console.log("Get Room ID: Defined Object");
                  callback(null, result[0].ROOM_ID);
                }
              // Room does not exist.
              } catch (err) {
                console.log("Room Not Found...");
                callback(err, null);
              }
            } // end of query else statement.
          }); // end of connection query.
        } // end of connection else statement.
      }); // end of connection.
    } // end of getAccomID else-if statement.
  }); // end of getAccomID function.
} // end of getRoomID function.

exports.addNewRoom = (pool) => (req, res) => {
  const { name, capacity, price, accommodation } = req.body;
  var id = null;
  getAccommodationIdByName(pool, accommodation, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
      id = accommodationId;
        // Create query for inserting a room.
        const addNewRoomQuery = `
        INSERT INTO room
          (ROOM_NAME, ROOM_PRICE, ROOM_CAPACITY, ACCOMMODATION_ID)
        VALUES
        (?, ?, ?, ?)
          `;

        // Get Pool Connection.
        pool.getConnection((err, connection) => {
          if(err) {
            console.log("Get Connection Error: " + err);
            return res.send({success:false});
          }
            
        // Begin Transaction
        connection.beginTransaction((err) => {
          if(err){
            console.log("Begin Transaction Error: " + err);
            return res.send({success:false});
          }else{
            connection.query(addNewRoomQuery, [name, capacity, price, id], (err) => {
              if(err){  // Failed to insert Room.
                connection.rollback(() => {
                  console.log("Insert Room Error: " + err);
                  res.send({ success:false });
                });
              }else{ // Successful Insertion of Room.
                // Commit insertion.
                connection.commit((err) => {
                  if (err) {
                    connection.rollback(() => {
                      console.log("Commit Error: " + err);
                    });
                  } else {
                    console.log("Room successfully inserted!");
                  }
                }); // end of connection.commit.
              } // end of connection.query else statement.
            }); // end of connection.query.
          } // end of transaction else statement.
        }); // end of transaction.
      }); // end of pool connection.
    }else {
      console.log("Accommodation not found! Cannot proceed to adding new room...");
      return res.send({success: false});
    } // Accommodation does not Exist.
  }); // end of getAccommodationIDByName function
}; // end of function

// The editRoom function takes a database connection pool as input and returns a callback function that handles a POST request for editing a room.
// The function takes the information in the request body which it will use to identify the Room ID associated with the current room name provided through the getRoomIDbyName helper function.
// If the room exists, it checks if the updated name already exists within the database.
// If the updated name doesn't exist, the function updates the room's details according to the request body and returns a response indicating the successful update to the client.
// Otherwise, it returns a response indicating the unsuccessful update to the client.
exports.editRoom = (pool) => (req, res) => {
  const {name, newName, newCapacity, newPrice, accommodation} = req.body;

  // Get the ID of the Accommodation if the name exists.
  var accommid = null;
  getAccommodationIdByName(pool, accommodation, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
      accommid = accommodationId;
      
      // Check if the room ID exists.
      var id = null;
      getRoomIDbyName(pool, name, (err, roomID) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
        } else if (roomID > 0 && typeof roomID !== "undefined") {

          id = roomID;
            // Query to check if room name already exists within the database.
            const checkRoomNameDupQuery = `
            SELECT COUNT(*) AS count
            FROM room
            WHERE ROOM_NAME = ? AND ROOM_ID != ?
          `;
    
          // Get Pool Connection
          pool.getConnection((err, connection) => {
            if(err) {
              console.log("Get Connection Error: " + err);
              return res.send({success:false});
            }
              // Begin Transaction.
          connection.beginTransaction((err) => {
            if(err){
              console.log("Begin Transaction Error: " + err);
              return res.send({success:false});
            }
    
            else{
              connection.query(checkRoomNameDupQuery, [newName, id], (err, result) => {
                if (err) {
                  console.log("Error: " + err);
                  return res.send({ success: false });
                } else if (result[0].count > 0) {
                  console.log("Duplicate room name.");
                  return res.send({ success: false });
                } else {
                  // Update the Room details.
                  const updateQuery = `
                    UPDATE room
                    SET
                      ROOM_NAME = ?,
                      ROOM_CAPACITY = ?,
                      ROOM_PRICE = ?,
                    WHERE ROOM_ID = ?
                  `;
                  connection.query(updateQuery, [newName, newCapacity, newPrice, id], (err) => {
                    if (err) {
                      connection.rollback(() => {
                        console.log("Error updating room: " + err);
                        res.send({success:false});
                      });
                    } else {
                      connection.commit((err) => {
                        if(err){
                          connection.rollback(() => {
                            console.log("Commit Error: " + err);
                            res.send({success:false});
                          });
                        } else {
                          console.log("Successfully updated room: " + name);
                          return res.send({ success: true });
                        }
                      });
                    }
                  });
                }
              });
            }});
          });
        } else {
          console.log("Room not found! Cannot proceed to editing...");
          return res.send({success: false});
        }
      });
    }
  });
  
};


// The deleteRoom function takes a database connection pool as input and returns a callback function that handles a POST request for deleting a room.
// The function takes the information in the request body which it will use to identify the Room ID associated with the current room name provided through the getRoomIDbyName helper function.
// If the room exists, it removes the room from the database and returns a response indicating the successful deletion to the client.
// Otherwise, it returns a response indicating the unsuccessful deletion to the client.
exports.deleteRoom = (pool) => (req, res) => {
  const {name} = req.body;

  // Get the ID of the room if the name exists.
  var id = null;
  getRoomIDbyName(pool, name, (err, roomID) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (roomID > 0 && typeof roomID !== "undefined") {
      id = roomID;
        // Query to delete the Room.
        const deleteRoomQuery = `
        DELETE FROM room
        WHERE ROOM_ID = ?;
      `;

      // Get Pool Connection.
      pool.getConnection((err, connection) => {
        if(err) {
          console.log("Get Connection Error: " + err);
          return res.send({success:false});
        }
      // Begin Transaction.
      connection.beginTransaction((err) => {
        if(err){
          console.log("Begin Transaction Error: " + err);
          return res.send({success:false});
        }
        connection.query(deleteRoomQuery, [id], (err) => {
          if (err) {
            connection.rollback(() => {
              console.log("Error deleting room: " + err);
              res.send({success:false});
            });
          } else {
            connection.commit((err) => {
              if(err){
                connection.rollback(() => {
                  console.log("Commit Error: " + err);
                  res.send({success:false});
                });
              } else {
                console.log("Successfully deleted room: " + name);
                return res.send({ success: true });
              }
            });
          }
        });
        });
      });
    } else {
      console.log("Room not found! Cannot proceed to deleting...");
      return res.send({success: false});
    }});
};

// The archiveRoom function takes a database connection pool as input and returns a callback function that handles a POST request for archiving a room.
// The function takes the information in the request body which it will use to identify the Room ID associated with the current room name provided through the getRoomIDbyName helper function.
// If the room exists, it updates a detail of the room in the database to classify it as archived and returns a response indicating a successful operation to the client.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.archiveRoom = (pool) => (req, res) => {
  const {name, isArchived } = req.body;

  //Get the ID of the room if the name exists.
  var id = null;
  getRoomIDbyName(pool, name, (err, roomID) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (roomID > 0 && typeof roomID !== "undefined") {
      id = roomID;

      // Get Pool connection.
      pool.getConnection((err, connection) => {
        if(err) {
          console.log("Get Connection Error: " + err);
          return res.send({success:false});
        }
          // Begin Transaction.
      connection.beginTransaction((err) => {
        if(err){
          console.log("Begin Transaction Error: " + err);
          return res.send({success:false});
        }

        else{
              // Query for archiving room.
              const archiveQuery = `
                UPDATE room
                SET
                  ROOM_ISARCHIVED = ?
                WHERE ROOM_ID = ?
              `;
              connection.query(archiveQuery, [isArchived, id], (err) => {
                if (err) {
                  connection.rollback(() => {
                    console.log("Error archiving room: " + err);
                    res.send({success:false});
                  });
                } else {
                  connection.commit((err) => {
                    if(err){
                      connection.rollback(() => {
                        console.log("Commit Error: " + err);
                        res.send({success:false});
                      });
                    } else {
                      console.log("Successfully archived room: " + name);
                      return res.send({ success: true });
                    }});
                }
              });
            }
          });
      });
    } else {
      console.log("Room not found! Cannot proceed to archiving...");
      return res.send({success: false});
    }});
};