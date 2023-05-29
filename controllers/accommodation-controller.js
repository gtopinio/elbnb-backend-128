// Imports
const cloudinary = require('cloudinary').v2;
const { Accommodation: AccommodationController_Accommodation } = require('../models/accommodation');

// Configuration for cloudinary (cloud for uploading unstructured files) 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });


// ===================================== START OF ACCOMMODATION MANAGEMENT FEATURES =====================================
  
// This function is used to add a new accommodation to the database. 
// It takes in a pool object as input, which is used to establish a database connection. 
// The function then reads the details of the new accommodation from the request body, including its name, type, description, amenities, location, address, and rooms (an array of rooms). 
// If an accommodation with the same name already exists in the database, the function returns a JSON object indicating failure. 
// Otherwise, the function begins a transaction and inserts the new accommodation into the accommodation table, along with its rooms. 
// If everything is successful, the function returns a JSON object indicating success.
exports.addAccommodation = (pool) => (req, res) => {

  const { name, type, address, location, description, amenities, userId} = req.body;

  // Printing the details of the accommodation query
  console.log("========== ADD ACCOMMODATION DETAILS ==========")
  console.log("Name: " + name);
  console.log("Type: " + type);
  console.log("Description: " + description);
  console.log("Location: " + location);
  console.log("Owner ID: " + userId);

  // check if there's an accommodation that already has the same name
  AccommodationController_Accommodation.checkAccommDup(pool, name, (err, hasDup) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false , message: "Error in checking accommodation duplicate."});
    } else if (hasDup) {
      console.log("Duplicate accommodation.");
      return res.send({ success: false , message: "Duplicate accommodation."});
    } else {

      // get pool connection
      pool.getConnection((err, connection) => {
        if (err) {
          console.log("Get Connection Error: " + err);
          return res.send({ success:false , message: "Error in getting connection."});
        }
        // begin transaction
        connection.beginTransaction((err) => {
          if (err) {
            console.log("Begin Transaction Error: " + err);
            return res.send({ success:false , message: "Error in beginning transaction."});
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
                  res.send({ success:false , message: "Error in inserting accommodation."});
                });
              } else { // Successful insertion of accommodation
                // Commit the transaction
                  connection.commit((err) => {
                    if (err) {
                      connection.rollback(() => {
                        console.log("Commit Error: " + err);
                      });
                    }
                    // return a JSON object indicating success
                    else{
                      console.log("Accommodation successfully added!");
                      return res.send({ success: true });
                    }   
                  });
                  }
                });
          } // else when no errors in beginning transaction
        });
      });
    } // else when there's no duplicate
  }); // end of checkAccomDupe
}; // end of addAccommodation

// This function is used to query all of the accommodations by a single owner. It takes the ownerName from the request body, then checks first if the owner exists in the database.
// If the owner is not found or there are errors in connecting to the database, the response will return a JSON object indicating failure.
// If the owner is found, it will return all of accommodations created by the owner with the given owner username.
exports.getAccommodationsByOwner = (pool) => (req, res) => {
  const ownerName = req.body.ownerName;

  console.log("========== GET ACCOMMODATIONS BY OWNER ==========");

  pool.getConnection((err, connection) => {
    if (err) {
      // If error is found in connecting to DB
      console.log("Error: " + err);
      return res.send({ success: false , message: "Error in getting connection."});
    } else {
      // Checking first if User is an existing Owner
      connection.query(`SELECT USER_ID FROM user WHERE USER_USERNAME = ? AND USER_TYPE = "Owner"`, [ownerName], (err, result) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false , message: "Error in getting connection."});
        } else {
          if (result.length == 0) {
            console.log("No such Owner found");
            return res.send({ success: false , message: "No such Owner found."});
          } else {
            // Query accommodations WHERE Owner.ID = Accomodations.OWNER_ID
            const userID = JSON.parse(JSON.stringify(result[0].USER_ID));
            connection.query(`SELECT * FROM accommodation WHERE ACCOMMODATION_OWNER_ID = ?`, [userID], (err, accoms) => {
              if (err) {
                console.log("Error: " + err);
                return res.send({ success: false , message: "Error in getting connection."});
              } else {
                if (accoms.length == 0) {
                  console.log("No accommodations found");
                  return res.send({ success: false , message: "No accommodations found."});
                } else {
                  console.log("Found " + accoms.length + " accommodations for user " + ownerName);
                  return res.send({ success: true, result: accoms });
                }
              }
            }) 
          }
        }
      });
    }
  });
};

