// Import the necessary models.
const { Accommodation: ReviewController_Accommodation } = require("../models/accommodation");
const { User: ReviewController_User } = require("../models/user");

// ===================================== START OF REVIEW + FAVORITE + RATING MANAGEMENT FEATURES =====================================

// This is a function that allows the user to leave a rating and review an accomodation.
// It takes a database connection pool as input, along with the rating, comment, username, timestamp and accommodation name.
// It then queries the database to retrieve the user ID and accommodation ID for the provided username and accommodation name.
// If the user ID and accommodation ID are found, it inserts the rating and review into the database.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.addReview = (pool) => (req, res) => {
    const{rating, comment, userName, timestamp, accommName} = req.body;
  
    console.log("----------Add Review Feature----------");
    console.log("Rating: " + rating);
    console.log("Review: " + comment);
    console.log("Username: " + userName);
    console.log("Time Stamp: " + timestamp);
    console.log("Accommodation Name: "+ accommName);

  
    var uid = null;
    var accomid = null;
  
    ReviewController_User.getUserIdByUsername(pool, userName, (err, userId) => {
      if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
      }
      else if(userId>0){
        uid = userId;
        ReviewController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
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
                  const selectQuery = `SELECT COUNT(*) AS count FROM review WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;
                  
                  connection.query(selectQuery, [uid, accomid], (err, result) => {
                    if(err){
                      console.log("Error: " + err);
                      return res.send({ success: false })
                    }
                    else if(result[0].count>0){
                      console.log("Review from user already exist");
                      return res.send({ success: false })
                    }
                    else{
                      const insertQuery = `INSERT INTO review (REVIEW_RATING, REVIEW_COMMENT, REVIEW_DATE, USER_ID, ACCOMMODATION_ID) VALUES (?, ?, ?, ?, ?)`;
  
                      connection.query(insertQuery, [rating, comment, timestamp, uid, accomid], (err, result1) => {
                        if(err){
                          connection.rollback(() => {
                            console.log("Insert review error: " + err);
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
                              console.log("Review has been inserted!");
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
            console.log("Accomodation not found! Cannot add review");
            return res.send({ success: false });
          }
        })
      }
      else{
        console.log("User not found! Cannot add review");
        return res.send({ success: false });
      }
    })
  }
  

  // This function adds an accommodation to a user's favorites list using the favorite table. It takes a database connection pool as input, along with the username and accommodation name.
// It then queries the database to retrieve the user ID and accommodation ID for the provided username and accommodation name.
// If the user ID and accommodation ID are found, it inserts the favorite into the database only if it does not already exist.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.addAccommodationToFavorite = (pool) => (req, res) => {
    const{userName, accommName} = req.body;
    console.log("----------Add Accommodation to Favorite Feature----------");
    console.log("Username: " + userName);
    console.log("Accommodation Name: " + accommName);

    // check if user exist
    ReviewController_User.getUserIdByUsername(pool, userName, (err, userId) => {
      if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
      }
      else if(userId>0){
        // check if accommodation exist
        ReviewController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
          if(err){
            console.log("Error: " + err);
            return res.send({ success: false });
          }
          else if(accommodationId>0){
            // begin transaction
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
                  const selectQuery = `SELECT COUNT(*) AS count FROM favorite WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;
                  connection.query(selectQuery, [userId, accommodationId], (err, result) => {
                    if(err){
                      console.log("Error: " + err);
                      return res.send({ success: false })
                    }
                    else if(result[0].count>0){
                      console.log("Favorite from user already exist");
                      return res.send({ success: false })
                    }
                    else{
                      const insertQuery = `INSERT INTO favorite (USER_ID, ACCOMMODATION_ID) VALUES (?, ?)`;
                      connection.query(insertQuery, [userId, accommodationId], (err, result1) => {
                        if(err){
                          connection.rollback(() => {
                            console.log("Insert favorite error: " + err);
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
                              console.log("Favorite has been inserted!");
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
            console.log("Accomodation not found! Cannot add favorite");
            return res.send({ success: false });
          }
        })
      }
      else{
        console.log("User not found! Cannot add favorite");
        return res.send({ success: false });
      }
    })
  }

// Function to remove an accommodation from a user's favorites list. It takes a database connection pool as input, along with the username and accommodation name.
// It then queries the database to retrieve the user ID and accommodation ID for the provided username and accommodation name.
// If the user ID and accommodation ID are found, it deletes the favorite from the database only if it exists.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.removeAccommodationFromFavorite = (pool) => (req, res) => {
    const{userName, accommName} = req.body;
    console.log("----------Remove Accommodation from Favorite Feature----------");
    console.log("Username: " + userName);
    console.log("Accommodation Name: " + accommName);
    // check if user exist
    ReviewController_User.getUserIdByUsername(pool, userName, (err, userId) => {
      if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
      }
      else if(userId>0){
        // check if accommodation exist
        ReviewController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
          if(err){
            console.log("Error: " + err);
            return res.send({ success: false });
          }
          else if(accommodationId>0){
            // begin transaction
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
                  const selectQuery = `SELECT COUNT(*) AS count FROM favorite WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;
                  connection.query(selectQuery, [userId, accommodationId], (err, result) => {
                    if(err){
                      console.log("Error: " + err);
                      return res.send({ success: false })
                    }
                    else if(result[0].count==0){
                      console.log("Favorite from user does not exist");
                      return res.send({ success: false })
                    }
                    else{
                      const deleteQuery = `DELETE FROM favorite WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;
                      connection.query(deleteQuery, [userId, accommodationId], (err, result1) => {
                        if(err){
                          connection.rollback(() => {
                            console.log("Delete favorite error: " + err);
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
                              console.log("Favorite has been deleted!");
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
            console.log("Accomodation not found! Cannot delete favorite");
            return res.send({ success: false });
          }
        })
      }
      else{
        console.log("User not found! Cannot delete favorite");
        return res.send({ success: false });
      }
    })
  }



/*
This function lets the user edit the review that they gave to an accommodation. It uses the username, the accomodation name, and the
date timestamp to find the correct review to edit.
*/
exports.editReview = (pool) => (req, res) => {
const {rating, comment, timestamp, userName, accommName} = req.body;

console.log("----------Edit Review Feature----------");
console.log("Rating: " + rating);
console.log("Review: " + comment);
console.log("Username: " + userName);
console.log("Time Stamp: " + timestamp);
console.log("Accommodation Name: "+ accommName);

var uId = null;
var aId = null;

ReviewController_User.getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
    console.log("Error: " + err);
    return res.send({ success: false });
    }
    else if(userId>0){
    uId = userId;
    ReviewController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
        }
        else if(accommodationId>0){
        aId = accommodationId;

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
                const editQuery = `UPDATE review SET REVIEW_RATING = ?, REVIEW_DATE = ?, REVIEW_COMMENT = ? WHERE USER_ID = ? AND ACCOMMODATION_ID = ?`;

                connection.query(editQuery, [rating, timestamp, comment, uId, aId], (err, result) => {
                if(err){
                    connection.rollback(() => {
                    console.log("Edit review error: " + err);
                    return res.send({ success: false });
                    })
                } // Else if the result is empty, then the review does not exist
                else if(result.affectedRows === 0){
                    connection.rollback(() => {
                    console.log("Review does not exist");
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
                        console.log("Review has been edited");
                        return res.send({ success: true });
                    }
                    })
                }
                })
            }
            })
        });
        }
        else{
        console.log("Accommodation not found! Cannot edit review");
        return res.send({ success: false });
        }
    })
    }
    else{
    console.log("User not found! Cannot edit review");
    return res.send({ success: false });
    }
})
}

