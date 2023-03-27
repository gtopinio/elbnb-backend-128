const needle = require('needle')

//================================================================

// link to app
// const app = "https://mockup-backend-128.herokuapp.com"
const app = "http://localhost:3001";

// needle.post(app + "/signUp", {
//   first_name: "Samantha",
//   last_name: "Wong",
//   email: "samantha.wong_1989@yahoo.com",
//   password: "testPassword",
//   contact_no: "95563864191",
//   is_business_account: 1,
//   is_admin: 0
// }, (err, res) => {
//   console.log(res.body);
// });

needle.post(app + "/login", {
  email: "samantha.wong_1989@yahoo.com",
  password: "testPassword"
}, (err, res) => {
  console.log(res.body);
});

// needle.post(app + "/signUp", {
//   first_name: "Another",
//   last_name: "User",
//   email: "test@test.com",
//   contact_no: "09123456789",
//   is_business_account: 0,
//   is_admin: 0
// }, (err, res) => {
//   console.log(res.body);
// });

// needle.get(app + "/get-users",
//     (err,res) =>{
//         if(err) console.log(err);
//         else console.log(res.body);
// });