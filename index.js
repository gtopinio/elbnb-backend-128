// This file is for starting the actual backend server (CMSC 128 - E1L)

// Dependencies
const express = require("express");
const mysql = require("mysql");
const url = require("url");

// Port number : Use 3001 when testing locally
const PORT = process.env.PORT || 3001;
const app = express();
const appLink = "https://official-backend-128.herokuapp.com/"

// Parse the database URL from the config var
const dbUrl = url.parse(process.env.CLEARDB_DATABASE_URL);
console.log("URL: "+ dbUrl)
if (!dbUrl) {
  throw new Error('Database URL not found');
}

// Create a connection pool to the database
const pool = mysql.createPool({
  host: dbUrl.hostname,
  user: dbUrl.auth.split(':')[0],
  password: dbUrl.auth.split(':')[1],
  database: dbUrl.pathname.substring(1),
  connectionLimit: 10,
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

// The two lines below is to ensure that the server has parser to read the body of incoming requests
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// allow CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", appLink);
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Methods, Origin, Accept, Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

// Pass the database connection pool to your routes module
require("./routes")(app, pool);

// start server
app.listen(PORT, (err) => {
    if(err){ console.log(err);}
    else{console.log("Server listening at port " + PORT);}
});