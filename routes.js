const authController = require("./auth-controller");

module.exports = (app, pool) => {

    app.post("/hello-world", authController.helloWorld);
    app.post("/get-users", authController.getUsers(pool));
    app.post("/signUp", authController.signUp(pool));
}
