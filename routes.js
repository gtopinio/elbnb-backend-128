const authController = require("./auth-controller");

module.exports = (app, pool) => {

    app.get("/hello-world", authController.helloWorld);
    app.get("/get-users", authController.getUsers(pool));
    app.post("/signUp", authController.signUp(pool));
    app.post("/login", authController.login(pool));
    app.post("/checkIfLoggedIn", authController.checkIfLoggedIn(pool));
    app.post("/add-accommodation", authController.addAccommodation(pool));
    app.post("/filter-accommodation", authController.filterAccommodations(pool));
    app.post("/accommodations/upload-pic", authController.uploadAccommodationPic(pool));
}