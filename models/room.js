// Import the Accommodation model.
const Accommodation = require("./accommodation");

const Room = {
    // Function to check if a Room Name already exists. Used in adding rooms.
    // It is for checking if a room name already exists for a specific accommodation.
    checkRoomIfExists: (pool, name, accommID, callback) => {
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
    },

      // This function takes a database connection pool, a room name (unique), an accommodation_id, and a callback function as inputs.
  // It uses the getAccommodationIdByName to retrieve the Accommodation ID associated with the accomm_name.
  // It queries the database to retrieve a Room ID associated with the room name and the accommodation ID in the parameter input.
  // The function returns the callback which includes an error in the first parameter, if the query fails, and the Room ID in the second parameter if the query succeeds.
    getRoomIDbyName: (pool, name, accomm_name, callback) => {

    // Get accommodation ID from accommodation name.
    var accommid = null;
    Accommodation.getAccommodationIdByName(pool, accomm_name, (err, accommodationId) => {
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
}

module.exports = { Room }