// This function lets the user delete a review that they gave to an accommodation.
exports.deleteReview = (pool) => (req, res) => {
    const {userName, accommName} = req.body;

  console.log("----------Delete Review Feature----------");
  console.log("username: " + userName);
  console.log("accommodation name: " + accommName);

    var uId = null;
    var aId = null;

    ReviewController_User.getUserIdByUsername(pool, userName, (err, userId) => {
        if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
        }
        else if(userId>0){
        uId = userId;
        ReviewController_Accommodation.getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
            if(err){
            console.log("Error: " + err);
            return res.send({ success: false });
            }
            else if(accommodationId>0){
            aId = accommodationId;

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
                    const deleteQuery = `DELETE FROM review WHERE USER_ID = '?' AND ACCOMMODATION_ID = '?'`;

                    connection.query(deleteQuery, [uId, aId], (err, result) => {
                    if(err){
                        connection.rollback(() => {
                        console.log("Delete review error: " + err);
                        return res.send({ success: false });
                        })
                    }
                    else if (result.affectedRows == 0){
                        connection.rollback(() => {
                        console.log("Review not found! Cannot be deleted");
                        return res.send({ success: false });
                        });
                    } else {
                        connection.commit((err) => {
                        if(err){
                            connection.rollback(() => {
                            console.log("Commit error: " + err);
                            return res.send({ success: false });
                            })
                        }
                        else{
                            console.log("Review has been deleted!");
                            return res.send({ success: true });
                        }
                        })
                    }
                    })
                }
                })
            });
            }
            else{
            console.log("Accommodation not found! Review cannot be deleted");
            return res.send({ success: false });
            }
        })
        }
        else{
        console.log("User not found! Review cannot be deleted");
        return res.send({ success: false });
        }
    });
}

