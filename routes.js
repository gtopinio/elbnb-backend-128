const authController = require("./auth-controller");

module.exports = (app, pool) => {

    app.get("/hello-world", authController.helloWorld);
    app.get("/get-users", authController.getUsers(pool));
    app.get("/signUp", authController.signUp(pool));
}
