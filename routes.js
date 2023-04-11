const authController = require("./auth-controller");
const multer = require('multer');

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg');
  }
});

// Set up multer upload configuration
const upload = multer({ storage: storage });

module.exports = (app, pool) => {

    app.get("/hello-world", authController.helloWorld);
    app.get("/get-users", authController.getUsers(pool));
    app.post("/signUp", authController.signUp(pool));
    app.post("/login", authController.login(pool));
    app.post("/checkIfLoggedIn", authController.checkIfLoggedIn(pool));
    app.post("/add-accommodation", authController.addAccommodation(pool));
    app.post("/get-accommid", authController.getAccommodationIdByName(pool));
    app.post("/filter-accommodation", authController.filterAccommodations(pool));
    app.post("/add-accommodation-picture", upload.single("picture") , authController.addAccommodationPictures(pool));
}