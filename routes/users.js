const express = require("express");
const router = express.Router();
const middleware = require("../middleware");
const { upload, cloudinary } = require("../utils/uploadImage");

// USER PROFILE
router.get("/:id", function (req, res) {
  User.findById(req.params.id, function (err, foundUser) {
    if (err) {
      req.flash("error", "Something went wrong.");
      return res.redirect("/");
    }
    Teacher.find()
      .where("author.id")
      .equals(foundUser._id)
      .exec(function (err, teachers) {
        if (err) {
          req.flash("error", "Something went wrong.");
          return res.redirect("/");
        }
        res.render("users/show", { user: foundUser, teachers: teachers });
      });
  });
});

//EDIT ROUTE

router.get("/:id/edit", middleware.isLoggedIn, function (req, res) {
  //render edit template with that Teacher
  res.render("users/edit", { user: req.user });
});

router.put(
  "/:id",
  upload.single("image"),
  middleware.isLoggedIn,
  middleware.checkUserEdit,
  function (req, res) {
    User.findById(req.params.id, async function (err, user) {
      if (err) {
        req.flash("error", err.message);
        res.redirect("back");
      } else {
        if (req.file) {
          if (req.file.path != null) {
            try {
              cloudinary.v2.uploader.destroy(user.imageId);
              var result = await cloudinary.v2.uploader.upload(req.file.path);
              user.imageId = result.public_id;
              user.avatar = result.secure_url;
            } catch (err) {
              req.flash("error", err.message);
              return res.redirect("back");
            }
            user.firstName = req.body.firstName;
            user.lastName = req.body.lastName;
            user.email = req.body.email;
            user.about = req.body.about;
            user.save();
            req.flash("success", "Successfully Updated!");
            res.redirect("/users/" + user._id);
          }
        } else {
          user.firstName = req.body.firstName;
          user.lastName = req.body.lastName;
          user.email = req.body.email;
          user.about = req.body.about;
          user.save();
          req.flash("success", "Successfully Updated!");
          res.redirect("/users/" + user._id);
        }
      }
    });
  }
);

module.exports = router;