// The editAccommodation function takes a MySQL connection pool as input and returns a callback function that handles an POST request for editing an accommodation. 
// The function first extracts the updated accommodation details from the request body. It then tries to retrieve the ID of the accommodation to be updated by its name. 
// If the accommodation exists, it checks if the updated name already exists for another accommodation. 
// If the updated name is unique, the function updates the accommodation details in the database using a transaction to ensure data consistency. 
// The output of the function is a response object sent back to the client indicating whether the update was successful or not.
exports.editAccommodation = (pool) => (req, res) => {
  const {name, newName, newType, newDescription, newAddress, newLocation, newAmenities} = req.body;

  console.log("========== EDIT ACCOMMODATION DETAILS ==========");
  console.log("Name: " + name);
  console.log("New Name: " + newName);
  console.log("New Type: " + newType);
  console.log("New Description: " + newDescription);
  console.log("New Address: " + newAddress);
  console.log("New Location: " + newLocation);
  console.log("New Amenities: " + newAmenities);

  // Try to get the id first if accommodation exists
  // check if there's an accommodation that has the same name
  var id = null;
  AccommodationController_Accommodation.getAccommodationIdByName(pool, name, (err, accommodationId) => {
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
// It uses the AccommodationController_Accommodation.getAccommodationIdByName helper function to get the ID of the specified accommodation, and then archives or unarchives it using a SQL UPDATE query. 
// If the query is successful, it sends a response with a boolean value of true, indicating that the accommodation has been successfully archived or unarchived. 
// If any errors occur during the process, it sends a response with a boolean value of false, and logs the error to the console.
exports.archiveAccommodation = (pool) => (req, res) => {
  const {name, isArchived } = req.body;

  console.log("========== ARCHIVE ACCOMMODATION DETAILS ==========");
  console.log("Name: " + name);
  console.log("Is Archived: " + isArchived);

  // Try to get the id first if accommodation exists using the name
  var id = null;
  AccommodationController_Accommodation.getAccommodationIdByName(pool, name, (err, accommodationId) => {
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
  console.log("========== DELETE ACCOMMODATION DETAILS ==========");
  console.log("Name: " + name);

  // Try to get the id first if accommodation exists
  // check if there's an accommodation that has the same name
  var id = null;
  AccommodationController_Accommodation.getAccommodationIdByName(pool, name, (err, accommodationId) => {
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
            } else if (deleteRoomResult.affectedRows > 0 || deleteRoomResult.affectedRows == 0) {

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

/*
This function retrieves information about an accommodation using the connection pool
*/
exports.viewAccommodation = (pool) => (req, res) => {
  const {accommodationName} =  req.body;

  console.log("========== VIEW ACCOMMODATION DETAILS ==========");
  console.log("Name: " + accommodationName);

  var accomid = null;

  AccommodationController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) =>{
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    }
    else if(accommodationId>0){
      accomid = accommodationId;

      pool.getConnection((err, connection) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false });
        }
        else{
          const selectQuery = `SELECT * FROM accommodation WHERE ACCOMMODATION_ID = ?`;

          connection.query(selectQuery, [accomid], (err, result1) => {
            if(err){
              connection.rollback(() => {
                console.log("Select accommodation error: " + err);
                return res.send({ success: false });
              })
            }
            else{
              console.log("Select accommodation successful");
              return res.send({ success: true, accommodation: result1});
            }
          })
        }
      })
    }
    else{
      console.log("Accomodation not found! Cannot select an accommodation");
      return res.send({ success: false });
    }
  })
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
    const owner = filters.ownerUsername;
    const rating = filters.rating;
    const maxPrice = filters.maxPrice;
    const capacity = filters.capacity;

    console.log("========== FILTER ACCOMMODATIONS ==========");
    console.log("Name: " + name);
    console.log("Address: " + address);
    console.log("Location: " + location);
    console.log("Type: " + type);
    console.log("Owner: " + owner);
    console.log("Rating: " + rating);
    console.log("Max Price: " + maxPrice);
    console.log("Capacity: " + capacity);

  
    // Building the query
    let query = 'SELECT accommodation.*, MAX(room.ROOM_PRICE) AS max_price, user.USER_USERNAME, AVG(review.REVIEW_RATING) AS rating, MIN(room.ROOM_CAPACITY) AS min_capacity, MAX(room.ROOM_CAPACITY) as max_capacity ' +
                'FROM user INNER JOIN accommodation ON user.USER_ID = accommodation.ACCOMMODATION_OWNER_ID ' + 
                'INNER JOIN review ON accommodation.ACCOMMODATION_ID = review.ACCOMMODATION_ID ' +
                'LEFT JOIN room ON accommodation.ACCOMMODATION_ID = room.ACCOMMODATION_ID ' + 
                'WHERE accommodation.ACCOMMODATION_ISARCHIVED = false AND room.ROOM_ISARCHIVED = false AND '

    if (name) {
      query += `accommodation.ACCOMMODATION_NAME LIKE '%${name}%' AND `
    }
    if (address) {
      query += `accommodation.ACCOMMODATION_ADDRESS LIKE '%${address}%' AND `
    }
    if (location) {
      query += `accommodation.ACCOMMODATION_LOCATION = '${location}' AND `
    }
    if (type) {
      query += `accommodation.ACCOMMODATION_TYPE = '${type}' AND `
    }
    if (owner) {
      query += `user.USER_USERNAME = '${owner}' AND `
    }
    query = query.slice(0, -4);
    query += 'GROUP BY accommodation.ACCOMMODATION_ID '
    if (rating || maxPrice || capacity) {
      query += 'HAVING '
      if (rating) {
        query += `AVG(review.REVIEW_RATING) >= '${rating}' AND `
      }
      if (maxPrice) {
        query += `MAX(room.ROOM_PRICE) <= ${maxPrice} AND `
      }
      if (capacity) {
        query += `(MAX(room.ROOM_CAPACITY) = ${capacity} OR MIN(room.ROOM_CAPACITY) = ${capacity}) AND `
      }
      query = query.slice(0, -4);
    }
    query += 'ORDER BY accommodation.ACCOMMODATION_NAME'
    
    // Querying
    pool.getConnection((err, connection) => {
      if (err) {
        // If error is encountered
        console.log("Error: " + err);
        return res.send({ success: false });
      } else {
        // Else, start connection
        connection.query(query, (err, results) => {
          if (err) {
            console.log("Error: " + err) 
            return res.send({ success: false });
          } else {
            // Printing the results of the query in numbered list
            console.log("========== FOUND ACCOMMODATIONS ==========");
            for (let i = 0; i < results.length; i++) {
              console.log(i + 1 + ". " + results[i].ACCOMMODATION_NAME);
            }
            return res.send({ message: "Accommodations found!", accommodations: results });
          }
        })
      }
    })
};

// This is a function that uploads/updates an image to Cloudinary and updates the accommodation_pictures table in 
// a database with the accommodation picture ID and accommodation ID. It first extracts the image data from the request body, 
// converts the buffer to a base64 data URL, and finds the accommodation ID from the request parameters. 
// It then checks if there is an accommodation with the same name and gets the accommodation ID using the AccommodationController_Accommodation.getAccommodationIdByName function.
// If there is no error and the accommodation ID is greater than 0, it establishes a connection to the database and uploads the image to Cloudinary using the cloudinary.uploader.upload method. 
// It then inserts a new row in the accommodation_pictures table with the accommodation picture ID and accommodation ID using an SQL INSERT statement.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
exports.uploadAccommodationPic = (pool) => async (req, res) => {

  console.log("========== UPLOAD ACCOMMODATION PICTURE ==========");
  console.log("Accommodation Name: " + req.body.accommodationName);

  // Extract the image data from the request body. But first, check if the request body is empty
  if (!req.files || Object.keys(req.files).length === 0) {
    console.log("No files were uploaded.");
    return res.send({ success: false , message: "No files were uploaded."});
  } else {

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
    AccommodationController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
      if (err) {
        console.log("Error: " + err);
        return res.send({ success: false , message: "Error occurred while uploading the picture."});
      } else if (accommodationId > 0) {

        pool.getConnection(async (err, connection) => {
          if (err) {
            console.log("Error: " + err);
            callback(err, null);
          } else {
            // check if the accommodation has a picture
            connection.query(`SELECT * FROM picture WHERE ACCOMMODATION_ID = ${accommodationId}`, async (err, results) => {
              if (err) {
                console.log("Error: " + err);
                return res.send({ success: false , message: "Error occurred while uploading the picture."});
              } else if (results.length > 0) {
                console.log("Accommodation already has a picture. Updating the picture...");
                // Update the picture in Cloudinary
                try {
                  const result = await cloudinary.uploader.upload(imageDataUrl, { public_id: results[0].PICTURE_ID, overwrite: true });
                  const accommodationPictureId = result.public_id;
                  
                  // Update the picture table
                  const updateAccommodationPictureQuery = `UPDATE picture SET PICTURE_ID = '${accommodationPictureId}' WHERE ACCOMMODATION_ID = ${accommodationId}`;
                  await connection.query(updateAccommodationPictureQuery);
                  
                  // Return success response
                  console.log("Successfully updated the accommodation image in cloudinary!");
                  return res.send({ success: true });
                } catch (error) {
                  console.error(error);
                  return res.send({ success: false , message: "Error occurred while uploading the picture."});
                }
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
                    return res.send({ success: false, message: "Error uploading image" });
                  }
              }
            }
        );}
      });
    } else {
      console.log("No accommodation found with the name: " + accommodationName);
      return res.send({ success: false , message: "No accommodation found with the name: " + accommodationName});
    }
    });
  }
}