/* This code exports a function that retrieves the top 5 featured accommodation based on their
average review rating. It uses a SQL query to join the accommodation and review tables, group the
results by accommodation ID, calculate the average rating, and order the results by the average
rating in descending order. The function takes a database connection pool as a parameter and returns
a middleware function that handles HTTP requests and responses. If there is an error in the database
query, the function returns a response with success set to false. Otherwise, it returns a response
with success set to true and the list of featured accommodation. */
exports.getFeaturedAccommodations = (pool) => (req, res) => {
    console.log("----------Get Featured Accommodations----------");
    const {type} = req.body;
    
    var query;
    if(type === "" || type === null){
        // Query that gets the top 5 featured accommodation based on their average review rating
         query = `
        SELECT a.ACCOMMODATION_ID, a.ACCOMMODATION_NAME, a.ACCOMMODATION_TYPE, a.ACCOMMODATION_DESCRIPTION, a.ACCOMMODATION_AMENITIES, a.ACCOMMODATION_ADDRESS, a.ACCOMMODATION_LOCATION, a.ACCOMMODATION_OWNER_ID, AVG(r.REVIEW_RATING) AS AVERAGE_RATING
        FROM accommodation a
        LEFT JOIN room rm ON a.ACCOMMODATION_ID = rm.ACCOMMODATION_ID 
        JOIN review r ON a.ACCOMMODATION_ID = r.ACCOMMODATION_ID
        GROUP BY a.ACCOMMODATION_ID
        ORDER BY AVERAGE_RATING DESC
        LIMIT 5
        `;
    } else {
        // Query that gets the top 5 featured accommodation based on their average review rating and type
        query = `
        SELECT a.ACCOMMODATION_ID, a.ACCOMMODATION_NAME, a.ACCOMMODATION_TYPE, a.ACCOMMODATION_DESCRIPTION, a.ACCOMMODATION_AMENITIES, a.ACCOMMODATION_ADDRESS, a.ACCOMMODATION_LOCATION, a.ACCOMMODATION_OWNER_ID, AVG(r.REVIEW_RATING) AS AVERAGE_RATING
        FROM accommodation a
        LEFT JOIN room rm ON a.ACCOMMODATION_ID = rm.ACCOMMODATION_ID 
        JOIN review r ON a.ACCOMMODATION_ID = r.ACCOMMODATION_ID
        WHERE a.ACCOMMODATION_TYPE = ?
        GROUP BY a.ACCOMMODATION_ID
        ORDER BY AVERAGE_RATING DESC
        LIMIT 5
        `;
    }

  pool.query(query, [type], (err, results) => {
      if (err) {
          console.log("Featured Accommodations Error: " + err);
          return res.send({ success: false });
      } else {
          console.log("Featured Accommodations: ");
          // Printing the results one by one
          for (let i = 0; i < results.length; i++) {
              console.log(results[i].ACCOMMODATION_NAME);
          }
          return res.send({ success: true, accommodation: results });
      }
  });
};

