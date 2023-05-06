// Imports
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const { User } = require('./models/user');

// Configuration for cloudinary (cloud for uploading unstructured files) 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_API_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MOCKUP-BACKEND-128 ENDPOINTS

// This signup function takes a connection pool as a parameter and handles signup requests for admins, owners, and students.
// It extracts the user information from the request body, checks if the email already exists in the user table, and creates a new user in the user table.
// It then checks which user type to create and creates a new user in the corresponding table.
// Finally, it returns a response with success true if the signup is successful.
// If the signup fails or an error occurs, it returns a response with success false.
exports.signUp = (pool) => (req, res) => {
  pool.getConnection((err, connection) => {
    if(err){
      console.log(err);
    } else{
      connection.beginTransaction((err) => {
        if(err){
          console.log(err);
        } else {
            const { email, password, username, firstName, lastName, contactNum, isBusinessAccount, isPersonalAccount } = req.body;

            // Check which user type to create
            var userType = null;
            if(!isBusinessAccount && !isPersonalAccount){
              userType = "Admin";
            } else if(isBusinessAccount && !isPersonalAccount){
              userType = "Owner";
            } else if(!isBusinessAccount && isPersonalAccount){
              userType = "Student";
            }
        
            // Check first if email already exists
            User.checkIfEmailExists(pool, email, (error, result) => {
              // If an error occured or user is not found
              if (error) {
                console.log(error);
                return res.send({ success: false });
              }
              if (!result) {
                console.log("Email is unique! Creating user...");
                user = User.create(connection, email, password, username, firstName, lastName, contactNum, userType, (error, userId) => {
                  if (error) {
                    console.log(error);
                    connection.rollback();
                    return res.send({ success: false });
                  }
                  console.log(`User created with id ${userId}`);
                  connection.commit();
                  return res.send({ success: true });
                });
              } else {
                console.log("Email is already registered!");
                return res.send({ success: false });
              }});
        }
      });
    }
  });
};


// This login function takes a connection pool as a parameter and handles login requests for admins, owners, and students.
// It extracts the user information from the request body, checks if the email exists in the user table, and finds the user in the user table.
// It then compares the password entered by the user with the password stored in the database.
// Finally, it returns a response with success true if the login is successful, along with the token, user's id, username, first name, last name, and email.
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
       // Check if email exists in the user table
      User.checkIfEmailExists(connection, email, (error, results) => {
    if (error) {
      console.log(error);
      return res.send({ success: false });
    }
    if (results) {
      // After finding out that the user exists, we find the user
      var user;
      User.findBy(connection, "USER_EMAIL", email, (err, result) => {
        if(err){
          console.log(err);
          return res.send({success: false});
        }
        if(typeof result === "undefined"){
          console.log("User does not exist.");
        } else {// user exists
          user = result;
          User.comparePassword(password, user.USER_PASSWORD, (error, isMatch) => {
            if (error) {
              console.log(error);
              return res.send({ success: false });
            }
            if (!isMatch) {
              console.log("Incorrect password");
              return res.send({ success: false });
            }
            const tokenPayload = {
                user_id: user.USER_ID,
                user_type: user.USER_TYPE
            }
            const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET_STRING);
            console.log("Successfully logged in as " + user.USER_TYPE);
            return res.send({
              success: true,
              authToken: token,
              userId: user.USER_ID,
              username: user.USER_USERNAME,
              fname: user.USER_FNAME,
              lname: user.USER_LNAME,
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
      if (user_type !== "Admin" && user_type !== "Student" && user_type !== "Owner") {
        console.log("Invalid user type");
        return res.send({ isLoggedIn: false });
      }

      // Find the user based on the user type and id
      else {
        User.findBy(pool, "user_id", user_id, (error, result) => {
          // If an error occured or user is not found
          if (error) {
            console.log(error);
            return res.send({ isLoggedIn: false });
          }
          if (result <= 0) {
            console.log(user_type + " not found");
            return res.send({ isLoggedIn: false });
          } else {
            console.log(user_type + " is currently logged in");
            return res.send({ isLoggedIn: true });
          }
        });
      }
    });
}

// This function takes a connection pool as a parameter and handles requests to delete a user by email.
// It extracts the email from the request body, checks if the email exists in the user table, and deletes the user from the user table.
// Finally, it returns a response with success true if the user is successfully deleted, and success false if the user is not deleted or an error occurs.
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
          // Check if email exists in the user table
          User.findBy(connection, "USER_EMAIL", email, (error, user) => {
            if (error) {
              console.log(error);
              connection.rollback();
              return res.send({success:false});
            }
            if (user) {
              User.delete(connection, user.USER_ID, (error) => {
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({success:false});
                }
                console.log(`User with email ${email} has been deleted.`);
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
};


// This function takes a connection pool as a parameter and handles requests to edit a user by email.
// It extracts the email, new password, new username, new first name, new last name, and new contact number from the request body, checks if the email exists in the user table, and updates the user in the user table.
// Finally, it returns a response with success true if the user is successfully updated, and success false if the user is not updated or an error occurs.
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
          User.findBy(connection, "USER_EMAIL", email, (error, user) => {
            if (error) {
              console.log(error);
              connection.rollback();
              return res.send({success:false});
            }
            if (user) {
              User.edit(connection, user.USER_ID, newPassword, newUsername, newFirstName, newLastName, newContactNum, (error) => {
                if (error) {
                  console.log(error);
                  connection.rollback();
                  return res.send({success:false});
                }
                console.log(`User with email ${email} has been edited.`);
                connection.commit();
                return res.send({success:true});
              });
            } else {
              console.log(`User with email ${email} does not exist.`);
              connection.rollback();
              return res.send({success:false});
            }});
        }
      });
    }
  });
};


// This function takes a connection pool as a parameter and handles requests to view a user by email.
// It extracts the email from the request body, checks if the email exists in the user table, and returns the user's profile data.
// Finally, it returns a response with success true if the user is successfully found, and success false if the user is not found or an error occurs.
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
        User.findBy(connection, "USER_EMAIL", email, (error, user) => {
          if (error) {
            console.log(error);
            return res.send({success:false, message: "Error finding user"});
          }
          if (user) {
              console.log("User found! Sending profile data...");
              return res.send({
                first_name: user.USER_FNAME,
                last_name: user.USER_LNAME,
                email: user.USER_EMAIL,
                user_id: user.USER_ID
              });
          } else {
            console.log(`User with email ${email} does not exist.`);
            return res.send({success:false, message: "User not found"});
          }
        });
    }
  });
};


