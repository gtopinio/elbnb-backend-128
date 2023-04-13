// Imports
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const { Admin, Owner, Student } = require('./models/user');
const { Console } = require("console");

// Configuration 
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

// User Management Edpoitns
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
            let user;
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
          console.log("ID: " + result.ACCOMMODATION_ID);
          admin = result;
        }
      });

      Admin.comparePassword(password, admin.password, (error, isMatch) => {
        if (error) {
          console.log(error);
          return res.send({ success: false });
        }
        if (!isMatch) {
          console.log("Incorrect password");
          return res.send({ success: false });
        }
        const tokenPayload = {
            user_id: admin.id,
            user_type: "admin"
        }
        const token = jwt.sign(tokenPayload, "THIS_IS_A_SECRET_STRING");
        console.log("Successfully logged in as admin");
        return res.send({
          success: true,
          authToken: token,
          userId: admin.id,
          fname: admin.fname,
          lname: admin.lname,
          email: email
        });
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
          Admin.findBy(connection, "OWNER_EMAIL", email, (err, result) => {
            if(err){
              console.log(err);
              return res.send({success: false});
            }
            if(typeof result === "undefined"){
              console.log("User does not exist.");
            } else {// user exists
              owner = result;
            }
          });
          Owner.comparePassword(password, owner.password, (error, isMatch) => {
            if (error) {
              console.log(error);
              return res.send({ success: false });
            }
            if (!isMatch) {
              console.log("Incorrect password");
              return res.send({ success: false });
            }
            const tokenPayload = {
                user_id: owner.id,
                user_type: "owner"
            }
            const token = jwt.sign(tokenPayload, "THIS_IS_A_SECRET_STRING");
            console.log("Successfully logged in as owner");
            return res.send({
              success: true,
              authToken: token,
              userId: owner.id,
              fname: owner.fname,
              lname: owner.lname,
              email: email
            });
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
              Admin.findBy(connection, "STUDENT_EMAIL", email, (err, result) => {
                if(err){
                  console.log(err);
                  return res.send({success: false});
                }
                if(typeof result === "undefined"){
                  console.log("User does not exist.");
                } else {// user exists
                  student = result;
                }
              });
              Student.comparePassword(password, student.password, (error, isMatch) => {
                if (error) {
                  console.log(error);
                  return res.send({ success: false });
                }
                if (!isMatch) {
                  console.log("Incorrect password");
                  return res.send({ success: false });
                }
                const tokenPayload = {
                    user_id: student.id,
                    user_type: "student"
                }
                const token = jwt.sign(tokenPayload, "THIS_IS_A_SECRET_STRING");
                console.log("Successfully logged in as student");
                return res.send({
                  success: true,
                  authToken: token,
                  userId: student.id,
                  fname: student.fname,
                  lname: student.lname,
                  email: email
                });
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

function checkAccommDup(pool, name, callback) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT ACCOMMODATION_ID FROM accommodations WHERE ACCOMMODATION_NAME = ?`;
      connection.query(checkQuery, [name], (err, result) => {
        if (err) {
          console.log("Error: " + err);
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
          console.log("Error: " + err);
          callback(err, null);
        } else {
          console.log("Result from get accomm id: " + result);
          callback(null, result[0].ACCOMMODATION_ID);
        }
      });
    }
  });
}

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