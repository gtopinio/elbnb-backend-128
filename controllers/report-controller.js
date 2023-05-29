// Imports
const pdf = require('pdfkit');
// Import the necessary models.
const { Accommodation: ReportController_Accommodation } = require("../models/accommodation");
const { User: ReportController_User } = require("../models/user");


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
  
  // ===================================== END OF REPORT MANAGEMENT FEATURES =====================================

  
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