// The checkAccommDup function checks if an accommodation with the given name already exists in the database by querying the accommodation table. 
// It takes a connection pool, accommodation name, and callback function as parameters.
// It returns a boolean value in the callback function.
function checkAccommDup(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT ACCOMMODATION_ID FROM accommodation WHERE ACCOMMODATION_NAME = ?`;
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
// The function then reads the details of the new accommodation from the request body, including its name, type, description, amenities, location, address, and rooms (an array of rooms). 
// If an accommodation with the same name already exists in the database, the function returns a JSON object indicating failure. 
// Otherwise, the function begins a transaction and inserts the new accommodation into the accommodation table, along with its rooms. 
// If everything is successful, the function returns a JSON object indicating success.
exports.addAccommodation = (pool) => (req, res) => {

  const { name, type, address, location, description, amenities, userId, rooms} = req.body; // assuming rooms is an array of room objects

  // Printing the details of the accommodation query
  console.log("========== ACCOMMODATION DETAILS ==========")
  console.log("Name: " + name);
  console.log("Type: " + type);
  console.log("Description: " + description);
  console.log("Location: " + location);
  console.log("Owner ID: " + userId);

  // Check if there are rooms first
  if (rooms.length == 0) {
    console.log("No rooms.");
    return res.send({ success: false });
  }

  // check if there's an accommodation that already has the same name
  checkAccommDup(pool, name, (err, hasDup) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (hasDup) {
      console.log("Duplicate accommodation.");
      return res.send({ success: false });
    } else {
      var flag = true;
      // get pool connection
      pool.getConnection((err, connection) => {
        if (err) {
          console.log("Get Connection Error: " + err);
          return res.send({ success:false });
        }

        // begin transaction
        connection.beginTransaction((err) => {
          if (err) {
            console.log("Begin Transaction Error: " + err);
            return res.send({ success:false });
          } else {
            // accommodation name doesn't exist, proceed with inserting the new accommodation
            const accommodationQuery = `
              INSERT INTO accommodation
                (ACCOMMODATION_NAME, ACCOMMODATION_TYPE, ACCOMMODATION_ADDRESS, ACCOMMODATION_LOCATION, ACCOMMODATION_DESCRIPTION, ACCOMMODATION_AMENITIES, ACCOMMODATION_OWNER_ID)
              VALUES
                (?, ?, ?, ?, ?, ?, ?)
            `;
            connection.query(accommodationQuery, [name, type, address, location, description, amenities, userId], (err, resultQuery) => {
              if (err) {
                connection.rollback(() => {
                  console.log("Insert Accommodation Error: " + err);
                  res.send({ success:false });
                });
              } else { // Successful insertion of accommodation
                const accommodationId = resultQuery.insertId; // get the auto-generated id of the newly inserted accommodation

                    // loop through the rooms array and insert each room into the database
                    for (const room of rooms) {
                      const roomQuery = `
                        INSERT INTO room
                          (ROOM_NAME, ROOM_PRICE, ROOM_CAPACITY, ACCOMMODATION_ID)
                        VALUES
                          (?, ?, ?, ?)
                      `;
                      connection.query(roomQuery, [room.roomName, room.roomPrice, room.roomCapacity, accommodationId], (err, resultQuery) => {
                        if (err) {
                          connection.rollback(() => {
                            console.log("Insert Room Error: " + err);
                            flag = false;
                          });
                        } else {
                                // commit the transaction if all queries were successful
                                connection.commit((err) => {
                                  if (err) {
                                    connection.rollback(() => {
                                      console.log("Commit Error: " + err);
                                      flag = false;
                                    });
                                  } else {
                                    console.log("Room successfully inserted!");
                                    flag = true;
                                  }
                                });
                        }
                      });
                    }
                    if(flag) {
                      console.log("Accommodation successfully inserted!");
                      return res.send({ success: true });
                    } else {
                      console.log("Error inserting room.");
                      return res.send({ success: false });
                    }
                  }
                });
          } // else when no errors in beginning transaction
        });
      });
    } // else when there's no duplicate
  }); // end of checkAcc
}; // end of addAccommodation

// This function takes a database connection pool, an accommodation name (unique), and a callback function as inputs. 
// It queries the database to retrieve the accommodation ID for the provided name and passes the result to the callback function. 
// If there is an error in the database query or connection, it logs the error and passes it to the callback function as the first parameter.
function getAccommodationIdByName(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT ACCOMMODATION_ID FROM accommodation WHERE ACCOMMODATION_NAME = ?`;
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
  const {name, newName, newType, newDescription, newAddress, newLocation, newAmenities} = req.body;

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
        FROM accommodation
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
                UPDATE accommodation
                SET
                  ACCOMMODATION_NAME = ?,
                  ACCOMMODATION_TYPE = ?,
                  ACCOMMODATION_DESCRIPTION = ?,
                  ACCOMMODATION_ADDRESS = ?,
                  ACCOMMODATION_LOCATION = ?,
                  ACCOMMODATION_AMENITIES = ?
                WHERE ACCOMMODATION_ID = ?
              `;
              connection.query(updateQuery, [newName, newType, newDescription, newAddress, newLocation, newAmenities, id], (err) => {
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
                UPDATE accommodation
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
        const deleteRoomsQuery = `
        DELETE FROM room
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
          // Delete the accommodation's room first
          connection.query(deleteRoomsQuery, [id], (err, deleteRoomResult) => {
            if (err) {
              connection.rollback(() => {
                console.log("Error deleting accommodation room(s): " + err);
                res.send({success:false});
              });
            } else if (deleteRoomResult.affectedRows > 0 || result.affectedRows == 0) {

              connection.commit((err) => {
                if(err){
                  connection.rollback(() => {
                    console.log("Commit Error: " + err);
                    res.send({success:false});
                  });
                } else {
                  // Delete from favorite table if there's any
                  const deleteFavoriteQuery = `
                    DELETE FROM favorite
                    WHERE ACCOMMODATION_ID = ?;
                  `;
                  connection.query(deleteFavoriteQuery, [id], (err, deleteFavoriteResult) => {
                    if (err) {
                      connection.rollback(() => {
                        console.log("Error deleting accommodation from favorite table: " + err);
                        res.send({success:false});
                      });
                    } else if (deleteFavoriteResult.affectedRows > 0 || deleteFavoriteResult.affectedRows == 0) {
                      connection.commit((err) => {
                        if(err){
                          connection.rollback(() => {
                            console.log("Commit Error: " + err);
                            res.send({success:false});
                          });
                        } else {
                          // Delete from review table if there's any
                          const deleteReviewQuery = `
                            DELETE FROM review
                            WHERE ACCOMMODATION_ID = ?;
                          `;
                          connection.query(deleteReviewQuery, [id], (err, deleteReviewResult) => {
                            if (err) {
                              connection.rollback(() => {
                                console.log("Error deleting accommodation from review table: " + err);
                                res.send({success:false});
                              });
                            } else if (deleteReviewResult.affectedRows > 0 || deleteReviewResult.affectedRows == 0) {
                              connection.commit((err) => {
                                if(err){
                                  connection.rollback(() => {
                                    console.log("Commit Error: " + err);
                                    res.send({success:false});
                                  });
                                } else {
                                  // Delete from picture table if there's any
                                  const deletePictureQuery = `
                                    DELETE FROM picture
                                    WHERE ACCOMMODATION_ID = ?;
                                  `;
                                  connection.query(deletePictureQuery, [id], (err, deletePictureResult) => {
                                    if (err) {
                                      connection.rollback(() => {
                                        console.log("Error deleting accommodation from picture table: " + err);
                                        res.send({success:false});
                                      });
                                    } else if (deletePictureResult.affectedRows > 0 || deletePictureResult.affectedRows == 0) {
                                      connection.commit((err) => {
                                        if(err){
                                          connection.rollback(() => {
                                            console.log("Commit Error: " + err);
                                            res.send({success:false});
                                          });
                                        } else {
                                          // Delete from accommodation table
                                          const deleteAccommodationQuery = `
                                            DELETE FROM accommodation
                                            WHERE ACCOMMODATION_ID = ?;
                                          `;
                                          connection.query(deleteAccommodationQuery, [id], (err, deleteAccommodationResult) => {
                                            if (err) {
                                              connection.rollback(() => {
                                                console.log("Error deleting accommodation: " + err);
                                                res.send({success:false});
                                              });
                                            } else if (deleteAccommodationResult.affectedRows > 0) {
                                              connection.commit((err) => {
                                                if(err){
                                                  connection.rollback(() => {
                                                    console.log("Commit Error: " + err);
                                                    res.send({success:false});
                                                  });
                                                } else {
                                                  console.log("Accommodation deleted successfully!");
                                                  return res.send({success: true});
                                                }
                                              });
                                            } else {
                                              console.log("Accommodation not found! Cannot proceed to deleting...");
                                              return res.send({success: false});
                                            }
                                          });
                                        }
                                      });
                                    } else {
                                      console.log("Accommodation not found! Cannot proceed to deleting...");
                                      return res.send({success: false});
                                    }
                                  });
                                }
                              });
                            } else {
                              console.log("Accommodation not found! Cannot proceed to deleting...");
                              return res.send({success: false});
                            }
                          });
                        }
                      });
                    } else {
                      console.log("Accommodation not found! Cannot proceed to deleting...");
                      return res.send({success: false});
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


// The function takes in a database connection pool object and returns a callback function that filters a room based on the user's search criteria specified in the req.query object.
function filterRooms(pool, priceTo, priceFrom, capacity, callback) {
  const query = `
    SELECT DISTINCT ACCOMMODATION_ID FROM room
    WHERE 
      (ROOM_PRICE <= ? OR ? IS NULL)
      AND (ROOM_PRICE >= ? OR ? IS NULL)
      AND (ROOM_CAPACITY = ? OR ? IS NULL)
  `;
  
  pool.query(query, [priceTo, priceTo, priceFrom, priceFrom, capacity, capacity], (err, results) => {
    if (err) {
      callback(err, null);
    } else {
      const ids = results.map(result => result.ACCOMMODATION_ID);
      callback(null, ids);
    }
  });
}


// The function takes in a database connection pool object and returns a callback function that filters accommodations based on the user's search criteria specified in the req.query object. 
// The function constructs a SQL query using the search criteria and executes it against the database. 
// The results are returned in a JSON object with a success property indicating whether the query was successful and an accommodation property containing the filtered results. 
// The function also logs the filter details and SQL query for debugging purposes.
exports.filterAccommodations = (pool) => (req, res) => {

  const filters = req.body.filters;

  const name = filters.name;
  const address = filters.address;
  const location = filters.location;
  const type = filters.type;
  const priceFrom = filters.priceFrom;
  const priceTo = filters.priceTo;
  const capacity = filters.capacity;

  // Print the filters
  console.log("========== FILTER DETAILS ==========");
  console.log("Name: " + name);
  console.log("Address: " + address);
  console.log("Location: " + location);
  console.log("Type: " + type);
  console.log("Price From: " + priceFrom);
  console.log("Price To: " + priceTo);
  console.log("Capacity: " + capacity);

   // If all filters are undefined, we should return all accommodations
  if (!name && !address && !location && !type && !priceFrom && !priceTo && !capacity) {
    pool.getConnection((err, connection) => {
      if (err) {
        console.log("Error: " + err);
        const empty = []
        return res.send({ message: "No accommodations found...", accommodations: empty });
      } else {
        connection.query('SELECT * FROM accommodation WHERE ACCOMMODATION_ISARCHIVED = false ORDER BY ACCOMMODATION_NAME', (err, results) => {
          if (err) {
            console.log("Error: " + err);
            const empty = []
            return res.send({ message: "No accommodations found...", accommodations: empty });
          } else {
            console.log("Accommodations found: " + results.length);
            return res.send({ message: "Accommodations found!", accommodations: results });
          }
        });
      }
    });

  }    // If the priceFrom, priceTo, or capacity are not empty, we should find the accommodations that match the criteria
  else if(priceFrom || priceTo || capacity){

  // check if there's an accommodation that already has the same name
  filterRooms(pool, priceTo, priceFrom, capacity, (err, ids) => {
    if (err) {
      console.log("Error: " + err);
      const empty = []
      return res.send({ message: "No accommodations found...", accommodations: empty });
    } else {
      // Now that we caught the ids, we can filter the accommodations by their ids and the other filters, namely name, address, location, and/or type

      let query = 'SELECT * FROM accommodation';
      let whereClause = '';

      if (name || address || location || type || ids.length > 0) {
        whereClause += ' WHERE ACCOMMODATION_ISARCHIVED = false AND';

      if (name) {
        whereClause += ` ACCOMMODATION_NAME LIKE '%${name}%' AND`;
      }

      if (address) {
        whereClause += ` ACCOMMODATION_ADDRESS LIKE '%${address}%' AND`;
      }

      if (location) {
        whereClause += ` ACCOMMODATION_LOCATION = '${location}' AND`;
      }

      if (type) {
        whereClause += ` ACCOMMODATION_TYPE = '${type}' AND`;
      }

      if (ids.length > 0) {
        whereClause += ` ACCOMMODATION_ID IN (${ids.join(',')}) AND`;
      }

      // Remove the extra 'AND' at the end of the WHERE clause
      whereClause = whereClause.slice(0, -4);

      query += whereClause;
      
      query += ' ORDER BY ACCOMMODATION_NAME';

        pool.getConnection((err, connection) => {
          if (err) {
            console.log("Error: " + err);
            return res.send({ message: "No accommodations found..." });
          } else {
            connection.query(query, (err, results) => {
              if (err) {
                console.log("Error: " + err);
                return res.send({ message: "No accommodations found..." });
              } else {
                console.log("Accommodations found: " + results.length);
                return res.send({ message: "Accommodations found!", accommodations: results });
              }
            });
          }
        });
      }
    }});
  
  } else {

    let query = 'SELECT * FROM accommodation';

      if (name || address || location || type ) {
        query += ' WHERE ACCOMMODATION_ISARCHIVED = false AND';

        if (name) {
          query += ` ACCOMMODATION_NAME LIKE '%${name}%' AND`;
        }

        if (address) {
          query += ` ACCOMMODATION_ADDRESS LIKE '%${address}%' AND`;
        }
    
        if (location) {
          query += ` ACCOMMODATION_LOCATION = '${location}' AND`;
        }
    
        if (type) {
          query += ` ACCOMMODATION_TYPE = '${type}' AND`;
        }

        // remove the last 'AND' if present
        query = query.replace(/AND\s*$/, '');

        query += ' ORDER BY ACCOMMODATION_NAME';

        pool.getConnection((err, connection) => {
          if (err) {
            console.log("Error: " + err);
                const empty = []
                return res.send({ message: "No accommodations found...", accommodations: empty });
          } else {
            connection.query(query, (err, results) => {
              if (err) {
                console.log("Error: " + err);
                const empty = []
                return res.send({ message: "No accommodations found...", accommodations: empty });
              } else {
                console.log("Accommodations found: " + results.length);
                return res.send({ message: "Accommodations found!", accommodations: results });
              }
            });
          }
        });
      }
  }
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
          
          // Update the picture table
          const insertAccommodationPictureQuery = `INSERT INTO picture (PICTURE_ID, ACCOMMODATION_ID) VALUES ('${accommodationPictureId}', ${accommodationId})`;
          await connection.query(insertAccommodationPictureQuery);
          
          // Return success response
          console.log("Successfully uploaded the accommodation image to cloudinary!");
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

// This is a function that uploads an image to Cloudinary and updates the picture table in
// the SQL database with the user picture ID and user ID. It first extracts the image data from the request body,
// converts the buffer to a base64 data URL, and finds the user ID from the request parameters.
// It then checks if there is a user with the same name and gets the user ID using the getUserIDByName function.
// If there is no error and the user ID is greater than 0, it establishes a connection to the database and uploads the image to Cloudinary using the cloudinary.uploader.upload method.
// It then inserts a new row in the picture table with the user picture ID and user ID using an SQL INSERT statement.
exports.uploadUserPic = (pool) => async (req, res) => {

  // Extract the image data from the request body
  const imageData = req.files.data[0].buffer;

   // Convert the buffer to a base64 data URL
   const mimeType = req.files.data[0].mimetype;
   const imageDataUrl = `data:${mimeType};base64,${imageData.toString('base64')}`;
    
  // Find the accommodation id from the request parameters
  const username = req.body.username;

  // console.log("Data: " + base64Data);
  console.log("Username: " + username);
  
  // get the user id

  User.findBy(pool, "USER_USERNAME", username, (err, user) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (user) {

      console.log("User: " + user.USER_USERNAME); // add this line

      pool.getConnection(async (err, connection) => {
        if (err) {
          console.log("Error: " + err);
          callback(err, null);
        } else {
  
        // Upload the image to Cloudinary
        try {
          const result = await cloudinary.uploader.upload(imageDataUrl, { upload_preset: 'mockup_setup' });
          const userPictureId = result.public_id;
          
          // Update the picture table
          const insertUserPictureQuery = `INSERT INTO picture (PICTURE_ID, USER_ID) VALUES ('${userPictureId}', ${user.USER_ID})`;
          await connection.query(insertUserPictureQuery);
          
          // Return success response
          console.log("Successfully uploaded the user image to cloudinary!");
          return res.send({ success: true });
        } catch (error) {
          console.error(error);
          return res.send({ success: false, message: 'Error uploading image' });
        }
      }
    });
  } else {
    console.log("No user found with username: " + username); // add this line
    console.log("Full upload error");
    return res.send({ success: false });
  }
  });
}

// This is a function that gets the accommodation ID by the accommodation name. After getting the id, it gets the rooms by the accommodation id.
// It first gets the accommodation id from the request parameters and then gets the rooms by the accommodation id using an SQL SELECT statement.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
// If there is no error, it sends a response with a success value of true and the rooms.
// If there is no accommodation found with the accommodationName, it logs the error and sends a response with a success value of false and a message indicating no accommodation found.
exports.getRoomsByAccommodationName = (pool) => (req, res) => {
  // Get the id of the accommodation name
  const accommodationName = req.body.accommodationName;

  var id = null;
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0) {
      id = accommodationId;
      // Get the rooms by the accommodation id
      const query = `SELECT * FROM room WHERE ACCOMMODATION_ID = ${id}`;
      pool.query(query, (err, results) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
        } else {
          return res.send({ success: true, rooms: results });
        }
      });
    } else {
      // No accommodation found with the accommodationName
      console.log("No accommodation found with the name: " + accommodationName);
      return res.send({ success: false });
    }
  });
}

// Function to fetch an accommodation's picture url from Cloudinary using the accommodation name and accessing it using the getAccommodationIdByName function. 
// After getting the id, we look through the picture table for the picture with the same accommodation id and get the picture id and use it to access the image url from Cloudinary.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
// If there is no error, it sends a response with a success value of true and the image url
exports.getAccommodationPic = (pool) => (req, res) => {
  const accommodationName = req.body.accommodationName;

  var id = null;
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0) {
      id = accommodationId;
      // Get the picture id of the accommodation
      const query = `SELECT PICTURE_ID FROM picture WHERE ACCOMMODATION_ID = ${id}`;
      pool.query(query, (err, results) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
        } else if(results.length == 0) {
          // No picture found with the accommodation id
          console.log("No picture found with the accommodation id: " + id);
          return res.send({ success: false });
        }
        else {
          // Get the image url from Cloudinary
          const pictureId = results[0].PICTURE_ID;
          const imageUrl = cloudinary.url(pictureId, { secure: true });
          return res.send({ success: true, imageUrl: imageUrl });
        }
      });
    } else {
      // No accommodation found with the accommodationName
      console.log("No accommodation found with the name: " + accommodationName);
      return res.send({ success: false });
    }
  });
}

