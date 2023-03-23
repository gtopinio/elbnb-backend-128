// This file is for starting the actual backend server (CMSC 128 - E1L)

// Dependencies
const express = require("express");
const mysql = require("mysql");

// Port number : Use 3001 when testing locally
const PORT = process.env.PORT || 3001;
const app = express();

// Parse the database URL from the config var
const dbUrl = process.env.CLEARDB_DATABASE_URL;
const dbConfig = parseDbUrl(dbUrl);

// Create a database connection pool [Temporary database]
const pool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database:dbConfig.database,
  });

// Check if database is connected
pool.getConnection((err, connection) => {
  if (err) {
    console.log("Error connecting to database:", err);
  } else {
    console.log("Connected to database!");
    connection.release();
  }
});

// Function to parse the database URL into a config object
function parseDbUrl(dbUrl) {
  const dbUrlRegex = /^mysql:\/\/([\w-]+):([\w-]+)@([\w.-]+)\/([\w-]+)$/;
  const matches = dbUrl.match(dbUrlRegex);
  if (!matches) {
    throw new Error('Invalid database URL');
  }
  return {
    user: matches[1],
    password: matches[2],
    host: matches[3],
    database: matches[4],
  };
}

// The two lines below is to ensure that the server has parser to read the body of incoming requests
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// Pass the database connection pool to your routes module
require("./routes")(app, pool);

// start server
app.listen(PORT, (err) => {
    if(err){ console.log(err);}
    else{console.log("Server listening at port " + PORT);}
});