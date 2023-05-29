// Imports
const pdf = require('pdfkit');
// Import the necessary models.
const { Accommodation: ReportController_Accommodation } = require("../models/accommodation");
const { User: ReportController_User } = require("../models/user");
const { Report: ReportController_Report } = require('../models/report');


// ===================================== START OF REPORT MANAGEMENT FEATURES =====================================
  

// This function takes a database connection pool and fetches all the accomodations that matches the same query used in filterAccomodations.
// A PDF file is then dynamically generated containing the accomodations matching the specified criteria and can be downloaded by the user.
exports.generateReport = (pool) => (req, res) => {
    // Building PDF from filters
    const filters = req.body.filters;
    const name = filters.name;
    const address = filters.address;
    const location = filters.location;
    const type = filters.type;
    const owner = filters.ownerUsername;
    const rating = filters.rating;
    const maxPrice = filters.maxPrice;
    const capacity = filters.capacity;
  
    // Building the query
    let filter = ""
    let query = 'SELECT accommodation.*, MAX(room.ROOM_PRICE) AS max_price, user.USER_USERNAME, AVG(review.REVIEW_RATING) AS rating, MIN(room.ROOM_CAPACITY) AS min_capacity, MAX(room.ROOM_CAPACITY) as max_capacity ' +
                'FROM user INNER JOIN accommodation ON user.USER_ID = accommodation.ACCOMMODATION_OWNER_ID ' + 
                'INNER JOIN review ON accommodation.ACCOMMODATION_ID = review.ACCOMMODATION_ID ' +
                'LEFT JOIN room ON accommodation.ACCOMMODATION_ID = room.ACCOMMODATION_ID ' + 
                'WHERE accommodation.ACCOMMODATION_ISARCHIVED = false AND room.ROOM_ISARCHIVED = false AND '

    if (name) {
      filter += `Name: ${name}\n`
      query += `accommodation.ACCOMMODATION_NAME LIKE '%${name}%' AND `
    }
    if (address) {
      filter += `Address: ${address}\n`
      query += `accommodation.ACCOMMODATION_ADDRESS LIKE '%${address}%' AND `
    }
    if (location) {
      filter += `Address: ${location}\n`
      query += `accommodation.ACCOMMODATION_LOCATION = '${location}' AND `
    }
    if (type) {
      filter += `Type: ${type}\n`
      query += `accommodation.ACCOMMODATION_TYPE = '${type}' AND `
    }
    if (owner) {
      filter += `Owner: ${owner}\n`
      query += `user.USER_USERNAME = '${owner}' AND `
    }
    query = query.slice(0, -4);
    query += 'GROUP BY accommodation.ACCOMMODATION_ID '
    if (rating || maxPrice || capacity) {
      query += 'HAVING '
      if (rating) {
        filter += `Rating: ${rating}\n`
        query += `AVG(review.REVIEW_RATING) >= '${rating}' AND `
      }
      if (maxPrice) {
        filter += `Max Price: ${maxPrice}\n`
        query += `MAX(room.ROOM_PRICE) <= ${maxPrice} AND `
      }
      if (capacity) {
        filter += `Capacity: ${capacity}\n`
        query += `(MAX(room.ROOM_CAPACITY) = ${capacity} OR MIN(room.ROOM_CAPACITY) = ${capacity}) AND `
      }
      query = query.slice(0, -4);
    }
    query += 'ORDER BY accommodation.ACCOMMODATION_NAME'
    
    // Querying
    pool.getConnection((err, connection) => {
      if (err) {
        // If error is encountered
        console.log("Error: " + err);
        return res.send({ success: false });
      } else {
        // Else, start connection
        console.log(query)
        connection.query(query, (err, results) => {
          if (err) {
            console.log("Error: " + err) 
            return res.send({ success: false });
          } else {
            // Setting Headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename=report.pdf')

            // Creating PDF document
            const pdfDoc = new pdf();
            pdfDoc.pipe(res);

            pdfDoc.fontSize(25).text("Search Results for");
            if (!filter) {
              pdfDoc.fontSize(12).text("No filters specified")
                  .moveDown();
            } else {
              pdfDoc.fontSize(12).text(filter).moveDown();
            }
            pdfDoc.fontSize(18).text("Showing " + results.length + " results");

            accoms = JSON.parse(JSON.stringify(results));
            for (i = 0; i < accoms.length; i++) {
              accom = accoms[i];

              const name = accom.ACCOMMODATION_NAME;
              const type = accom.ACCOMMODATION_TYPE;
              const address = accom.ACCOMMODATION_ADDRESS;
              const location = accom.ACCOMMODATION_LOCATION;
              const description = accom.ACCOMMODATION_DESCRIPTION;
              const amenities = accom.ACCOMMODATION_AMENITIES;
              const max_price = accom.max_price;
              const owner = accom.USER_USERNAME;
              const rating = accom.rating;
              const minCap = accom.min_capacity;
              const maxCap = accom.max_capacity;

              pdfDoc.fontSize(12).text(`Name: ${name}`)
                    .text(`Address: ${address}`)
                    .text(`Location: ${location}`)
                    .text(`Type: ${type}`)
                    .text(`Owner: ${owner}`)
                    .text(`Description: ${description}`)
                    .text(`Ameneties: ${amenities}`)
                    .text(`Max Price: ${max_price}`)
                    .text(`Rating: ${rating}`)
                    .text(`Capacity: ${minCap} - ${maxCap}`)
                    .moveDown();
            }

            pdfDoc.end();
          }
        });
      }
    });
  }

