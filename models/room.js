const Room = {
    // This function takes a database connection pool, an accommodation name (unique), and a callback function as inputs. 
    // It queries the database to retrieve the accommodation ID for the provided name and passes the result to the callback function. 
    // If there is an error in the database query or connection, it logs the error and passes it to the callback function as the first parameter.
    getAccommodationIdByName: (pool, name, callback) => {
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
    },

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
    }
}

module.exports = { Room }