// Function to fetch a user's picture url from Cloudinary using the username and accessing it using the User.findBy function.
// After getting the id, we look through the picture table for the picture with the same user id and get the picture id and use it to access the image url from Cloudinary.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
// If there is no error, it sends a response with a success value of true and the image url
exports.getUserPic = (pool) => (req, res) => {
  const username = req.body.username;

  User.findBy(pool, "USER_USERNAME", username, (err, user) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if(user){
      // Get the picture id of the user
      const query = `SELECT PICTURE_ID FROM picture WHERE USER_ID = ${user.USER_ID}`;
      pool.query(query, (err, results) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
        } else {
          // Get the image url from Cloudinary
          const pictureId = results[0].PICTURE_ID;
          const imageUrl = cloudinary.url(pictureId, { secure: true });
          return res.send({ success: true, imageUrl: imageUrl });
        }
      });
    } else {
      // No user found with the username
      console.log("No user found with the username: " + username);
      return res.send({ success: false });
    }
  });
}

// Function to check if a Room Name already exists. Currently not in use
// TODO: Use for adding rooms! It is for checking if a room name already exists for a specific accommodation. To be implemented in the addNewRoom function in the future.
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
// It uses the getAccommodationIdByName to retrieve the Accommodation ID associated with the accomm_name.
// It queries the database to retrieve a Room ID associated with the room name and the accommodation ID in the parameter input.
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

