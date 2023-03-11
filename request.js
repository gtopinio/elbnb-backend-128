import needle from "needle";

//================================================================

// link to app
const app = "mockup-backend-128.heroku.com"

needle.get(app + "/get-users",
    (err,res) =>{
        if(err) console.log(err);
        else console.log(res.body);
});