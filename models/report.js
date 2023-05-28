const Report = {
    getReportIdByUsernameAndAccommName: (pool, username, accommodationName, callback) => {
        // This function takes a database connection pool, a username, accommodation name, and a callback function as inputs.
        // The function queries the database to retrieve the ID of a report with the corresponding username and accommodation name and passes the result to the callback function.
        // If there is an error in the database query or connection, it logs the rror and passes it to the callback function as the first parameter.
        pool.getConnection((err, connection) => {
            if (err) {
                console.log(err);
                callback(err, null);
            } else {
                const checkQuery = `SELECT REPORT_ID FROM report WHERE ACCOMMODATION_NAME = ? AND USER_USERNAME = ?`;
                connection.query(checkQuery, [accommodationName, username], (err, result) => {
                    if (err) {
                        console.log("Get Report ID by Username and Accommodation Name error: " + err);
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