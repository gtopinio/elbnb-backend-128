const Report = {
    getReportId: (pool, userId, accommodationId, callback) => {
        // This function takes a database connection pool, a user ID, accommodation ID, and a callback function as inputs.
        // The function queries the database to retrieve the ID of a report with the corresponding user ID and accommodation ID and passes the result to the callback function.
        // If there is an error in the database query or connection, it logs the rror and passes it to the callback function as the first parameter.
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                const checkQuery = `SELECT REPORT_ID FROM report WHERE ACCOMMODATION_ID = ? AND USER_ID = ?`;
                connection.query(checkQuery, [accommodationId, userId], (err, result) => {
                    if (err) {
                        console.log("Get Report ID by User ID and Accommodation ID error: " + err);
                        callback(err, null);
                    } else {
                        try{
                            if (typeof result[0].REPORT_ID === "undefined") {
                                console.log("Get Report ID: Undefined Object");
                                callback(null, 0);
                            } else {
                                console.log("Get Report ID: Defined Object");
                                callback(null, result[0].REPORT_ID);
                            }
                        } catch (err) {
                            console.log("Report Not Found...");
                            callback(err, null);
                        }
                    }
                });
            }
        });
    }
}

module.exports = { Report }