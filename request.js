// This is a test file of POST requests for the server in TOPINIOMGC_exer6.js
import needle from "needle";

//================================================================

// Save user POST request (Valid User)

needle.post("http://localhost:3000/get-user",
    {
        firstName: "Tim",
        lastName: "Berners-Lee",
        email: "timbernerslee@w3c.com",
        age: 65,
    },
    (err,res) =>{
        console.log(res.body);
});