// Function to fetch an accommodation's picture url from Cloudinary using the accommodation name and accessing it using the AccommodationController_Accommodation.getAccommodationIdByName function. 
// After getting the id, we look through the picture table for the picture with the same accommodation id and get the picture id and use it to access the image url from Cloudinary.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
// If there is no error, it sends a response with a success value of true and the image url
exports.getAccommodationPic = (pool) => (req, res) => {
  const accommodationName = req.body.accommodationName;

  console.log("========== GET ACCOMMODATION PICTURE ==========");
  console.log("Accommodation Name: " + accommodationName);

  var id = null;
  AccommodationController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false, message: "Error occurred while fetching the picture." });
    } else if (accommodationId > 0) {
      id = accommodationId;
      // Get the picture id of the accommodation
      const query = `SELECT PICTURE_ID FROM picture WHERE ACCOMMODATION_ID = ${id}`;
      pool.query(query, (err, results) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false , message: "Error occurred while fetching the picture."});
        } else if (results.length === 0){
          console.log("No accommodation image found!");
          return res.send({ success: false , message: "No accommodation image found!"});
        } else {
            const imageId = results[0].PICTURE_ID;
            const imageUrl = cloudinary.url(imageId, {secure: true});
            return res.send({ success: true, imageUrl: imageUrl });
        
      }
      });
    } else {
      // No accommodation found with the accommodationName
      console.log("No accommodation found with the name: " + accommodationName);
      return res.send({ success: false , message: "No accommodation found with the name: " + accommodationName});
    }
  });
}