// This function takes a database connection pool, the room name, its capacity, its price, and the accommodation name as inputs.
// It uses the getAccommodationIdByName to retrieve the Accommodation ID associated with the accommodation name.
// It queries the database to insert a new room with the room name, capacity, price, and accommodation ID in the parameter input.
exports.addNewRoom = (pool) => (req, res) => {
  const { name, capacity, price, accommodationName } = req.body;
  var id = null;
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
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
            connection.query(addNewRoomQuery, [name, price, capacity, id], (err) => {
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
                      return res.send({success:false});
                    });
                  } else {
                    console.log("Room successfully inserted!");
                    return res.send({success:true});
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
// The function takes the information in the request body which it will use to identify the Room ID, that is associated with the current room name and accommodation name provided, through the getRoomIDbyName helper function.
// If the room exists, it checks if the updated name already exists within the database.
// If the updated name doesn't exist, the function updates the room's details according to the request body and returns a response indicating the successful update to the client.
// Otherwise, it returns a response indicating the unsuccessful update to the client.
exports.editRoom = (pool) => (req, res) => {
  const {name, newName, newCapacity, newPrice, accommodationName} = req.body;

  // Check if accommodation exists.
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId != "undefined") {

    // Check if the room ID exists.
    var id = null;
    getRoomIDbyName(pool, name, accommodationName, (err, roomID) => {
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
                    ROOM_PRICE = ?
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
  } else {
    console.log("Accommodation not found! Cannot proceed to editing...");
    return res.send({success: false});
  }}); // end of getAccommodationIDByName function
};

