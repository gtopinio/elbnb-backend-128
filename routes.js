const authController = require("./auth-controller");

module.exports = (app, pool) => {

    app.get("/hello-world", authController.helloWorld);
    app.get("/get-users", authController.getUsers(pool));
    app.post("/signUp", authController.signUp(pool));
    app.post("/login", authController.login(pool));
    app.post("/checkIfLoggedIn", authController.checkIfLoggedIn(pool));
    app.post("/delete-user", authController.deleteUserByEmail(pool));
    app.post("/edit-user", authController.editUserByEmail(pool));
    app.post("/view-user", authController.viewProfile(pool));
    app.post("/add-accommodation", authController.addAccommodation(pool));
    app.post("/edit-accommodation", authController.editAccommodation(pool));
    app.post("/archive-accommodation", authController.archiveAccommodation(pool));
    app.post("/delete-accommodation", authController.deleteAccommodation(pool));
    app.post("/filter-accommodation", authController.filterAccommodations(pool));
    app.post("/accommodations/upload-pic", authController.uploadAccommodationPic(pool));
    app.post("/accommodation/add-review", authController.addReview(pool));
    app.post("/accommodation/edit-review", authController.editReview(pool));
    app.post("/accommodation/add-to-favorites", authController.addFavorite(pool));
    app.post("/accommodation/remove-from-favorites", authController.removeFavorite(pool));
}