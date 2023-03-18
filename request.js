const needle = require('needle')

//================================================================

// link to app
const app = "https://mockup-backend-128.herokuapp.com"

needle.post(app + "/get-users",
    (err,res) =>{
        if(err) console.log(err);
        else console.log(res.body);
});

needle.post(app + "/signUp",
    {
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@example.com',
    password: 'password123'
    },
    (err,res) =>{
        console.log(res.body);
});