// The deleteRoom function takes a database connection pool as input and returns a callback function that handles a POST request for deleting a room.
// The function takes the information in the request body which it will use to identify the Room ID , that is associated with the current room name and accommodation name provided, through the getRoomIDbyName helper function.
// If the room exists, it removes the room from the database and returns a response indicating the successful deletion to the client.
// Otherwise, it returns a response indicating the unsuccessful deletion to the client.
exports.deleteRoom = (pool) => (req, res) => {
  const {name, accommodationName} = req.body;

  // Get the ID of the room if the name exists.
  var id = null;
  getRoomIDbyName(pool, name, accommodationName, (err, roomID) => {
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
// The function takes the information in the request body which it will use to identify the Room ID, that is associated with the current room name and accommodation name provided, through the getRoomIDbyName helper function.
// If the room exists, it updates a detail of the room in the database to classify it as archived and returns a response indicating a successful operation to the client.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.archiveRoom = (pool) => (req, res) => {
  const {name, isArchived, accommodationName } = req.body;

  //Get the ID of the room if the name exists.
  var id = null;
  getRoomIDbyName(pool, name, accommodationName, (err, roomID) => {
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


/*
This function takes a database connection pool, an accommodation name (unique), and a callback function as inputs. 
It queries the database to retrieve the user ID for the provided name and passes the result to the callback function. 
If there is an error in the database query or connection, it logs the error and passes it to the callback function as the first parameter.
*/
function getUserIdByUsername(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT USER_ID FROM user WHERE USER_USERNAME = ?`;
      connection.query(checkQuery, [name], (err, result) => {
        if (err) {
          console.log("Get User Id Error: " + err);
          callback(err, null);
        } else {
          try{
            if(typeof result[0].USER_ID === "undefined") {
              console.log("Get User Id: Undefined Object");
              callback(null, 0);
            }
            else {
              console.log("Get User Id: Defined Object");
              callback(null, result[0].USER_ID);
            }
          } catch (err) {
            console.log("User Not Found...");
            callback(err, null);
          }
          
        }
      });
    }
  });
}

// This is a function that allows the user to leave a rating and review an accomodation.
// It takes a database connection pool as input, along with the rating, comment, username, timestamp and accommodation name.
// It then queries the database to retrieve the user ID and accommodation ID for the provided username and accommodation name.
// If the user ID and accommodation ID are found, it inserts the rating and review into the database.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.addReview = (pool) => (req, res) => {
  const{rating, comment, userName, timestamp, accommName} = req.body;

  console.log("----------Rating and Review----------");
  console.log("Rating: " + rating);
  console.log("Review: " + comment);

  var uid = null;
  var accomid = null;

  getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    }
    else if(userId>0){
      uid = userId;
      getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false });
        }
        else if(accommodationId>0){
          accomid = accommodationId;

          pool.getConnection((err, connection) => {
            if(err){
              console.log("Get Connection Error" + err);
              return res.send({ success: false });
            }

            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({ success: false });
              }
              else{
                const selectQuery = `SELECT COUNT(*) AS count FROM review WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;
                
                connection.query(selectQuery, [uid, accomid], (err, result) => {
                  if(err){
                    console.log("Error: " + err);
                    return res.send({ success: false })
                  }
                  else if(result[0].count>0){
                    console.log("Review from user already exist");
                    return res.send({ success: false })
                  }
                  else{
                    const insertQuery = `INSERT INTO review (REVIEW_RATING, REVIEW_COMMENT, REVIEW_DATE, USER_ID, ACCOMMODATION_ID) VALUES (?, ?, ?, ?, ?)`;

                    connection.query(insertQuery, [rating, comment, timestamp, uid, accomid], (err, result1) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Insert review error: " + err);
                          return res.send({ success: false });
                        })
                      }
                      else{
                        connection.commit((err) => {
                          if(err){
                            connection.rollback(() => {
                              console.log("Commit error: " + err);
                              return res.send({ success: false });
                            })
                          }
                          else{
                            console.log("Review has been inserted!");
                            return res.send({ success: true });
                          }
                        })
                      }
                    })
                  }
                })
              }
            })
          });
        }
        else{
          console.log("Accomodation not found! Cannot add review");
          return res.send({ success: false });
        }
      })
    }
    else{
      console.log("User not found! Cannot add review");
      return res.send({ success: false });
    }
  })
}

