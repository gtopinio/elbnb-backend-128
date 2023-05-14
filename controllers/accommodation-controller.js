const { get } = require('needle');

// Imports
const cloudinary = require('cloudinary').v2;

// Configuration for cloudinary (cloud for uploading unstructured files) 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });


// ===================================== START OF ACCOMMODATION MANAGEMENT FEATURES =====================================

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

function getOwnerIdByUsername(pool, uname, callback) {
  console.log("Getting Owner Id: " + uname);
  pool.getConnection((err, connection) => {
    if (err) {
      console.log("Error: " + err);
      callback(err, null);
    } else {
      const checkQuery = `SELECT USER_ID FROM user WHERE USER_TYPE = 'Owner' AND USER_USERNAME = ?`;
      connection.query(checkQuery, [uname], (err, results) => {
        if (err) {
          console.log("Get Owner Id Error: " + err);
          callback(err, null);
        } else if (results.length > 0) {
          console.log("Owner Found...");
          callback(null, results[0].USER_ID);
        } else {
          console.log("Owner Not Found...");
          callback(null, null);
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

  const { name, type, address, location, description, amenities, userId} = req.body;

  // Printing the details of the accommodation query
  console.log("========== ACCOMMODATION DETAILS ==========")
  console.log("Name: " + name);
  console.log("Type: " + type);
  console.log("Description: " + description);
  console.log("Location: " + location);
  console.log("Owner ID: " + userId);

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

  var accomid = null;

  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) =>{
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

// The function takes in a database connection pool object and returns a callback function that filters a room based on the user's search criteria specified in the req.query object.
function filterRooms(pool, maxPrice, capacity, callback) {
  const query = `
    SELECT DISTINCT ACCOMMODATION_ID FROM room
    WHERE 
      (ROOM_PRICE <= ? OR ? IS NULL)
      AND (ROOM_CAPACITY = ? OR ? IS NULL)
  `;
  
  pool.query(query, [maxPrice, maxPrice, capacity, capacity], (err, results) => {
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
  const owner = filters.ownerUsername;
  const rating = filters.rating;
  const maxPrice = filters.maxPrice;
  //const priceTo = filters.priceTo;
  const capacity = filters.capacity;

  // Print the filters
  console.log("========== FILTER DETAILS ==========");
  console.log("Name: " + name);
  console.log("Address: " + address);
  console.log("Location: " + location);
  console.log("Type: " + type);
  console.log("Owner: " + owner);
  console.log("Rating: " + rating);
  console.log("Max Price: " + maxPrice);
  // console.log("Price To: " + priceTo);
  console.log("Capacity: " + capacity);

    // If all filters are undefined, we should return all accommodations
  if (!name && !address && !location && !type && !owner && !maxPrice && !capacity) {
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

  }
  else if((maxPrice || capacity) && (owner !== "" && owner !== undefined)){
    console.log("Filtering accommodations...Block 1");
        // see if owner name exists in database
        getOwnerIdByUsername(pool, owner, (err, ownerId) => {
          if(err){
            console.log("Error: " + err);
            return res.send({ success: false });
          } // else if owner does not exist
          else if(ownerId <= 0 || ownerId == null || typeof ownerId === "undefined"){
            const empty = []
            console.log("Owner does not exist! Cannot proceed to filtering...");
            return res.send({ message: "No accommodations found...", accommodations: empty });
          } // else if owner exists
          else {
            // filter using the max price and capacity first
            filterRooms(pool, maxPrice, capacity, (err, roomIds) => {
              if(err) {
                console.log("Error: " + err);
                const empty = []
                return res.send({ message: "No accommodations found...", accommodations: empty });
              } // if ids is empty, no rooms were found
              else if(roomIds.length == 0) {
                console.log("No rooms found! Cannot proceed to filtering...");
                return res.send({ message: "No accommodations found...", accommodations: empty });
              } // if ids is not empty, rooms were found
              else {
                // Now that we caught the ids, we can filter the accommodations by their ids and the other filters, namely name, address, location, and/or type
  
                let query = 'SELECT * FROM accommodation';
                let whereClause = '';
  
                if (name || address || location || type || roomIds.length > 0 || ownerId !== null) {
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
  
                if (roomIds.length > 0) {
                  whereClause += ` ACCOMMODATION_ID IN (${roomIds.join(',')}) AND`;
                }
  
                if(ownerId){
                  whereClause += ` ACCOMMODATION_OWNER_ID = '${ownerId}' AND`;
                }

                if(rating){
                  whereClause += ` ACCOMMODATION_ID IN (SELECT a.ACCOMMODATION_ID FROM (SELECT ACCOMMODATION_ID, AVG(REVIEW_RATING) avg FROM review ) a WHERE a.avg >= '${rating}') AND`
                }
  
                      // Remove the extra 'AND' at the end of the WHERE clause
                whereClause = whereClause.slice(0, -4);
  
                query += whereClause;
                
                query += ' ORDER BY ACCOMMODATION_NAME';
                console.log("Query: " + query);
  
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
              }
            });
          }
      });
  } else if ((maxPrice || capacity) && (owner === "" && owner === undefined)){
    console.log("Filtering accommodations...Block 2");
        // filter using the max price and capacity first
        filterRooms(pool, maxPrice, capacity, (err, roomIds) => {
          if(err) {
            console.log("Error: " + err);
            const empty = []
            return res.send({ message: "No accommodations found...", accommodations: empty });
          } // if ids is empty, no rooms were found
          else if(roomIds.length == 0) {
            console.log("No rooms found! Cannot proceed to filtering...");
            return res.send({ message: "No accommodations found...", accommodations: empty });
          } // if ids is not empty, rooms were found
          else {
            // Now that we caught the ids, we can filter the accommodations by their ids and the other filters, namely name, address, location, and/or type

            let query = 'SELECT * FROM accommodation';
            let whereClause = '';

            if (name || address || location || type || roomIds.length > 0) {
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

            if (roomIds.length > 0) {
              whereClause += ` ACCOMMODATION_ID IN (${roomIds.join(',')}) AND`;
            }

            if(rating){
              whereClause += ` ACCOMMODATION_ID IN (SELECT a.ACCOMMODATION_ID FROM (SELECT ACCOMMODATION_ID, AVG(REVIEW_RATING) avg FROM review ) a WHERE a.avg >= '${rating}') AND`
            }

                  // Remove the extra 'AND' at the end of the WHERE clause
            whereClause = whereClause.slice(0, -4);

            query += whereClause;
            
            query += ' ORDER BY ACCOMMODATION_NAME';
            console.log("Query: " + query);

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
          }
        });
  } else {
    console.log("Filtering accommodations...Block 3");
      let query = 'SELECT * FROM accommodation';
      let whereClause = '';

      if (name || address || location || type) {
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

      if(rating){
        whereClause += ` ACCOMMODATION_ID IN (SELECT a.ACCOMMODATION_ID FROM (SELECT ACCOMMODATION_ID, AVG(REVIEW_RATING) avg FROM review ) a WHERE a.avg >= '${rating}') AND`
      }

            // Remove the extra 'AND' at the end of the WHERE clause
      whereClause = whereClause.slice(0, -4);

      query += whereClause;
      
      query += ' ORDER BY ACCOMMODATION_NAME';
      console.log("Query: " + query);

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
          // check if the accommodation has a picture
          connection.query(`SELECT * FROM picture WHERE ACCOMMODATION_ID = ${accommodationId}`, async (err, results) => {
            if (err) {
              console.log("Error: " + err);
              return res.send({ success: false });
            } else if (results.length > 0) {
              console.log("Accommodation already has a picture");
              return res.send({ success: false });
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
          }
      );}
    });
  } else {
    console.log("Full upload error");
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

// Function to remove an accommodation picture from cloudinary and the mysql database
exports.removeAccommodationPicture = (pool) => (req, res) => {
  // get the accommodation name from the request body
  const {accommodationName} = req.body;

  // see if the accommodation exists
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
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
          return res.send({ success: false });
        } else {
          // delete the picture from cloudinary
          cloudinary.uploader.destroy(results[0].PICTURE_ID, (err, results) => {
            if (err) {
              console.log("Error deleting picture from cloudinary: " + err);
              return res.send({ success: false });
            } else {
              // update the accommodation picture id in the database to null
              const updatePictureIdQuery = `
                UPDATE picture
                SET PICTURE_ID = ?
                WHERE ACCOMMODATION_ID = ?
              `;
              pool.query(updatePictureIdQuery, [accommodationId, accommodationId], (err, results) => {
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

// Function to update an accommodation picture from cloudinary and the mysql database
exports.updateAccommodationPicture = (pool) => (req, res) => {
  // Extract the image data from the request body
  const imageData = req.files.data[0].buffer;

    // Convert the buffer to a base64 data URL
    const mimeType = req.files.data[0].mimetype;
    const imageDataUrl = `data:${mimeType};base64,${imageData.toString('base64')}`;

  // get the accommodation name from the request body
  const {accommodationName} = req.body;
  // see if the accommodation exists
  getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
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
          return res.send({ success: false });
        } else {
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
                  // update the accommodation picture id in the database
                  const updatePictureIdQuery = `
                    UPDATE picture
                    SET PICTURE_ID = ?
                    WHERE ACCOMMODATION_ID = ?
                  `;
                  pool.query(updatePictureIdQuery, [results.public_id, accommodationId], (err, results) => {
                    if (err) {
                      console.log("Error updating picture id: " + err);
                      return res.send({ success: false });
                    } else {
                      return res.send({ success: true });
                    }
                  }
                  );
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