const express = require("express");

const PORT = 3001 || process.env.PORT;
const app = express();

// The two lines below is to ensure that the server has parser to read the body of incoming requests
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// declaring routes
require("./routes")(app);

// start server
app.listen(PORT, (err) => {
    if(err){ console.log(err);}
    else{console.log("Server listening at port " + PORT);}
});