/*
This function adds an accomodation to the favorites of the user. It finds the userid by using the username of the user and the accommodation id using the accommodation
name. After getting the connect established after finding the user id and accommodation id, it will then do a select query to see if the favorite already exists. If it
does, it will perform a delete and if it does not exists, it will perform insert instead.
*/
exports.triggerFavorite = (pool) => (req, res) => {
  const {userName, accommName} = req.body;

  console.log("----------Favorite----------");
  console.log("username: " + userName);
  console.log("accommodation name: " + accommName);

  var uId = null;
  var aId = null;

  getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    }
    else if(userId>0){
      uId = userId;

      // Get Accommodation Id
      getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false });
        }
        else if(accommodationId>0){
          aId = accommodationId;

          // Begin Transaction for Favorite (either insert or delete)
          pool.getConnection((err, connection) => {
            if(err){
              console.log("Get Connection Error" + err);
              return res.send({ success: false });
            }
        
            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({ success: false });
              }
              else{
                const selectQuery = `SELECT COUNT(*) AS count FROM favorite WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;
                
                connection.query(selectQuery, [uId, aId], (err, result) => {
                  if(err){
                    console.log("Error: " + err);
                    return res.send({ success: false })
                  }
                  else if(result[0].count>0){
                    //remove the favorite
                    const deleteQuery = `DELETE FROM favorite WHERE USER_ID = '?' AND ACCOMMODATION_ID = '?'`;
        
                    connection.query(deleteQuery, [uId, aId], (err, result) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Insert favorite error: " + err);
                          return res.send({ success: false });
                        })
                      }
                      else{
                        connection.commit((err) => {
                          if(err){
                            connection.rollback(() => {
                              console.log("Commit error: " + err);
                              return res.send({ success: false });
                            })
                          }
                          else{
                            console.log("Favorite has been removed!");
                            return res.send({ success: true });
                          }
                        })
                      }
                    })
                  }
                  else{
                    //insert to favorites
                    const insertQuery = `INSERT INTO favorite (USER_ID, ACCOMMODATION_ID) VALUES (?, ?)`;
        
                    connection.query(insertQuery, [uId, aId], (err, result1) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Insert favorite error: " + err);
                          return res.send({ success: false });
                        })
                      }
                      else{
                        connection.commit((err) => {
                          if(err){
                            connection.rollback(() => {
                              console.log("Commit error: " + err);
                              return res.send({ success: false });
                            })
                          }
                          else{
                            console.log("Favorite has been inserted!");
                            return res.send({ success: true });
                          }
                        })
                      }
                    })
                  }
                })
              }
            })
          });
        }
        else{
          console.log("Accommodation not found! Cannot be added to favorites");
          return res.send({ success: false });
        }
      });

    }
    else{
      console.log("User not found! Cannot be added to favorites");
      return res.send({ success: false });
    }
  });
}

/*
This function lets the user edit the review that they gave to an accommodation. It uses the username, the accomodation name, and the
date timestamp to find the correct review to edit.
*/
exports.editReview = (pool) => (req, res) => {
  const {rating, comment, timestamp, userName, accommName} = req.body;

  console.log("----------Edit Review----------");
  console.log("Rating: " + rating);
  console.log("Comment: " + comment);
  console.log("Date: " + timestamp);
  console.log("Username: " + userName);
  console.log("Accommodation Name: " + accommName);

  var uId = null;
  var aId = null;

  getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    }
    else if(userId>0){
      uId = userId;
      getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false });
        }
        else if(accommodationId>0){
          aId = accommodationId;

          pool.getConnection((err, connection) => {
            if(err){
              console.log("Get Connection Error" + err);
              return res.send({ success: false });
            }

            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({ success: false });
              }
              else{
                const editQuery = `UPDATE review SET REVIEW_RATING = ?, REVIEW_DATE = ?, REVIEW_COMMENT = ? WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;

                connection.query(editQuery, [rating, timestamp, comment, uId, aId], (err, result) => {
                  if(err){
                    connection.rollback(() => {
                      console.log("Edit review error: " + err);
                      return res.send({ success: false });
                    })
                  } // Else if the result is empty, then the review does not exist
                  else if(result.affectedRows === 0){
                    connection.rollback(() => {
                      console.log("Review does not exist");
                      return res.send({ success: false });
                    })
                  }
                  else{
                    connection.commit((err) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Commit error: " + err);
                          return res.send({ success: false });
                        })
                      }
                      else{
                        console.log("Review has been edited");
                        return res.send({ success: true });
                      }
                    })
                  }
                })
              }
            })
          });
        }
        else{
          console.log("Accommodation not found! Cannot edit review");
          return res.send({ success: false });
        }
      })
    }
    else{
      console.log("User not found! Cannot edit review");
      return res.send({ success: false });
    }
  })
}

