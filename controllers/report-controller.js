// Imports
const pdf = require('pdfkit');


// ===================================== START OF REPORT MANAGEMENT FEATURES =====================================

// The function takes in a database connection pool object and returns a callback function that filters a room based on the user's search criteria specified in the req.query object.
function filterRooms(pool, priceTo, priceFrom, capacity, callback) {
    const query = `
      SELECT DISTINCT ACCOMMODATION_ID FROM room
      WHERE 
        (ROOM_PRICE <= ? OR ? IS NULL)
        AND (ROOM_PRICE >= ? OR ? IS NULL)
        AND (ROOM_CAPACITY = ? OR ? IS NULL)
    `;
    
    pool.query(query, [priceTo, priceTo, priceFrom, priceFrom, capacity, capacity], (err, results) => {
      if (err) {
        callback(err, null);
      } else {
        const ids = results.map(result => result.ACCOMMODATION_ID);
        callback(null, ids);
      }
    });
  }
  

// This function takes a database connection pool and fetches all the accomodations that matches the same query used in filterAccomodations.
// A PDF file is then dynamically generated containing the accomodations matching the specified criteria and can be downloaded by the user.
exports.generateReport = (pool) => (req, res) => {
    // Building PDF from filters
    const filters = req.body.filters;
    const name = filters.name;
    const address = filters.address;
    const location = filters.location;
    const type = filters.type;
    const priceFrom = filters.priceFrom;
    const priceTo = filters.priceTo;
    const capacity = filters.capacity;
  
    // Querying for accomodations
    if (!name && !address && !location && !type && !priceFrom && !priceTo && !capacity) {
      // If no filter, return all accommodations
      pool.getConnection((err, connection) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ message: "An error occured. PDF Cannot be generated" });
        } else {
          connection.query('SELECT *, (SELECT MAX(ROOM_PRICE) FROM room WHERE ACCOMMODATION_ID = accommodation.ACCOMMODATION_ID) AS MAX_PRICE FROM accommodation WHERE ACCOMMODATION_ISARCHIVED = false ORDER BY ACCOMMODATION_NAME', (err, results) => {
            if (err) {
              console.log("Error: " + err);
              return res.send({ message: "An error occured. PDF Cannot be generated" });
            } else {
              // TODO: PDF file is accessible by forcing the browser to download the file. Coordinate with front-end?
              // Setting Headers
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'inline; filename=report.pdf')
  
              // Creating PDF document
              const pdfDoc = new pdf();
              pdfDoc.pipe(res);
  
              pdfDoc.fontSize(25).text("Search Results for");
              pdfDoc.fontSize(12).text("No filters specified")
                    .moveDown();
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
  
                pdfDoc.fontSize(12).text(`Name: ${name}`)
                      .text(`Type: ${type}`)
                      .text(`Address: ${address}`)
                      .text(`Location: ${location}`)
                      .text(`Description: ${description}`)
                      .text(`Ameneties: ${amenities}`)
                      .moveDown();
              }
              pdfDoc.end();
            }
          });
        }
      });
    } else if (priceFrom || priceTo || capacity) {
      // If priceFrom, priceTo, or capacity are supplied, find accommodations with specific rooms that match the criteria
      filterRooms(pool, priceTo, priceFrom, capacity, (err, ids) => {
        if (err) {
          console.log("Error: " + err);
          return res.send({ message: "An error occured. PDF Cannot be generated" });
        } else {
          // Creating query 
          let query = 'SELECT *, (SELECT MAX(ROOM_PRICE) FROM room WHERE ACCOMMODATION_ID = accommodation.ACCOMMODATION_ID) AS MAX_PRICE FROM accommodation';
          let whereClause = '';
          if (name || address || location || type || ids.length > 0) {
            whereClause += ' WHERE ACCOMMODATION_ISARCHIVED = false AND';
            if (name) {
              whereClause += ` ACCOMMODATION_NAME LIKE '%${name}%' AND`;
            }
            if (address) {
              whereClause += ` ACCOMMODATION_ADDRESS LIKE '%${address}%' AND`;
            }
            if (location) {
              whereClause += ` ACCOMMODATION_LOCATION = '${location}' AND`;
            }
            if (type) {
              whereClause += ` ACCOMMODATION_TYPE = '${type}' AND`;
            }
            if (ids.length > 0) {
              whereClause += ` ACCOMMODATION_ID IN (${ids.join(',')}) AND`;
            }
            // Remove the extra 'AND' at the end of the WHERE clause
            whereClause = whereClause.slice(0, -4);
    
            query += whereClause;
            query += ' ORDER BY ACCOMMODATION_NAME';
    
            pool.getConnection((err, connection) => {
              if (err) {
                console.log("Error: " + err);
                return res.send({ message: "An error occured. PDF Cannot be generated" });
              } else {
                connection.query(query, (err, results) => {
                  if (err) {
                    console.log("Error: " + err);
                    return res.send({ message: "An error occured. PDF Cannot be generated" });
                  } else {
                    // Setting Headers
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', 'inline; filename=report.pdf');
  
                    // Creating PDF document
                    const pdfDoc = new pdf();
                    pdfDoc.pipe(res);
  
                    pdfDoc.fontSize(25).text("Search Results for");
                    // Generating search filters
                    let filter = ""
                    if (name) {
                      filter += "Name: " + name + "\n";
                    }
                    if (address) {
                      filter += "Address: " + address + "\n";
                    }
                    if (location) {
                      filter += "Location: " + location + "\n";
                    }
                    if (priceFrom) {
                      filter += "Price From: " + priceFrom + "\n";
                    }
                    if (priceTo) {
                      filter += "Price To: " + priceTo + "\n";
                    }
                    if (capacity) {
                      filter += "Capacity: " + capacity + "\n";
                    }
                    pdfDoc.fontSize(12).text(filter).moveDown();
                    pdfDoc.fontSize(18).text("Showing " + results.length + " results")
  
                    accoms = JSON.parse(JSON.stringify(results));
                    for (i = 0; i < accoms.length; i++) {
                      accom = accoms[i];
        
                      const name = accom.ACCOMMODATION_NAME;
                      const type = accom.ACCOMMODATION_TYPE;
                      const address = accom.ACCOMMODATION_ADDRESS;
                      const location = accom.ACCOMMODATION_LOCATION;
                      const description = accom.ACCOMMODATION_DESCRIPTION;
                      const amenities = accom.ACCOMMODATION_AMENITIES;
        
                      pdfDoc.fontSize(12).text(`Name: ${name}`)
                            .text(`Type: ${type}`)
                            .text(`Address: ${address}`)
                            .text(`Location: ${location}`)
                            .text(`Description: ${description}`)
                            .text(`Ameneties: ${amenities}`)
                            .moveDown();
                    }
                    pdfDoc.end();
                  }
                });
              }
            });
          }
        }
      });
    } else {
      // Creating query
      let query = 'SELECT *, (SELECT MAX(ROOM_PRICE) FROM room WHERE ACCOMMODATION_ID = accommodation.ACCOMMODATION_ID) AS MAX_PRICE FROM accommodation';
      if (name || address || location || type ) {
        query += ' WHERE ACCOMMODATION_ISARCHIVED = false AND';
        if (name) {
          query += ` ACCOMMODATION_NAME LIKE '%${name}%' AND`;
        }
        if (address) {
          query += ` ACCOMMODATION_ADDRESS LIKE '%${address}%' AND`;
        }
        if (location) {
          query += ` ACCOMMODATION_LOCATION = '${location}' AND`;
        }
        if (type) {
          query += ` ACCOMMODATION_TYPE = '${type}' AND`;
        }
        // remove the last 'AND' if present
        query = query.replace(/AND\s*$/, '');
        query += ' ORDER BY ACCOMMODATION_NAME';
  
        pool.getConnection((err, connection) => {
          if (err) {
            console.log("Error: " + err);
                return res.send({ message: "An error occured. PDF Cannot be generated" });
          } else {
            connection.query(query, (err, results) => {
              if (err) {
                console.log("Error: " + err);
                return res.send({ message: "An error occured. PDF Cannot be generated" });
              } else {
                // Setting Headers
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename=report.pdf');
  
                // Creating PDF document
                const pdfDoc = new pdf();
                pdfDoc.pipe(res);
  
                pdfDoc.fontSize(25).text("Search Results for");
                // Generating search filters
                let filter = ""
                if (name) {
                  filter += "Name: " + name + "\n";
                }
                if (address) {
                  filter += "Address: " + address + "\n";
                }
                if (location) {
                  filter += "Location: " + location + "\n";
                }
                if (priceFrom) {
                  filter += "Price From: " + priceFrom + "\n";
                }
                if (priceTo) {
                  filter += "Price To: " + priceTo + "\n";
                }
                if (capacity) {
                  filter += "Capacity: " + capacity + "\n";
                }
                pdfDoc.fontSize(12).text(filter).moveDown();
                pdfDoc.fontSize(18).text("Showing " + results.length + " results")
  
                accoms = JSON.parse(JSON.stringify(results));
                for (i = 0; i < accoms.length; i++) {
                  accom = accoms[i];
    
                  const name = accom.ACCOMMODATION_NAME;
                  const type = accom.ACCOMMODATION_TYPE;
                  const address = accom.ACCOMMODATION_ADDRESS;
                  const location = accom.ACCOMMODATION_LOCATION;
                  const description = accom.ACCOMMODATION_DESCRIPTION;
                  const amenities = accom.ACCOMMODATION_AMENITIES;
    
                  pdfDoc.fontSize(12).text(`Name: ${name}`)
                        .text(`Type: ${type}`)
                        .text(`Address: ${address}`)
                        .text(`Location: ${location}`)
                        .text(`Description: ${description}`)
                        .text(`Ameneties: ${amenities}`)
                        .moveDown();
                }
                pdfDoc.end();
              }
            });
          }
        });
      }
    }
  }
  
  // ===================================== END OF REPORT MANAGEMENT FEATURES =====================================