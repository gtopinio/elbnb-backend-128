const authController = require("./auth-controller");

module.exports = (app) => {

    app.get("/hello-world", authController.helloWorld);
}