// This file is the backbone of the server. It supplies the functionalities for HTTP requests

// SAMPLE ROUTE - used in mockup server to say "Hello World!"
exports.helloWorld = (req, res) => {
    res.send("Hello World!");
  }

// SAMPLE ROUTE - used in mockup server to get mockup user data
exports.getUsers = (pool) => (req, res) => {
pool.getConnection((err, connection) => {
if (err) console.log(err);

connection.query('SELECT * FROM User', (err, results, fields) => {
    if (err) console.log("Query Error:\n" + err);
    console.log(results);

    connection.release();

    res.send(results);
});
});
}


// =================== Function Templates implemented from Mongoose/MongoDB integrated server ===================

// // get user model registered in Mongoose
// const User = mongoose.model("User");
// const Post = mongoose.model("Post")

// // function for signing up. It creates a new User instance based on the details inputted by the user. The new instance is saved into the database.
// exports.signUp = (req, res) => {
//     const newUser = new User({
//         firstName : req.body.firstName,
//         lastName : req.body.lastName,
//         email : req.body.email,
//         password : req.body.password
//     });

//     console.log("New user:");
//     console.log(newUser);

//     newUser.save((err) => {
//         if(err) { return res.send({ success: false }); }
//         else { return res.send({ success: true}); }
//     });
// }

// // function for logging in. It validates the email and password. It also gives a token if all details are validated.
// exports.login = (req, res) => {
//     const email = req.body.email.trim();
//     const password = req.body.password;

//     User.findOne({ email }, (err, user) => {
//         // check if email exists
//         if(err || !user){
//             // Scenario 1: FAIL - User doesn't exist
//             console.log("User doesn't exist");
//             return res.send({ success: false });
//         }

//         // check if password is correct
//         user.comparePassword(password, (err, isMatch) => {
//             if(err || !isMatch){
//                 // Scenario 2: FAIL - Wrong password
//                 console.log("Wrong password");
//                 return res.send( {success: false });
//             }

//             console.log("Successfully logged-in");

//             // Scenario 3: SUCCESS - time to create a token
//             const tokenPayload = {
//                 _id: user._id
//             }

//             const token = jwt.sign(tokenPayload, "THIS_IS_A_SECRET_STRING");

//             // return the token to the client
//             return res.send({ success: true, token, userFirstName: user.firstName, userLastName: user.lastName});
//         })
//     });

// }

// // function to check if there are cookies. It also validates the token embedded with the cookie. It also validates if the user details exist in the database.
// exports.checkIfLoggedIn = (req, res) => {

//     if(!req.cookies || !req.cookies.authToken){
//         // Scenario 1: FAIL - No cookies / no authToken cookie sent
//         return res.send({ isLoggedIn: false });
//     }

//     // Token is present. Validate it
//     return jwt.verify(
//         req.cookies.authToken,
//         "THIS_IS_A_SECRET_STRING",
//         (err, tokenPayload) => {
//             if(err){
//                 // Scenario 2: FAIL - Error validating token
//                 return res.send( {isLoggedIn: false });
//             }

//             const userId = tokenPayload._id;

//             // check if user exists
//             return User.findById(userId, (userErr, user) => {
//                 if(userErr || !user){
//                     // Scenario 3: FAIL - Failed to find user based on id inside token payload
//                     return res.send( {isLoggedIn: false });
//                 }

//                 // Scenario 4: SUCCESS - token and user id are valid
//                 console.log("User is currently logged in");
//                 return res.send( {isLoggedIn: true });
//             });
//         }
//     );
// }

// =================== END OF TEMPLATE ===================

/*
 *  TO DO: Implement these initial functions using MySQL 
 * 
 */




// function for signing up. It creates a new User instance based on the details inputted by the user. The new instance is saved into the database.



// function for logging in. It validates the email and password. It also gives a token if all details are validated.



// function to check if there are cookies. It also validates the token embedded with the cookie. It also validates if the user details exist in the database.