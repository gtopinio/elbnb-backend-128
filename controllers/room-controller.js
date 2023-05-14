

// ===================================== START OF ROOM MANAGEMENT FEATURES =====================================

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
        const query = `SELECT * FROM room WHERE ROOM_ISARCHIVED = 0 AND ACCOMMODATION_ID = ${id}`;
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
  
  // Function to check if a Room Name already exists. Currently not in use
  // TODO: Use for adding rooms! It is for checking if a room name already exists for a specific accommodation. To be implemented in the addNewRoom function in the future.
  function checkRoomIfExists(pool, name, accommID, callback) {
    pool.getConnection((err, connection) => {
      if (err) {
        console.log("Error: " + err);
        callback(err, null);
      } else {
        const checkQuery = `SELECT ROOM_ID FROM room WHERE ROOM_NAME = ? AND ACCOMMODATION_ID = ?`;
        connection.query(checkQuery, [name, accommID], (err, result) => {
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
    callback(err, null);
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
        checkRoomIfExists(pool, name, id, (err, hasDup) => {
        if (err){
            console.log("Error: " + err);
            return res.send({ success: false });
        }else if (hasDup){
            console.log("Room name already exists!");
            return res.send({ success: false });
        }else{
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
        }
        });
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
var accommID = null;
// Check if accommodation exists.
getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
    console.log("Error: " + err);
    return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
    accommID = accommodationId;
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
        WHERE ROOM_NAME = ? AND ROOM_ID != ? AND ACCOMMODATION_ID = ?
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
            connection.query(checkRoomNameDupQuery, [newName, id, accommID], (err, result) => {
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

/* This code is defining a function called `viewRoom` that takes a database connection pool as
input and returns a function that handles a HTTP request to view a specific room in an
accommodation. The function extracts the accommodation name and room name from the request body,
uses a helper function called `getRoomIDbyName` to get the ID of the room from the database, and
then uses the room ID to query the database for the room details. If successful, the function
returns a JSON response with the room details and a success flag set to true. If there is an error
at any point, */
exports.viewRoom = (pool) => (req, res) => {
const {accommodationName, roomName} = req.body;

getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
    console.log("Error: " + err);
    return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
    getRoomIDbyName(pool, roomName, accommodationName,(err, roomID) => {
        if (err) {
        console.log("Error: " + err);
        return res.send({ success: false });
        } else if (roomID > 0 && typeof roomID !== 'undefined') {
        const roomQuery = `
            SELECT *
            FROM room
            WHERE ROOM_ID = ? AND ACCOMMODATION_ID = ?
        `;
        pool.query(roomQuery, [roomID, accommodationId], (err, roomResult) => {
            if (err) {
                console.log("Error getting room: " + err);
                return res.send({ success: false });
            } else {
                // Get Room Picture
                const pictureQuery = `SELECT PICTURE_ID FROM picture WHERE ROOM_ID = ?`;
                pool.query(pictureQuery, roomID, (err, pictureResult) => {
                    if (err) {
                        console.log("Error: " + err);
                        return res.send({ success: false });
                      } else {
                        // Get the image url from Cloudinary
                        const pictureId = pictureResult[0].PICTURE_ID;
                        const imageUrl = cloudinary.url(pictureId, { secure: true });
                        return res.send({ success: true, room: roomResult, imageUrl: imageUrl });
                      }
                });
            }
        });
        }
    });
    }
});
}
  
// ===================================== END OF ROOM MANAGEMENT FEATURES =====================================