// Function to remove an accommodation picture from cloudinary and the mysql database
exports.removeAccommodationPicture = (pool) => (req, res) => {
  // get the accommodation name from the request body
  const {accommodationName} = req.body;

  console.log("========== REMOVE ACCOMMODATION PICTURE ==========");
  console.log("Accommodation Name: " + accommodationName);

  // see if the accommodation exists
  AccommodationController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false , message: "Error occurred while deleting the picture."});
    } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
      // get the accommodation picture id
      const getPictureIdQuery = `
        SELECT PICTURE_ID
        FROM picture
        WHERE ACCOMMODATION_ID = ?
      `;
      pool.query(getPictureIdQuery, [accommodationId], (err, results) => {
        if (err) {
          console.log("Error getting picture id: " + err);
          return res.send({ success: false , message: "Error occurred while deleting the picture."});
        } 
        // check if the accommodation has a picture
        else if (results.length === 0) {
          console.log("Accommodation does not have a picture.");
          return res.send({ success: false , message: "Accommodation does not have a picture."});
        }
        else {
          // delete the picture from cloudinary
          cloudinary.uploader.destroy(results[0].PICTURE_ID, (err, results) => {
            if (err) {
              console.log("Error deleting picture from cloudinary: " + err);
              return res.send({ success: false });
            } else {
              // delete the picture from the database
              const deletePictureQuery = `
                DELETE FROM picture
                WHERE ACCOMMODATION_ID = ?
              `;
              pool.query(deletePictureQuery, [accommodationId, accommodationId], (err, results) => {
                if (err) {
                  console.log("Error deleting picture id: " + err);
                  return res.send({ success: false , message: "Error occurred while deleting the picture."});
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

// ===================================== END OF ACCOMMODATION MANAGEMENT FEATURES =====================================