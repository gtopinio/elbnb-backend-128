const express = require("express");
const mysql = require("mysql");

const PORT = process.env.PORT || 3001;
const app = express();
const appLink = "https://mockup-backend-128.herokuapp.com/"

// Create a database connection pool
const pool = mysql.createPool({
  host:"us-cdbr-east-06.cleardb.net",
  user:"bb119cab8b99eb",
  password:"b30902db",
  database:"heroku_7b30b189342afea"
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
