// Imports
const cloudinary = require('cloudinary').v2;
const Accommodation = require('../models/accommodation-model');
const Room = require('../models/room-model');

// Configuration for cloudinary (cloud for uploading unstructured files) 
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

// ===================================== START OF ROOM MANAGEMENT FEATURES =====================================

// This is a function that gets the accommodation ID by the accommodation name. After getting the id, it gets the rooms by the accommodation id.
// It first gets the accommodation id from the request parameters and then gets the rooms by the accommodation id using an SQL SELECT statement.
// If there is an error, it logs the error and sends a response with a success value of false and a message indicating an error occurred.
// If there is no error, it sends a response with a success value of true and the rooms.
// If there is no accommodation found with the accommodationName, it logs the error and sends a response with a success value of false and a message indicating no accommodation found.
exports.getRoomsByAccommodationName = (pool) => (req, res) => {
    // Get the id of the accommodation name
    const accommodationName = req.body.accommodationName;
  
    var id = null;
    Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
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

  
// This function takes a database connection pool, the room name, its capacity, its price, and the accommodation name as inputs.
// It uses the Accommodation.getAccommodationIdByName to retrieve the Accommodation ID associated with the accommodation name.
// It queries the database to insert a new room with the room name, capacity, price, and accommodation ID in the parameter input.
exports.addNewRoom = (pool) => (req, res) => {
const { name, capacity, price, accommodationName } = req.body;
var id = null;
Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
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
        Room.checkRoomIfExists(pool, name, id, (err, hasDup) => {
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
}); // end of Accommodation.getAccommodationIdByName function
}; // end of function

// The editRoom function takes a database connection pool as input and returns a callback function that handles a POST request for editing a room.
// The function takes the information in the request body which it will use to identify the Room ID, that is associated with the current room name and accommodation name provided, through the Room.getRoomIDbyName helper function.
// If the room exists, it checks if the updated name already exists within the database.
// If the updated name doesn't exist, the function updates the room's details according to the request body and returns a response indicating the successful update to the client.
// Otherwise, it returns a response indicating the unsuccessful update to the client.
exports.editRoom = (pool) => (req, res) => {
const {name, newName, newCapacity, newPrice, accommodationName} = req.body;
var accommID = null;
// Check if accommodation exists.
Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
    console.log("Error: " + err);
    return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
    accommID = accommodationId;
    // Check if the room ID exists.
    var id = null;
    Room.getRoomIDbyName(pool, name, accommodationName, (err, roomID) => {
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
}}); // end of Accommodation.getAccommodationIdByName function
};

