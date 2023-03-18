const needle = require('needle')

//================================================================

// link to app
const app = "https://mockup-backend-128.herokuapp.com"

// needle.post(app + "/get-users",
//     (err,res) =>{
//         if(err) console.log(err);
//         else console.log(res.body);
// });

needle.post(app + "/signUp", {
    first_name: "Genesis",
    last_name: "Topinio",
    email: "mgct@example.com",
    password: "p@ssw0rd",
    username: "mgct",
    is_registered: true,
    is_admin: true,
    contact_no: "1234567890"
  }, (err, res) => {
    console.log(res.body);
  });