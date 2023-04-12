// Imports
const jwt = require("jsonwebtoken");
const cloudinary = require('cloudinary').v2;
const Magic = require('mmmagic').Magic;
const User = require('./models/user');

const magic = new Magic();

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

// exports.getAccommodationIdByName = (pool) => (req, res) => {
//   const name = req.body.accommodationName;
//   // print out name of listing
//   console.log("Accommodation Name: "+ name);
//   // get pool connection
//   pool.getConnection((err, connection) => {
//     if(err) {
//       console.log("Get Connection Error: " + err);
//       return res.send({success:false});
//     }

//     const query = `
//       SELECT ACCOMMODATION_ID
//       FROM accommodations
//       WHERE ACCOMMODATION_NAME = ?
//     `;

//     connection.query(query, [name], (err, result) => {
//       if (err) {
//         console.log("Query Error: " + err);
//         return res.send({ success: false });
//       }

//       if (result.length > 0) {
//         const accommodationId = result[0].ACCOMMODATION_ID;
//         return res.send({ success: true, accommodationId: accommodationId });
//       } else {
//         console.log("Accommodation not found.");
//         return res.send({ success: false });
//       }
//     });
//   });
// };


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

exports.uploadAccommodationPic = (pool) => async (req, res) => {

  console.log(req.files);
  // Extract the image data from the request body
  const imageData = req.files.data[0].buffer;

  const file = imageData;
  magic.detectFile(file.path, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error detecting file type');
    }
    console.log(result); // this will print the detected file type
  });

  // console.log("Image data: " + imageData);
    
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
          const result = await cloudinary.uploader.upload(imageData, { upload_preset: 'mockup_setup' });
          const accommodationPictureId = result.public_id;
          
          // Update the accommodation_pictures table
          const insertAccommodationPictureQuery = `INSERT INTO accommodation_pictures (ACCOMMODATION_PICTURE_ID, ACCOMMODATION_ID) VALUES ('${accommodationPictureId}', ${accommodationId})`;
          await connection.query(insertAccommodationPictureQuery);
          
          // Return success response
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


// exports.addAccommodationPictures = (pool) => (req, res) => {
//   console.log(req.file);

//   const picturePath = req.file.path;

//   // Get the accommodation ID using the getAccommodationIdByName function
//   const getAccommodationId = exports.getAccommodationIdByName(pool);
//   getAccommodationId({ body: { accommodationName: req.body.accommodationName } }, (err, result) => {
//     if (err) {
//       console.error('Error getting accommodation ID:', err);
//       return res.send({ uploadStatus: false });
//     }

//     const accommodationId = result.accommodationId;

//     // get pool connection first
//     pool.getConnection((err, connection) => {
//       if (err) return res.send({ uploadStatus: false });

//       // Insert the picture path and the corresponding accommodation ID into the `accommodation_pictures` table
//       const query = `
//         INSERT INTO accommodation_pictures
//           (ACCOMMODATION_PICTURE_ID, ACCOMMODATION_ID)
//         VALUES
//           (?, ?)
//       `;
//       const pictureId = `${accommodationId}-${Date.now()}`;
//       connection.query(query, [pictureId, accommodationId], (err) => {
//         if (err) {
//           console.error('Error inserting picture into accommodation_pictures table:', err);
//           return res.send({ uploadStatus: false });
//         } else {
//           console.log(`Picture uploaded for accommodation ID ${accommodationId}: ${picturePath}`);
//           return res.send({ uploadStatus: true });
//         }
//       });
//     });
//   });
// };
