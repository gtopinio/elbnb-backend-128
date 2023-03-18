const authController = require("./auth-controller");

module.exports = (app, pool) => {

    app.post("/hello-world", (req, res) => authController.helloWorld(req, res));
    app.post("/get-users", (req, res) => authController.getUsers(req, res, pool));
    app.post("/signUp", (req, res) => authController.signUp(req, res, pool));
};
