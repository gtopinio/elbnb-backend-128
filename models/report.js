const Report = {
    getReportIdByUsernameAndAccommName: (pool, accommodationName, username, callback) => {
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