// This function takes a database connection pool and lets the user add a new report based on the accommodation name.
// It also checks first if the combination of the user id and accommodation id already exists in the reports table.
exports.addReport = (pool) => (req, res) => {
  const{username, report, accommodationName} = req.body;

  console.log("----------Add Report Feature----------");
  console.log("Report: " + report);
  console.log("Username: " + username);
  console.log("Accommodation Name: "+ accommodationName);


  var uid = null;
  var accomid = null;

  ReportController_User.getUserIdByUsername(pool, username, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false , message: "Error in adding report!"});
    }
    else if(userId>0){
      uid = userId;
      ReportController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false , message: "Error in adding report!"});
        }
        else if(accommodationId>0){
          accomid = accommodationId;

          pool.getConnection((err, connection) => {
            if(err){
              console.log("Get Connection Error" + err);
              return res.send({ success: false , message: "Error in adding report!"});
            }

            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({ success: false , message: "Error in adding report!"});
              }
              else{
                    const insertQuery = `INSERT INTO report (REPORT_DETAILS, USER_ID, ACCOMMODATION_ID) VALUES (?, ?, ?)`;

                    connection.query(insertQuery, [report, uid, accomid], (err, result1) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Insert report error: " + err);
                          return res.send({ success: false , message: "Error in adding report!"});
                        })
                      }
                      else{
                        connection.commit((err) => {
                          if(err){
                            connection.rollback(() => {
                              console.log("Commit error: " + err);
                              return res.send({ success: false , message: "Error in adding report!"});
                            })
                          }
                          else{
                            console.log("Reporrt has been inserted!");
                            return res.send({ success: true });
                          }
                        })
                      }
                    });
              }
            })
          });
        }
        else{
          console.log("Accomodation not found! Cannot add report");
          return res.send({ success: false });
        }
      })
    }
    else{
      console.log("User not found! Cannot add report");
      return res.send({ success: false });
    }
  })
}


// This function only needs a connection pool, and gets all of the entries
// in the report table, ordered by the timestamp according to recency 
// (most recent at top)
exports.viewAllReports = (pool) => (req, res) => {
  console.log("========== View All Reports ==========");

  // Querying
  pool.getConnection((err, connection) => {
    if (err) {
      // If error occured in starting connection
      console.log("Error: " + err);
      return res.send({ success: false });
    } else {
      connection.query('SELECT * FROM report ORDER BY timestamp(REPORT_DATE) DESC', (err, results) => {
        // Getting the results
        if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
        } else {
          return res.send({ success: true, results });
        }
      });
    }
  });
}


