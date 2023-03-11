import needle from "needle";

//================================================================

// Save user POST request (Valid User)

needle.get("http://localhost:3001/get-users",
    (err,res) =>{
        if(err) console.log(err);
        else console.log(res.body);
});