// The deleteRoom function takes a database connection pool as input and returns a callback function that handles a POST request for deleting a room.
// The function takes the information in the request body which it will use to identify the Room ID , that is associated with the current room name and accommodation name provided, through the Room.getRoomIDbyName helper function.
// If the room exists, it removes the room from the database and returns a response indicating the successful deletion to the client.
// Otherwise, it returns a response indicating the unsuccessful deletion to the client.
exports.deleteRoom = (pool) => (req, res) => {
const {name, accommodationName} = req.body;

// Get the ID of the room if the name exists.
var id = null;
Room.getRoomIDbyName(pool, name, accommodationName, (err, roomID) => {
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
// The function takes the information in the request body which it will use to identify the Room ID, that is associated with the current room name and accommodation name provided, through the Room.getRoomIDbyName helper function.
// If the room exists, it updates a detail of the room in the database to classify it as archived and returns a response indicating a successful operation to the client.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.archiveRoom = (pool) => (req, res) => {
const {name, isArchived, accommodationName } = req.body;

//Get the ID of the room if the name exists.
var id = null;
Room.getRoomIDbyName(pool, name, accommodationName, (err, roomID) => {
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
uses a helper function called `Room.getRoomIDbyName` to get the ID of the room from the database, and
then uses the room ID to query the database for the room details. If successful, the function
returns a JSON response with the room details and a success flag set to true. If there is an error
at any point, */
exports.viewRoom = (pool) => (req, res) => {
const {accommodationName, roomName} = req.body;

Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
    console.log("Error: " + err);
    return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
    Room.getRoomIDbyName(pool, roomName, accommodationName,(err, roomID) => {
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
                const pictureQuery = `SELECT PICTURE_ID FROM picture WHERE ROOM_ID = ? AND ACCOMMODATION_ID = ?`;
                pool.query(pictureQuery, [roomID, accommodationId], (err, pictureResult) => {
                    if (err) {
                        console.log("Error: " + err);
                        return res.send({ success: false });
                      } // If there is no picture for the room, return the room details without the image url
                        else if (pictureResult.length == 0) {
                        return res.send({ success: true, room: roomResult });
                        } 
                      else {
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

/* This function takes a database connection pool as input and returns a function that handles HTTP
requests. The function is responsible for adding/updating an image to a room in a given accommodation room. It
first extracts the room name, accommodation name, and image data from the request body. It then
retrieves the ID of the room using its name, and the ID of the room using its name and the
name of the accommodation it belongs to. If both IDs are found, the function inserts the image data,
accommodation ID, and room ID into the `picture` table */
exports.uploadRoomPic = (pool) => async (req, res) => {
    // Extract the image data from the request body. But first, check if the request body is empty
    if (!req.files || Object.keys(req.files).length === 0) {
        console.log("No files were uploaded.");
        return res.send({ success: false, message: "No files were uploaded."});
    } else {
        const imageData = req.files.data[0].buffer;
        // Convert the buffer to a base64 data URL
        const mimeType = req.files.data[0].mimetype;
        const imageDataUrl = `data:${mimeType};base64,${imageData.toString("base64")}`;

        const { roomName, accommodationName } = req.body;
        var accommID = null;
        Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
            if (err) {
                console.log("Error: " + err);
                return res.send({ success: false , message: "Error getting accommodation ID."});
            } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
                accommID = accommodationId;
                // Check if the room ID exists.
                var id = null;
                Room.getRoomIDbyName(pool, roomName, accommodationName, (err, roomID) => {
                    if (err) {
                        console.log("Error: " + err);
                        return res.send({ success: false , message: "Error getting room ID."});
                    } else if (roomID > 0 && typeof roomID !== "undefined") { // Room ID exists
                        id = roomID;
                        pool.query(`SELECT * FROM picture WHERE ACCOMMODATION_ID = ? AND ROOM_ID = ?`, [accommID, id], async (err, results) => {
                            if (err) {
                                console.log("Error: " + err);
                                return res.send({ success: false , message: "Error getting room image."});
                            } else if (results.length > 0) {
                                console.log("Room already has an image. Updating image...");
                                // Upload the image to cloudinary, but first, remove the old image from cloudinary
                                const oldImageId = results[0].PICTURE_ID;
                                try {
                                    await cloudinary.uploader.destroy(oldImageId);
                                    const result = await cloudinary.uploader.upload(imageDataUrl, {upload_preset: "mockup_setup"});
                                    const imageId = result.public_id;

                                    // Update the image ID in the database
                                    const updateImageQuery = `UPDATE picture SET PICTURE_ID = '${imageId}' WHERE ACCOMMODATION_ID = ${accommID} AND ROOM_ID = ${id}`;
                                    await pool.query(updateImageQuery);

                                    console.log("Successfully updated image!");
                                    return res.send({ success: true });
                                } catch (err) {
                                    console.log("Error uploading image: " + err);
                                    return res.send({ success: false , message: "Error uploading image."});
                                }
                                
                            } else {
                                console.log("Room has no image yet! Proceeding to adding image...");
                                // Upload the image to cloudinary
                                try {
                                    const result = await cloudinary.uploader.upload(imageDataUrl, {upload_preset: "mockup_setup"});
                                    const imageId = result.public_id;

                                    // Insert the image ID, accommodation ID, and room ID into the database
                                    const addImageQuery = `INSERT INTO picture (PICTURE_ID, ACCOMMODATION_ID, ROOM_ID) VALUES ('${imageId}', ${accommID}, ${id})`;
                                    await pool.query(addImageQuery);

                                    console.log("Successfully added image!");
                                    return res.send({ success: true });
                                } catch (err) {
                                    console.log("Error uploading image: " + err);
                                    return res.send({ success: false , message: "Error uploading image."});
                                }
                            }
                        });
                    } else {
                        console.log("Room not found! Cannot proceed to adding image...");
                        return res.send({ success: false , message: "Room not found! Cannot proceed to adding image..."});
                    }
                });
            } else {
                console.log("Accommodation not found! Cannot proceed to adding image...");
                return res.send({ success: false , message: "Accommodation not found! Cannot proceed to adding image..."});
            }
        });
    }
}


/* This function takes a database connection pool as input and returns a function that handles HTTP
requests. The function retrieves the images associated with a specific room in a specific accommodation
from the database. It first extracts the room name and accommodation name from the request body, then
uses helper functions `Accommodation.getAccommodationIdByName` and `Room.getRoomIDbyName` to retrieve the corresponding
IDs from the database. If the IDs are found, it executes a SQL query to retrieve the picture IDs
associated with the room and accommodation, and returns them in the response */
exports.getRoomPic = (pool) => (req, res) => {
    const { roomName, accommodationName } = req.body;
    var accommID = null;
    Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
        if (err) {
            console.log("Error: " + err);
            return res.send({ success: false , message: "Error getting accommodation ID."});
        } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
            accommID = accommodationId;
            // Check if the room ID exists.
            var id = null;
            Room.getRoomIDbyName(pool, roomName, accommodationName, (err, roomID) => {
                if (err) {
                    console.log("Error: " + err);
                    return res.send({ success: false , message: "Error getting room ID."});
                } else if (roomID) {
                    id = roomID;
                    const getImagesQuery = `
                        SELECT PICTURE_ID
                        FROM picture
                        WHERE ACCOMMODATION_ID = ? AND ROOM_ID = ?
                    `;
                    pool.query(getImagesQuery, [accommID, id], (err, result) => {
                        if (err) {
                            console.log("Error getting images: " + err);
                            return res.send({ success: false , message: "Error getting images."});
                        } else if (result.length === 0){
                            console.log("No room image found!");
                            return res.send({ success: false , message: "No room image found!"});
                        }
                        else {
                            const imageId = result[0].PICTURE_ID;
                            const imageUrl = cloudinary.url(imageId, {secure: true});
                            return res.send({ success: true, imageUrl: imageUrl });
                        }
                    });
                } else {
                    console.log("Room not found! Cannot proceed to getting images...");
                    return res.send({ success: false , message: "Room not found! Cannot proceed to getting images..."});
                }
            });
        } else {
            console.log("Accommodation not found! Cannot proceed to getting images...");
            return res.send({ success: false , message: "Accommodation not found! Cannot proceed to getting images..."});
        }
    });
}

/* This function handles a request to delete an image associated with a room in a
specific accommodation. It takes in the pool object for database connection, and expects the request
body to contain the room name, accommodation name, and the image ID to be deleted. */
exports.removeRoomPicture = (pool) => (req, res) => {
    const { roomName, accommodationName } = req.body;
    var accommID = null;
    Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
        if (err) {
            console.log("Error: " + err);
            return res.send({ success: false , message: "Error getting accommodation ID."});
        } else if (accommodationId > 0 && typeof accommodationId != "undefined") {
            accommID = accommodationId;
            // Check if the room ID exists.
            var id = null;
            Room.getRoomIDbyName(pool, roomName, accommodationName, (err, roomID) => {
                if (err) {
                    console.log("Error: " + err);
                    return res.send({ success: false , message: "Error getting room ID."});
                } else if (roomID > 0 && typeof roomID !== "undefined") {
                    id = roomID;
                    const getImageIdQuery = `
                        SELECT PICTURE_ID
                        FROM picture
                        WHERE ACCOMMODATION_ID = ? AND ROOM_ID = ?
                    `;
                    pool.query(getImageIdQuery, [accommID, id], (err, result) => {  // Get the image ID of the room.
                        if (err) {
                            console.log("Error getting image ID: " + err);
                            return res.send({ success: false , message: "Error getting image ID."});
                        } else if (result.length === 0){
                            console.log("No room image found!");
                            return res.send({ success: false , message: "No room image found!"});
                        } else {
                            cloudinary.uploader.destroy(result[0].PICTURE_ID, (err) => {
                                if (err) {
                                    console.log("Error deleting image: " + err);
                                    return res.send({ success: false , message: "Error deleting image."});
                                } else {
                                    const deleteImageQuery = 
                                        `DELETE FROM picture WHERE ACCOMMODATION_ID = ? AND ROOM_ID = ?`;
                                    pool.query(deleteImageQuery, [accommID, id], (err) => {
                                        if (err) {
                                            console.log("Error deleting image: " + err);
                                            return res.send({ success: false , message: "Error deleting image."});
                                        } else {
                                            console.log("Successfully deleted image!");
                                            return res.send({ success: true });
                                        }
                                    });
                                }
                            });
                        }
                    });
                } else {
                    console.log("Room not found! Cannot proceed to deleting image...");
                    return res.send({ success: false , message: "Room not found! Cannot proceed to deleting image..."});
                }
            });
        } else {
            console.log("Accommodation not found! Cannot proceed to deleting image...");
            return res.send({ success: false , message: "Accommodation not found! Cannot proceed to deleting image..."});
        }
    });
}

// ===================================== END OF ROOM MANAGEMENT FEATURES =====================================