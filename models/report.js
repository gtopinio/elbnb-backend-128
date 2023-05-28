const Report = {
    // This function takes a database connection pool and checks if a report with the given accommodation name and username already exists in the database.
    // It returns a boolean value in the callback function.
    checkReportIfExists: (pool, accommodationName, username, callback) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.log("Error: " + err);
                callback(err, null);
            } else {
                const checkQuery = `SELECT REPORT_ID FROM report WHERE ACCOMMODATION_ID = ? AND USER_ID = ?`;
                connection.query(checkQuery, [accommodationName, username], (err, result) => {
                    if (err) {
                        console.log("Check Report if Exists error: " + err);
                        callback(err, null)
                    } else {
                        try{
                            if(typeof result[0].REPORT_ID === "undefined") {
                                console.log("Get Report Id: Undefined Object");
                                callback(null, 0);
                            }
                            else {
                                console.log("Get Report Id: Defined Object");
                                callback(null, result[0].REPORT_ID);
                            }
                            } catch (err) {
                            console.log("Report Not Found...");
                            callback(null, null);
                            }
                    }
                });
            }
        });
    },
}

module.exports = { Report }