// This function lets the user delete a review that they gave to an accommodation.
exports.deleteReview = (pool) => (req, res) => {
  const {userName, accommName} = req.body;

  console.log("----------Delete----------");
  console.log("username: " + userName);
  console.log("accommodation name: " + accommName);

  var uId = null;
  var aId = null;

  getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    }
    else if(userId>0){
      uId = userId;
      getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false });
        }
        else if(accommodationId>0){
          aId = accommodationId;

          pool.getConnection((err, connection) => {
            if(err){
              console.log("Get Connection Error" + err);
              return res.send({ success: false });
            }

            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({ success: false });
              }
              else{
                const deleteQuery = `DELETE FROM review WHERE USER_ID = '?' AND ACCOMMODATION_ID = '?'`;

                connection.query(deleteQuery, [uId, aId], (err, result) => {
                  if(err){
                    connection.rollback(() => {
                      console.log("Delete review error: " + err);
                      return res.send({ success: false });
                    })
                  }
                  else if (result.affectedRows == 0){
                    connection.rollback(() => {
                      console.log("Review not found! Cannot be deleted");
                      return res.send({ success: false });
                    });
                  } else {
                    connection.commit((err) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Commit error: " + err);
                          return res.send({ success: false });
                        })
                      }
                      else{
                        console.log("Review has been deleted!");
                        return res.send({ success: true });
                      }
                    })
                  }
                })
              }
            })
          });
        }
        else{
          console.log("Accommodation not found! Review cannot be deleted");
          return res.send({ success: false });
        }
      })
    }
    else{
      console.log("User not found! Review cannot be deleted");
      return res.send({ success: false });
    }
  })
}

