

// ===================================== START OF REVIEW + FAVORITE + RATING MANAGEMENT FEATURES =====================================

/*
This function takes a database connection pool, an accommodation name (unique), and a callback function as inputs. 
It queries the database to retrieve the user ID for the provided name and passes the result to the callback function. 
If there is an error in the database query or connection, it logs the error and passes it to the callback function as the first parameter.
*/
function getUserIdByUsername(pool, name, callback) {
    pool.getConnection((err, connection) => {
      if (err) {
        console.log("Error: " + err);
        callback(err, null);
      } else {
        const checkQuery = `SELECT USER_ID FROM user WHERE USER_USERNAME = ?`;
        connection.query(checkQuery, [name], (err, result) => {
          if (err) {
            console.log("Get User Id Error: " + err);
            callback(err, null);
          } else {
            try{
              if(typeof result[0].USER_ID === "undefined") {
                console.log("Get User Id: Undefined Object");
                callback(null, 0);
              }
              else {
                console.log("Get User Id: Defined Object");
                callback(null, result[0].USER_ID);
              }
            } catch (err) {
              console.log("User Not Found...");
              callback(err, null);
            }
            
          }
        });
      }
    });
  }

// This function takes a database connection pool, an accommodation name (unique), and a callback function as inputs. 
// It queries the database to retrieve the accommodation ID for the provided name and passes the result to the callback function. 
// If there is an error in the database query or connection, it logs the error and passes it to the callback function as the first parameter.
function getAccommodationIdByName(pool, name, callback) {
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
            try{
              if(typeof result[0].ACCOMMODATION_ID === "undefined") {
                console.log("Get Accom Id: Undefined Object");
                callback(null, 0);
              }
              else {
                console.log("Get Accom Id: Defined Object");
                callback(null, result[0].ACCOMMODATION_ID);
              }
            } catch (err) {
              console.log("Accommodation Not Found...");
              callback(err, null);
            }
            
          }
        });
      }
    });
  }

// This is a function that allows the user to leave a rating and review an accomodation.
// It takes a database connection pool as input, along with the rating, comment, username, timestamp and accommodation name.
// It then queries the database to retrieve the user ID and accommodation ID for the provided username and accommodation name.
// If the user ID and accommodation ID are found, it inserts the rating and review into the database.
// Otherwise, it returns a response indicating the unsuccessful operation to the client.
exports.addReview = (pool) => (req, res) => {
    const{rating, comment, userName, timestamp, accommName} = req.body;
  
    console.log("----------Rating and Review----------");
    console.log("Rating: " + rating);
    console.log("Review: " + comment);
  
    var uid = null;
    var accomid = null;
  
    getUserIdByUsername(pool, userName, (err, userId) => {
      if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
      }
      else if(userId>0){
        uid = userId;
        getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
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
  
/*
This function adds an accomodation to the favorites of the user. It finds the userid by using the username of the user and the accommodation id using the accommodation
name. After getting the connect established after finding the user id and accommodation id, it will then do a select query to see if the favorite already exists. If it
does, it will perform a delete and if it does not exists, it will perform insert instead.
*/
exports.triggerFavorite = (pool) => (req, res) => {
const {userName, accommName, addToFavorite} = req.body;

console.log("----------Favorite----------");
console.log("username: " + userName);
console.log("accommodation name: " + accommName);
console.log("add to favorite: " + addToFavorite);

var uId = null;
var aId = null;

getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
    console.log("Error: " + err);
    return res.send({ success: false });
    }
    else if(userId>0){
    uId = userId;
    // print out user id
    console.log("User Id: " + uId);

    // Get Accommodation Id
    getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
        if(err){
        console.log("Error: " + err);
        return res.send({ success: false });
        }
        else if(accommodationId>0){
        aId = accommodationId;
        // print out accommodation id
        console.log("Accommodation Id: " + aId);

        // Begin Transaction for Favorite (either insert or delete)
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
                
                connection.query(selectQuery, [uId, aId], (err, result) => {
                if(err){
                    console.log("Error: " + err);
                    return res.send({ success: false })
                }
                else if(result[0].count>0 && addToFavorite === false){
                    //remove the favorite
                    const deleteQuery = `DELETE FROM favorite WHERE USER_ID = '?' AND ACCOMMODATION_ID = '?'`;
        
                    connection.query(deleteQuery, [uId, aId], (err, result) => {
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
                            console.log("Favorite has been removed!");
                            return res.send({ success: true });
                        }
                        })
                    }
                    })
                }
                else if(result[0].count === 0 && addToFavorite){
                    //insert to favorites
                    const insertQuery = `INSERT INTO favorite (USER_ID, ACCOMMODATION_ID) VALUES (?, ?)`;
        
                    connection.query(insertQuery, [uId, aId], (err, result1) => {
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
                } else {
                    console.log("result: " + result[0].count);
                    console.log("Either Add to Favorites Error or Favorite already exists!");
                    return res.send({ success: false });                  
                }
                });
            }
            })
        });
        }
        else{
        console.log("Accommodation not found! Cannot be added to favorites");
        return res.send({ success: false });
        }
    });

    }
    else{
    console.log("User not found! Cannot be added to favorites");
    return res.send({ success: false });
    }
});
}

