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

  // ===================================== START OF REVIEW + FAVORITE + RATING MANAGEMENT FEATURES =====================================

// This is a function that allows the user to leave a rating and review an accomodation.
// It takes a database connection pool as input, along with the rating, comment, username, timestamp and accommodation name.
// It then queries the database to retrieve the user ID and accommodation ID for the provided username and accommodation name.
// If the user ID and accommodation ID are found, it inserts the rating and review into the database.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.addReport = (pool) => (req, res) => {
  const{details, userName, accommName} = req.body;

  console.log("----------Add Report Feature----------");
  console.log("Details: " + reportDetails);
  console.log("Username: " + userName);
  console.log("Accommodation Name: "+ accommName);


  var uid = null;
  var accomid = null;

  ReportController_User.getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
      console.log("Error: " + err);
      return res.send({ success: false });
    }
    else if(userId>0){
      uid = userId;
      ReportController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
          console.log("Error: " + err);
          return res.send({ success: false });
        }
        else if(accommodationId>0){
          accomid = accommodationId;

          pool.getConnection((err, connection) => {
            if(err){
              console.log("Get Connection Error" + err);
              return res.send({ success: false });
            }

            connection.beginTransaction((err) => {
              if(err){
                console.log("Error: " + err);
                return res.send({ success: false });
              }
              else{
                const selectQuery = `SELECT COUNT(*) AS count FROM report WHERE USER_ID = ? AND ACCOMMODATION_ID = ? AND REPORT_DETAILS = ?`;
                  
                connection.query(selectQuery, [uid, accomid, reportDetails], (err, result) => {
                  if(err){
                    console.log("Error: " + err);
                    return res.send({ success: false })
                  }
                  else if(result[0].count>0){
                    console.log("Report from user already exists!");
                    return res.send({ success: false })
                  }
                  else{
                    const insertQuery = `INSERT INTO report (REPORT_DETAILS, ACCOMMODATION_ID, USER_ID) VALUES (?, ?, ?)`;

                    connection.query(insertQuery, [details, accomid, uid], (err, result1) => {
                      if(err){
                        connection.rollback(() => {
                          console.log("Insert report error: " + err);
                          return res.send({ success: false });
                        })
                      }
                      else{
                        connection.commit((err) => {
                          if(err){
                            connection.rollback(() => {
                              console.log("Commit error: " + err);
                              return res.send({ success: false });
                            })
                          }
                          else{
                            console.log("Report has been inserted!");
                            return res.send({ success: true });
                          }
                        })
                      }
                    })
                  }
                })
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



  // ===================================== END OF REPORT MANAGEMENT FEATURES =====================================