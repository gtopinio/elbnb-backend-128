const authController = require("./auth-controller");

module.exports = (app) => {

    app.post("/hello-world", authController.helloWorld);
}