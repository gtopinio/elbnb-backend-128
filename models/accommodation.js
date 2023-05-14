const Accommodation = {
    // The checkAccommDup function checks if an accommodation with the given name already exists in the database by querying the accommodation table. 
    // It takes a connection pool, accommodation name, and callback function as parameters.
    // It returns a boolean value in the callback function.
    checkAccommDup: (pool, name, callback) => {
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
    },
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
                    if (result.length === 0) {
                    console.log("Accommodation Not Found...");
                    callback(null, 0);
                    } else {
                    console.log("Get Accom Id: Defined Object");
                    callback(null, result[0].ACCOMMODATION_ID);
                    }
                }
                });
            }
            });
        },
}


module.exports = { Accommodation }