/* This code is a function that checks if a given accommodation is favorited by a given user. It
takes in a database connection pool as a parameter and returns a function that handles HTTP
requests. The function extracts the username and accommodation name from the request body, retrieves
the user ID and accommodation ID from the database using helper functions, and then checks if there
is a record in the "favorite" table that matches the user ID and accommodation ID. If there is a
match, it returns a response indicating that the accommodation is favorited by the user, otherwise
it returns a response indicating that it is not */
exports.isAccommodationFavorited = (pool) => (req, res) => {
  const {username, accommodationName} = req.body;
  console.log("----------Is Accommodation Favorited----------");
  console.log("username: " + username);
  console.log("accommodation name: " + accommodationName);

  ReviewController_User.getUserIdByUsername(pool, username, (err, userId) => {
      if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
      } else if (userId > 0 && typeof userId !== 'undefined') {
      ReviewController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
          if (err) {
          console.log("Error: " + err);
          return res.send({ success: false });
          } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
          const isFavoriteQuery = `
              SELECT *
              FROM favorite
              WHERE USER_ID = ? AND ACCOMMODATION_ID = ?
          `;
          pool.query(isFavoriteQuery, [userId, accommodationId], (err, result) => {
              if (err) {
              console.log("Error checking if favorite: " + err);
              return res.send({ success: false, isFavorite: false });
              } else {
                // check the result of the query to see if there is a match
                if (result.length > 0) {
                  return res.send({ success: true, isFavorite: true });
                }
                else {
                  return res.send({ success: true, isFavorite: false });
                }
              }
          });
          }
      });
      }
  });
};

/* This code is defining a function that retrieves the reviews of an accommodation from a MySQL
database using a pool connection. The function takes in a pool connection as a parameter and returns
a middleware function that handles a POST request with an accommodation name in the request body.
The function first retrieves the ID of the accommodation using the ReviewController_Accommodation.getAccommodationIdByName
function. If the ID is found, it then executes a SQL query to retrieve all reviews for that
accommodation and sends the results back in the response. If there is an error at any point, the
function sends a response with success set to false. */
exports.getAccommodationReviews = (pool) => (req, res) => {
  const {accommodationName} = req.body;
  console.log("----------Get Accommodation Reviews----------");
  console.log("Accommodation name: " + accommodationName);

  ReviewController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
      if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
      } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
      const ratingsQuery = `
          SELECT *
          FROM review
          WHERE ACCOMMODATION_ID = ?
      `;
      pool.query(ratingsQuery, [accommodationId], (err, results) => {
          if (err) {
          console.log("Error getting ratings: " + err);
          return res.send({ success: false });
          } else {
          return res.send({ success: true, reviews: results });
          }
      });
      }
  });
}

