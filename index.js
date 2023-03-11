const express = require("express");
const mysql = require("mysql");

const PORT = 3001;
const app = express();

// Create a database connection pool
const pool = mysql.createPool({
  host:"sql12.freesqldatabase.com",
  user:"sql12604743",
  password:"rt94McFHS5",
  database:"sql12604743"
});

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
