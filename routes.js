const userController = require("./controllers/user-controller");
const accomodationController = require("./controllers/accommodation-controller");
const roomController = require("./controllers/room-controller");
const reviewController = require("./controllers/review-controller");
const reportController = require("./controllers/report-controller");

module.exports = (app, pool) => {
    // endpoints with GET method
    app.get("/view-all-students", userController.viewAllStudents(pool));
    app.get("/view-all-owners", userController.viewAllOwners(pool));
    app.get("/get-top-five-accommodations", reviewController.getFeaturedAccommodations(pool));

    // endpoints with POST method

    // user management endpoints
    app.post("/signUp", userController.signUp(pool));
    app.post("/login", userController.login(pool));
    app.post("/checkIfLoggedIn", userController.checkIfLoggedIn(pool));
    app.post("/delete-user", userController.deleteUserByEmail(pool));
    app.post("/edit-user", userController.editUserByEmail(pool));
    app.post("/view-user", userController.viewProfile(pool));
    app.post("/user/upload-user-pic", userController.uploadUserPic(pool));
    app.post("/user/get-user-pic", userController.getUserPic(pool));
    app.post("/user/remove-user-pic", userController.removeUserPicture(pool));
    app.post("/filter-users", userController.filterUsersByString(pool));
    app.post("/user/get-all-favorites", reviewController.getUserFavorites(pool));
    app.post("/owner/get-average-rating", userController.getOwnerAverageRating(pool));
    app.post("/get-user-by-id", userController.viewProfileById(pool));

    // accommodation management endpoints
    app.post("/add-accommodation", accomodationController.addAccommodation(pool));
    app.post("/edit-accommodation", accomodationController.editAccommodation(pool));
    app.post("/archive-accommodation", accomodationController.archiveAccommodation(pool));
    app.post("/delete-accommodation", accomodationController.deleteAccommodation(pool));
    app.post("/view-accommodation", accomodationController.viewAccommodation(pool));
    app.post("/filter-accommodation", accomodationController.filterAccommodations(pool));
    app.post("/accommodation/upload-accommodation-pic", accomodationController.uploadAccommodationPic(pool));
    app.post("/accommodation/get-accommodation-pic", accomodationController.getAccommodationPic(pool));
    app.post("/accommodation/remove-accommodation-pic", accomodationController.removeAccommodationPicture(pool));
    app.post("/accommodation/get-user-accommodations", accomodationController.getAccommodationsByOwner(pool));

    // room management endpoints
    app.post("/accommodation/add-room", roomController.addNewRoom(pool));
    app.post("/accommodation/get-rooms", roomController.getRoomsByAccommodationName(pool));
    app.post("/accommodation/view-room", roomController.viewRoom(pool));
    app.post("/accommodation/edit-room", roomController.editRoom(pool));
    app.post("/accommodation/archive-room", roomController.archiveRoom(pool));
    app.post("/accommodation/delete-room", roomController.deleteRoom(pool));
    app.post("/accommodation/room/upload-room-pic", roomController.uploadRoomPic(pool));
    app.post("/accommodation/room/get-room-pic", roomController.getRoomPic(pool));
    app.post("/accommodation/room/remove-room-pic", roomController.removeRoomPicture(pool));

    // review + favorite + rating management endpoints
    app.post("/accommodation/add-review", reviewController.addReview(pool));
    app.post("/accommodation/edit-review", reviewController.editReview(pool));
    app.post("/accommodation/delete-review", reviewController.deleteReview(pool));
    app.post("/accommodation/add-to-favorites", reviewController.addAccommodationToFavorite(pool));
    app.post("/accommodation/remove-from-favorites", reviewController.removeAccommodationFromFavorite(pool));
    app.post("/accommodation/is-favorite", reviewController.isAccommodationFavorited(pool));
    app.post("/accommodation/get-reviews", reviewController.getAccommodationReviews(pool));
    app.post("/accommodation/get-ratings", reviewController.getAccommodationAverageRating(pool));
    app.post("/accommodation/get-filtered-reviews-by-rating", reviewController.getFilteredAccommodationReviews(pool));
    
    // report management endpoints
    app.post("/generate-report", reportController.generateReport(pool));
}