/* This code exports a function that retrieves the top 5 featured accommodation based on their
average review rating. It uses a SQL query to join the accommodation and review tables, group the
results by accommodation ID, calculate the average rating, and order the results by the average
rating in descending order. The function takes a database connection pool as a parameter and returns
a middleware function that handles HTTP requests and responses. If there is an error in the database
query, the function returns a response with success set to false. Otherwise, it returns a response
with success set to true and the list of featured accommodation. */
exports.getFeaturedAccommodations = (pool) => (req, res) => {

  // Query that gets the top 5 featured accommodation based on their average review rating
  const query = `
  SELECT a.ACCOMMODATION_ID, a.ACCOMMODATION_NAME, a.ACCOMMODATION_TYPE, a.ACCOMMODATION_DESCRIPTION, a.ACCOMMODATION_AMENITIES, a.ACCOMMODATION_ADDRESS, a.ACCOMMODATION_LOCATION, a.ACCOMMODATION_OWNER_ID, AVG(r.REVIEW_RATING) AS AVERAGE_RATING
  FROM accommodation a
  JOIN review r ON a.ACCOMMODATION_ID = r.ACCOMMODATION_ID
  GROUP BY a.ACCOMMODATION_ID
  ORDER BY AVERAGE_RATING DESC
  LIMIT 5
  `;

  // Printing the query
  console.log("Query: " + query);
  
  pool.query(query, (err, results) => {
    if (err) {
      console.log("Featured Accommodations Error: " + err);
      return res.send({ success: false });
    } else {
      return res.send({ success: true, accommodation: results });
    }
  });
};

/* This code is a function that checks if a given accommodation is favorited by a given user. It
takes in a database connection pool as a parameter and returns a function that handles HTTP
requests. The function extracts the username and accommodation name from the request body, retrieves
the user ID and accommodation ID from the database using helper functions, and then checks if there
is a record in the "favorite" table that matches the user ID and accommodation ID. If there is a
match, it returns a response indicating that the accommodation is favorited by the user, otherwise
it returns a response indicating that it is not */
exports.isAccommodationFavorited = (pool) => (req, res) => {
  const {username, accommodationName} = req.body;

  getUserIdByUsername(pool, username, (err, userId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (userId > 0 && typeof userId !== 'undefined') {
      getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
        } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
          const isFavoriteQuery = `
            SELECT *
            FROM favorite
            WHERE USER_ID = ? AND ACCOMMODATION_ID = ?
          `;
          pool.query(isFavoriteQuery, [userId, accommodationId], (err, result) => {
            if (err) {
              console.log("Error checking if favorite: " + err);
              return res.send({ success: false, isFavorite: false });
            } else {
              return res.send({ success: true, isFavorite: true });
            }
          });
        }
      });
    }
  });
};

/* This code is defining a function that retrieves the reviews of an accommodation from a MySQL
database using a pool connection. The function takes in a pool connection as a parameter and returns
a middleware function that handles a POST request with an accommodation name in the request body.
The function first retrieves the ID of the accommodation using the getAccommodationIdByName
function. If the ID is found, it then executes a SQL query to retrieve all reviews for that
accommodation and sends the results back in the response. If there is an error at any point, the
function sends a response with success set to false. */
exports.getAccommodationReviews = (pool) => (req, res) => {
  const {accommodationName} = req.body;

  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
      const ratingsQuery = `
        SELECT *
        FROM review
        WHERE ACCOMMODATION_ID = ?
      `;
      pool.query(ratingsQuery, [accommodationId], (err, results) => {
        if (err) {
          console.log("Error getting ratings: " + err);
          return res.send({ success: false });
        } else {
          return res.send({ success: true, reviews: results });
        }
      });
    }
  });
}

// This function takes a database connection pool, an accommodation name and gets the average rating for that accommodation.
exports.getAccommodationAverageRating = (pool) => (req, res) => {
  const {accommodationName} = req.body;

  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
      const ratingsQuery = `
        SELECT AVG(REVIEW_RATING) AS AVG_RATING
        FROM review
        WHERE ACCOMMODATION_ID = ?
      `;
      pool.query(ratingsQuery, [accommodationId], (err, results) => {
        if (err) {
          console.log("Error getting ratings: " + err);
          return res.send({ success: false });
        } else {
          console.log("Average Rating of " + accommodationName + ": " + results[0].AVG_RATING);
          return res.send({ success: true, averageRating: results[0].AVG_RATING });
        }
      });
    }
  });
}

// Function to remove the user picture from cloudinary and the mysql database
exports.removeUserPicture = (pool) => (req, res) => {
  // get the username from the request body
  const {username} = req.body;

  // see if the user exists
  getUserIdByUsername(pool, username, (err, userId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } else if (userId > 0 && typeof userId !== 'undefined') {
      // get the user picture id
      const getPictureIdQuery = `
        SELECT PICTURE_ID
        FROM picture
        WHERE USER_ID = ?
      `;
      pool.query(getPictureIdQuery, [userId], (err, results) => {
        if (err) {
          console.log("Error getting picture id: " + err);
          return res.send({ success: false });
        } else {
          // delete the picture from cloudinary
          cloudinary.uploader.destroy(results[0].PICTURE_ID, (err, results) => {
            if (err) {
              console.log("Error deleting picture from cloudinary: " + err);
              return res.send({ success: false });
            } else {
              // update the user picture id in the database to null
              const updatePictureIdQuery = `
                UPDATE picture
                SET PICTURE_ID = NULL
                WHERE USER_ID = ?
              `;
              pool.query(updatePictureIdQuery, [userId], (err, results) => {
                if (err) {
                  console.log("Error updating picture id: " + err);
                  return res.send({ success: false });
                } else {
                  return res.send({ success: true });
                }
              });
            }
          });
        }
      });
    }
  });
}