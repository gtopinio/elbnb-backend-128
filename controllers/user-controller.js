// Imports
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const { User } = require('../models/user');

// Configuration for cloudinary (cloud for uploading unstructured files) 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // ===================================== START OF USER MANAGEMENT FEATURES =====================================

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

// The filterUsersByString function takes in a pool object and processes the request object containing a string that is used to filter users.
// The function uses a LIKE query to determine which rows contain the substring.
// The function also filters by user type, and depending on the value of the boolean "isStudent", the function may return a table of students or owners.
// isStudent is true for students, and is false for owners.
// The function returns a response indicating the success of the query as well as a list of users depending on the filter.
exports.filterUsersByString = (pool) => (req, res) => {
  const {name, isStudent} = req.body;
  const empty=[];
  // Checks if filter is set as empty.
  if (!name){
    pool.getConnection((err, connection) => {
      if(err){
        console.log("Error: " + err);
        return res.send({ success: false, users: empty });
      }else if (isStudent == true){
        connection.query('SELECT * FROM user WHERE USER_TYPE = "Student" ORDER BY USER_ID ASC', (err, results) => {
          if(err){
            console.log("View All Students Error: " + err);
            return res.send({ success: false, users: empty });
          } else {
            console.log("Students found: " + results.length);
            return res.send({ success: true, users: results });
          }
        });
      }else if (isStudent == false){
        connection.query('SELECT * FROM user WHERE USER_TYPE = "Owner" ORDER BY USER_ID ASC', (err, results) => {
          if(err){
            console.log("View All Owners Error: " + err);
            return res.send({ success: false, users: empty });
          } else {
            console.log("Owners found: " + results.length);
            return res.send({ success: true, users: results });
          }
        });
      }else{
        console.log("Error defining user type.");
        return res.send({ success: false});
      }
    }); // end of pool connection for empty filter.
  }else if (name){
    pool.getConnection((err, connection) => {
      if(err){
        console.log("Error: " + err);
        return res.send({ success: false, users: empty });
      }else if (isStudent == true){
        connection.query(`SELECT * FROM user WHERE (USER_FNAME LIKE '%${name}%' OR USER_LNAME LIKE '%${name}%' OR USER_USERNAME LIKE '%${name}%' OR USER_EMAIL LIKE '%${name}%') AND USER_TYPE = 'Student' ORDER BY USER_ID ASC`, (err, results) => {
          if(err){
            console.log("View Students Error: " + err);
            return res.send({ success: false, users: empty });
          } else {
            console.log("Students found: " + results.length);
            return res.send({ success: true, users: results });
          }
        });
      }else if (isStudent == false){
        connection.query(`SELECT * FROM user WHERE (USER_FNAME LIKE '%${name}%' OR USER_LNAME LIKE '%${name}%' OR USER_USERNAME LIKE '%${name}%' OR USER_EMAIL LIKE '%${name}%') AND USER_TYPE = 'Owner' ORDER BY USER_ID ASC`, (err, results) => {
          if(err){
            console.log("View Owners Error: " + err);
            return res.send({ success: false, users: empty });
          } else {
            console.log("Owners found: " + results.length);
            return res.send({ success: true, users: results });
          }
        });
      }else{
        console.log("Error defining user type.");
        return res.send({ success: false, users: empty});
      }
    });
  } else{
    console.log("Error defining string.");
    return res.send({ success: false, users: empty});
  }
}; // end of function.

// The viewAllStudents function takes a database connection pool, and gets all
// entries in the user table whose USER_TYPE is a "Student"
exports.viewAllStudents = (pool) => (req, res) => {
  console.log("Viewing All Students");

  pool.getConnection((err, connection) => {
    if(err){
      console.log("Error: " + err);
      const empty = [];
      return res.send({ success: false, students: empty });
    } else {
      connection.query('SELECT * FROM user WHERE USER_TYPE = "Student"', (err, results) => {
        if(err){
          const empty=[];
          console.log("View All Students Error: " + err);
          return res.send({ success: false, students: empty });
        } else {
          console.log("Students found: " + results.length);
          return res.send({ success: true, students: results });
        }
      });
    }
  });
};

// The viewAllOwners function takes a database connection pool, and gets all
// entries in the user table whose USER_TYPE is a "Owners"
exports.viewAllOwners = (pool) => (req, res) => {
  console.log("Viewing All Owners");

  pool.getConnection((err, connection) => {
    if(err){
      console.log("Error: " + err);
      const empty = [];
      return res.send({ success: false, owners: empty });
    } else {
      connection.query('SELECT * FROM user WHERE USER_TYPE = "Owner"', (err, results) => {
        if(err){
          const empty=[];
          console.log("View All Owners Error: " + err);
          return res.send({ success: false, owners: empty });
        } else {
          console.log("Owners found: " + results.length);
          return res.send({ success: true, owners: results });
        }
      });
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

  // Extract the image data from the request body. But first, check if the request body is empty
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.send({ success: false });
  }

  else {

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

        console.log("User: " + user.USER_USERNAME);
        const userId = user.USER_ID;

        pool.getConnection(async (err, connection) => {
          if (err) {
            console.log("Error: " + err);
            callback(err, null);
          } else {
    
          // check if user already has a picture
          connection.query(`SELECT * FROM picture WHERE USER_ID = ${user.USER_ID}`, async (err, results) => {
            if (err) {
              console.log("Error: " + err);
              return res.send({ success: false });
            } else if (results.length > 0) {
              console.log("User already has a picture. Updating picture...");
                // delete the picture from cloudinary
              cloudinary.uploader.destroy(results[0].PICTURE_ID, (err, results) => {
                if (err) {
                  console.log("Error deleting picture from cloudinary: " + err);
                  return res.send({ success: false });
                } else {
                  // upload the new picture to cloudinary
                  cloudinary.uploader.upload(imageDataUrl, { upload_preset: 'mockup_setup' }, (err, results) => {
                    if (err) {
                      console.log("Error uploading picture to cloudinary: " + err);
                      return res.send({ success: false });
                    } else {
                      // update the user picture id in the database
                      const updatePictureIdQuery = `
                        UPDATE picture
                        SET PICTURE_ID = ?
                        WHERE USER_ID = ?
                      `;
                      pool.query(updatePictureIdQuery, [results.public_id, userId], (err, results) => {
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
            } else {
              console.log("User does not have a picture");
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
          }
        )}
      });
    } else {
      console.log("No user found with username: " + username); // add this line
      console.log("Full upload error");
      return res.send({ success: false });
    }
    });
  } // end of else
};

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
        } else if (results.length === 0){
          console.log("No user image found!");
          return res.send({ success: false });
        } else {
            const imageId = results[0].PICTURE_ID;
            const imageUrl = cloudinary.url(imageId, {secure: true});
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

// Function to remove the user picture from cloudinary and the mysql database
exports.removeUserPicture = (pool) => (req, res) => {
  // get the username from the request body
  const {username} = req.body;

  // see if the user exists
  User.findBy(pool, "USER_USERNAME", username, (err, user) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
    } // check if the user exists
    else if (user) {
      // get the user picture id
      const getPictureIdQuery = `
        SELECT PICTURE_ID
        FROM picture
        WHERE USER_ID = ?
      `;
      const userId = user.USER_ID;
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
              // delete the user picture from the database
              const deletePictureQuery = `
                DELETE FROM picture
                WHERE USER_ID = ?
              `;
              pool.query(deletePictureQuery, [userId, userId], (err, results) => {
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

// ===================================== END OF USER MANAGEMENT FEATURES =====================================
  