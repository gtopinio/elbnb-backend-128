const authController = require("./auth-controller");

module.exports = (app, pool) => {
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
    app.post("/accommodation/upload-accommodation-pic", authController.uploadAccommodationPic(pool));
    app.post("/accommodation/get-accommodation-pic", authController.getAccommodationPic(pool));
    app.post("/accommodation/remove-accommodation-pic", authController.removeAccommodationPicture(pool));
    app.post("/accommodation/update-accommodation-pic", authController.updateAccommodationPicture(pool));
    app.post("/user/upload-user-pic", authController.uploadUserPic(pool));
    app.post("/user/get-user-pic", authController.getUserPic(pool));
    app.post("/user/remove-user-pic", authController.removeUserPicture(pool));
    app.post("/user/update-user-pic", authController.updateUserPicture(pool));
    app.post("/accommodation/get-rooms", authController.getRoomsByAccommodationName(pool));
    app.post("/accommodation/add-room", authController.addNewRoom(pool));
    app.post("/accommodation/edit-room", authController.editRoom(pool));
    app.post("/accommodation/archive-room", authController.archiveRoom(pool));
    app.post("/accommodation/delete-room", authController.deleteRoom(pool));
    app.post("/accommodation/add-review", authController.addReview(pool));
    app.post("/accommodation/edit-review", authController.editReview(pool));
    app.post("/accommodation/delete-review", authController.deleteReview(pool));
    app.post("/accommodation/add-to-favorites", authController.triggerFavorite(pool));
    app.post("/accommodation/remove-from-favorites", authController.triggerFavorite(pool));
    app.get("/get-top-five-accommodations", authController.getFeaturedAccommodations(pool));
    app.post("/accommodation/is-favorite", authController.isAccommodationFavorited(pool));
    app.post("/accommodation/get-reviews", authController.getAccommodationReviews(pool));
    app.post("/accommodation/get-ratings", authController.getAccommodationAverageRating(pool));
    app.get("/view-all-students", authController.viewAllStudents(pool));
}