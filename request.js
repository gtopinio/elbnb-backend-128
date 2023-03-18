const needle = require('needle')

//================================================================

// link to app
const app = "https://mockup-backend-128.herokuapp.com/"

needle.post(app + "/get-users",
    (err,res) =>{
        if(err) console.log(err);
        else console.log(res.body);
});

const data = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@example.com',
    password: 'password123'
  };

needle.post(app + '/signUp', data, function(err, res, body) {
if (err) {
    console.error(err);
} else {
    console.log(body);
}
});