/* This code is defining a function that retrieves the filtered reviews of an accommodation from a MySQL
database using a pool connection. The function takes in a pool connection as a parameter and returns
a middleware function that handles a POST request with an accommodation name in the request body.
The function first retrieves the ID of the accommodation using the ReviewController_Accommodation.getAccommodationIdByName
function. If the ID is found, it then executes a SQL query to retrieve all reviews based on a filter for that
accommodation and sends the results back in the response. If there is an error at any point, the
function sends a response with success set to false. */
exports.getFilteredAccommodationReviews = (pool) => (req, res) => {
  const {accommodationName, filter} = req.body;
  
  ReviewController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
      if (err) {
      console.log("Error: " + err);
      return res.send({ success: false });
      } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
      const ratingsQuery = `
          SELECT *
          FROM review
          WHERE ACCOMMODATION_ID = ? AND (REVIEW_RATING=? OR REVIEW_RATING=?+0.5)
      `;
      pool.query(ratingsQuery, [accommodationId, filter, filter], (err, results) => {
          if (err) {
          console.log("Error getting ratings: " + err);
          return res.send({ success: false });
          } else {
          return res.send({ success: true, reviews: results });
          }
      });
      }
  });
  }

// This function takes a database connection pool, an accommodation name and gets the average rating for that accommodation.
exports.getAccommodationAverageRating = (pool) => (req, res) => {
const {accommodationName} = req.body;
console.log("----------Get Accommodation Average Rating----------");
console.log("Accommodation name: " + accommodationName);

ReviewController_Accommodation.getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
    if (err) {
    console.log("Error: " + err);
    return res.send({ success: false });
    } else if (accommodationId > 0 && typeof accommodationId !== 'undefined') {
    const ratingsQuery = `
        SELECT AVG(REVIEW_RATING) AS AVG_RATING
        FROM review
        WHERE ACCOMMODATION_ID = ?
    `;
    pool.query(ratingsQuery, [accommodationId], (err, results) => {
        if (err) {
        console.log("Error getting ratings: " + err);
        return res.send({ success: false });
        } else {
        console.log("Average Rating of " + accommodationName + ": " + results[0].AVG_RATING);
        return res.send({ success: true, averageRating: results[0].AVG_RATING });
        }
    });
    }
});
}

 // This function takes a database connection pool, a username and gets all favorites for that user.
  exports.getUserFavorites = (pool) => (req, res) => {
    const {username} = req.body;
    console.log("----------Get All User Favorites----------");
    console.log("Username: " + username);

    // Ensure that the user exists
    ReviewController_User.getUserIdByUsername(pool, username, (err, userId) => {
      if (err) {
        console.log("Error: " + err);
        return res.send({ success: false , message: "Error getting favorites"});
      } else if (userId > 0 && typeof userId !== 'undefined') {
        // The favorite tables contains the user ID and accommodation ID of all favorites
        const favoritesQuery = `
          SELECT ACCOMMODATION_ID
          FROM favorite
          WHERE USER_ID = ?
        `;
        pool.query(favoritesQuery, [userId], (err, results) => {
          if (err) {
            console.log("Error getting favorites: " + err);
            return res.send({ success: false , message: "Error getting favorites"});
          } else {
            const accommodationIds = results.map(result => result.ACCOMMODATION_ID);

            if (accommodationIds.length === 0) {
              // If no accommodation IDs found, return empty favorites
              return res.send({ success: true, favorites: [] });
            } else {
                const placeholders = accommodationIds.map(() => '?').join(', ');

              // once we have all the accommodation IDs, we can get the accommodation(s) from the accommodation table
              const accommodationQuery = `
                SELECT *
                FROM accommodation
                WHERE ACCOMMODATION_ID IN (${placeholders})
              `;
              pool.query(accommodationQuery, accommodationIds, (err, results) => {
                if (err) {
                  console.log("Error getting favorites: " + err);
                  return res.send({ success: false , message: "Error getting favorites"});
                } else {
                  return res.send({ success: true, favorites: results });
                }
              });

            }  
          }
        });
      }
    });
  }

// ===================================== END OF REVIEW + FAVORITE + RATING MANAGEMENT FEATURES =====================================