/*
This function lets the user edit the review that they gave to an accommodation. It uses the username, the accomodation name, and the
date timestamp to find the correct review to edit.
*/
exports.editReview = (pool) => (req, res) => {
const {rating, comment, timestamp, userName, accommName} = req.body;

console.log("----------Edit Review----------");
console.log("Rating: " + rating);
console.log("Comment: " + comment);
console.log("Date: " + timestamp);
console.log("Username: " + userName);
console.log("Accommodation Name: " + accommName);

var uId = null;
var aId = null;

getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
    console.log("Error: " + err);
    return res.send({ success: false });
    }
    else if(userId>0){
    uId = userId;
    getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
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

console.log("----------Delete----------");
console.log("username: " + userName);
console.log("accommodation name: " + accommName);

var uId = null;
var aId = null;

getUserIdByUsername(pool, userName, (err, userId) => {
    if(err){
    console.log("Error: " + err);
    return res.send({ success: false });
    }
    else if(userId>0){
    uId = userId;
    getAccommodationIdByName(pool, accommName, (err, accommodationId) => {
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
})
}

/* This code exports a function that retrieves the top 5 featured accommodation based on their
average review rating. It uses a SQL query to join the accommodation and review tables, group the
results by accommodation ID, calculate the average rating, and order the results by the average
rating in descending order. The function takes a database connection pool as a parameter and returns
a middleware function that handles HTTP requests and responses. If there is an error in the database
query, the function returns a response with success set to false. Otherwise, it returns a response
with success set to true and the list of featured accommodation. */
exports.getFeaturedAccommodations = (pool) => (req, res) => {

// Query that gets the top 5 featured accommodation based on their average review rating
const query = `
SELECT a.ACCOMMODATION_ID, a.ACCOMMODATION_NAME, a.ACCOMMODATION_TYPE, a.ACCOMMODATION_DESCRIPTION, a.ACCOMMODATION_AMENITIES, a.ACCOMMODATION_ADDRESS, a.ACCOMMODATION_LOCATION, a.ACCOMMODATION_OWNER_ID, AVG(r.REVIEW_RATING) AS AVERAGE_RATING
FROM accommodation a
JOIN review r ON a.ACCOMMODATION_ID = r.ACCOMMODATION_ID
GROUP BY a.ACCOMMODATION_ID
ORDER BY AVERAGE_RATING DESC
LIMIT 5
`;

// Printing the query
console.log("Query: " + query);

pool.query(query, (err, results) => {
    if (err) {
    console.log("Featured Accommodations Error: " + err);
    return res.send({ success: false });
    } else {
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

getUserIdByUsername(pool, username, (err, userId) => {
    if (err) {
    console.log("Error: " + err);
    return res.send({ success: false });
    } else if (userId > 0 && typeof userId !== 'undefined') {
    getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
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
            return res.send({ success: true, isFavorite: true });
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
The function first retrieves the ID of the accommodation using the getAccommodationIdByName
function. If the ID is found, it then executes a SQL query to retrieve all reviews for that
accommodation and sends the results back in the response. If there is an error at any point, the
function sends a response with success set to false. */
exports.getAccommodationReviews = (pool) => (req, res) => {
const {accommodationName} = req.body;

getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
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

// This function takes a database connection pool, an accommodation name and gets the average rating for that accommodation.
exports.getAccommodationAverageRating = (pool) => (req, res) => {
const {accommodationName} = req.body;

getAccommodationIdByName(pool, accommodationName, (err, accommodationId) => {
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

// ===================================== END OF REVIEW + FAVORITE + RATING MANAGEMENT FEATURES =====================================