// The viewReport function takes a database connection pool and returns a callback function that handles a POST request for viewing a single report.
// The function takes the username, accommodation name, and report details from the request body and uses the helper functions ReportController_User.findBy
// and ReportController_Accommodation.getAccommodationIdByName to identify the corresponding IDs of the username and accommodation name.
// The function then uses the user ID, accommodation ID, and report details to query the report table and get the ID of the given report.
// If successful, the function returns a JSON response with the username, report review details, timestamp, accommodation name, and a success flag set to true.
// If there is an error at any point, returns a JSON respone with a success flag set to false.
exports.viewReport = (pool) => (req, res) => {
  const {username, accommName, details} = req.body;
  console.log("----------View Single Report Feature----------");
  console.log("Username: " + username);
  console.log("Accommodation Name: " + accommName);
  console.log("Report Details: " + details);

  // Get user ID using username.
  ReportController_User.getUserIdByUsername(pool, username, (err, userId) => {
    if (err) {
      console.log("Get User ID Error: " + err);
      return res.send({ success: false , message: "User not found!"});
    } else if (userId > 0 && typeof userId !== 'undefined') {
      // If found and not undefined, get accommodation ID by accommodation name.
      ReportController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if (err) {
          console.log("Get Accommodation ID Error: " + err);
          return res.send({ success: false , message: "Accommodation not found!"});
        } else if (accommodationId > 0 && accommodationId !== 'undefined') {
          // If found and not underfined, find report ID by using user ID and accommodation ID
          ReportController_Report.getReportId(pool, userId, accommodationId, (err, reportId) => {
            if (err) {
              console.log("Get Report ID Error: " + err);
              return res.send({ success: false , message: "Report not found!"});
            } else if (reportId > 0 && reportId !== 'undefined') {
              // if found and not undefined, get the report with the corresponding user id and accommodation id
              const reportQuery = `SELECT * FROM report WHERE REPORT_ID = ? AND REPORT_DETAILS = ?`;
              pool.query(reportQuery, [reportId, details], (err, reportResult) => {
                if (err) {
                  console.log("Get Report ID Error: " + err);
                  return res.send({ success: false , message: "Report not found!"});
                } else if (reportResult.length > 0) {
                  console.log("Report found! Sending report data...");
                  return res.send({
                    success: true,
                    reportUsername: username,
                    reportDetails: reportResult[0].REPORT_DETAILS,
                    reportTimestamp: reportResult[0].REPORT_DATE,
                    accommodationName: accommName
                  });
                } else {
                  console.log("Report not found!");
                  return res.send({ success: false , message: "Report not found!"});
                }
              });
            } else {
              console.log("Report not found!");
              return res.send({ success: false , message: "Report not found!"});
            }
          });
        } else {
          console.log("Accommodation not found! Cannot select a report");
          return res.send({ success: false , message: "Accommodation not found!"})
        }
      });
    } else {
      console.log("User not found! Cannot select a report");
      return res.send({ success: false , message: "User not found!"});
    }
  });
}


/* This code exports a function called `deleteReport` that takes a database connection pool as a
parameter and returns a function that takes a request and response object as parameters. */
exports.deleteReport = (pool) => (req, res) => {
  const {userName, accommName, details} = req.body;

  console.log("----------Delete Report Feature----------");
  console.log("Username: " + userName);
  console.log("Accommodation Name: " + accommName);

  var uId = null;
  var aId = null;

  ReportController_User.getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({success: false, message: "Error in getting user id"});
    }else if(userId > 0){
      uId = userId;
      ReportController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({success: false, message: "Error in getting accommodation id"});
        }else if(accommId > 0){
          aId = accommId;
          
          pool.getConnection((err, connection) => {
            if(err){
              console.log("Error: " + err);
              return res.send({success: false, message: "Error in getting connection"});
            }
            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({success: false, message: "Error in starting transaction"});
              }else{
                const deleteQuery = `DELETE FROM report WHERE USER_ID = ? AND ACCOMMODATION_ID = ? AND REPORT_DETAILS = ?`;

                connection.query(deleteQuery, [uId, aId, details], (err, result) => {
                  if(err){
                    connection.rollback(() => {
                      console.log("Error: " + err);
                      return res.send({success: false, message: "Error in deleting report"});
                    });
                  }else if(result.affectedRows == 0){
                    connection.rollback(() => {
                      console.log("Error: Report not found");
                      return res.send({success: false, message: "Report not found"});
                    });
                  }else{
                    connection.commit((err) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Error: " + err);
                          return res.send({success: false, message: "Error in committing transaction"});
                        });
                      }else{
                        console.log("Report successfully deleted");
                        return res.send({success: true});
                      }
                    });
                  }
                });
              }
            });
          });
        }
      });
    }
  });
}
  // ===================================== END OF REPORT MANAGEMENT FEATURES =====================================
