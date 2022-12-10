const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Teacher = require("../models/teacher");
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const middleware = require("../middleware");
const { upload, cloudinary } = require("../utils/uploadImage");
//INDEX - show all Teachers
router.get("/", function (req, res) {
  res.render("landing");
});

//=============================================================================
// AUTH ROUTES

router.get("/register", function (req, res) {
  res.render("register", { page: "register" });
});

router.get("/regadm", function (req, res) {
  res.render("regadm", { page: "regadm" });
});

//confirmation and resend

//HANDLE SIGNUP LOGIC

router.post("/register", function (req, res, next) {
  var newUser = new User({
    username: req.body.username,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
  });

  User.register(newUser, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      checkErr = true;
      return res.render("register", { error: err.message });
    } else {
      async.waterfall(
        [
          function (done) {
            crypto.randomBytes(20, function (err, buf) {
              var token = buf.toString("hex");
              done(err, token);
            });
          },
          function (token, done) {
            User.findOne({ email: req.body.email }, function (err, user) {
              if (err) {
                req.flash("error", "Something went wrong.");
                res.redirect("/");
              }
              if (!user) {
                req.flash(
                  "error",
                  "No account with that email address exists."
                );
                return res.redirect("/");
              }

              user.isVerifiedToken = token;
              user.isVerifiedExpires = Date.now() + 3600000 * 24; // 24 hour

              user.save(function (err) {
                done(err, token, user);
              });
            });
          },
          function (token, user, done) {
            res.redirect("/login");
          },
        ],
        function (err) {
          if (err) return next(err);
          res.redirect("/");
        }
      );
    }
  });
});

router.post("/regadm", upload.single("image"), function (req, res) {
  cloudinary.v2.uploader.upload(req.file.path, function (err, result) {
    if (err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    var newUser = new User({
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      avatar: result.secure_url,
      imageId: result.public_id,
      about: req.body.about,
    });

    if (req.body.adminCode === "secretcode123") {
      newUser.isAdmin = true;
      newUser.isVerified = true;
    }

    User.register(newUser, req.body.password, function (err, user) {
      if (err) {
        console.log(err);
        return res.render("register", { error: err.message });
      }
      passport.authenticate("local")(req, res, function () {
        req.flash("success", "Welcome to TF " + req.body.username);
        res.redirect("/teachers");
      });
    });
  });
});

//SHOW LOGIN FORM

router.get("/login", function (req, res) {
  res.render("login", { page: "login" });
});

// HANDLING LOGIN LOGIC

router.post("/login", function (req, res, next) {
  passport.authenticate("local", function (err, user, info) {
    if (err) {
      req.flash("error", "Check entered data!");
      res.redirect("/login");
    }
    if (!user) {
      req.flash("error", "Check entered data!");
      return res.redirect("/login");
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      }
      req.flash("success", "Successfully logged in, welcome to TF!");
      var redirectTo = req.session.redirectTo
        ? req.session.redirectTo
        : "/teachers";
      delete req.session.redirectTo;
      res.redirect(redirectTo);
    });
  })(req, res, next);
});

// LOGOUT ROUTE
router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logged you out!");
    res.redirect("/teachers");
  });
});

// Middleware
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// forgot password
router.get("/forgot", function (req, res) {
  res.render("forgot");
});

router.post("/forgot", function (req, res, next) {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (err) {
            req.flash("error", "Something went wrong.");
            res.redirect("/");
          }
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/forgot");
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect("/forgot");
    }
  );
});

router.get("/reset/:token", function (req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
      if (!user) {
        req.flash("error", "Password reset token is invalid or has expired.");
        return res.redirect("/forgot");
      }
      res.render("reset", { token: req.params.token });
    }
  );
});

router.post("/reset/:token", function (req, res) {
  async.waterfall(
    [
      function (done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() },
          },
          function (err, user) {
            if (err) {
              req.flash("error", "Something went wrong.");
              res.redirect("/");
            }
            if (!user) {
              req.flash(
                "error",
                "Password reset token is invalid or has expired."
              );
              return res.redirect("back");
            }
            if (req.body.password === req.body.confirm) {
              user.setPassword(req.body.password, function (err) {
                if (err) {
                  req.flash("error", "Something went wrong.");
                  res.redirect("/");
                }
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function (err) {
                  if (err) {
                    req.flash("error", "Something went wrong.");
                    res.redirect("/");
                  }
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              });
            } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect("back");
            }
          }
        );
      },
    ],
    function (err) {
      if (err) {
        req.flash("error", "Something went wrong.");
        res.redirect("/");
      }
      res.redirect("/teachers");
    }
  );
});

// USER PROFILE
router.get("/users/:id", function (req, res) {
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

// verify password
router.get("/verify", function (req, res) {
  res.render("verify");
});

router.post("/verify", function (req, res, next) {
  async.waterfall(
    [
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function (token, done) {
        User.findOne({ email: req.body.email }, function (err, user) {
          if (err) {
            req.flash("error", "Something went wrong.");
            res.redirect("/");
          }
          if (!user) {
            req.flash("error", "No account with that email address exists.");
            return res.redirect("/verify");
          }

          user.isVerifiedToken = token;
          user.isVerifiedExpires = Date.now() + 3600000 * 24; // 24 hour

          user.save(function (err) {
            done(err, token, user);
          });
        });
      },
    ],
    function (err) {
      if (err) return next(err);
      res.redirect("/forgot");
    }
  );
});

router.get("/verified/:token", function (req, res) {
  var checkErr = false;
  var controlCheck = false;

  if (!checkErr) {
    async.waterfall(
      [
        function (done) {
          User.findOne(
            {
              isVerified: false,
              isVerifiedToken: req.params.token,
              isVerifiedExpires: { $gt: Date.now() },
            },
            function (err, user) {
              if (err) {
                req.flash("error", "Something went wrong.");
                res.redirect("/");
              }
              if (!user) {
                req.flash(
                  "error",
                  "Verification token is invalid, has expired or the account is already verified."
                );
                return res.redirect("/teachers");
              }
              if ("a" === "a") {
                if (err) {
                  req.flash("error", "Something went wrong.");
                  res.redirect("/");
                }
                user.isVerifiedToken = undefined;
                user.isVerifiedExpires = undefined;
                user.isVerified = true;

                user.save(function (err) {
                  if (err) {
                    req.flash("error", "Something went wrong.");
                    res.redirect("/");
                  }
                  req.logIn(user, function (err) {
                    done(err, user);
                  });
                });
              } else {
                req.flash("error", "Passwords do not match.");
                return res.redirect("back");
              }
            }
          );
        },
      ],
      function (err) {
        if (err) {
          req.flash("error", "Something went wrong.");
          res.redirect("/");
        }
        res.redirect("/teachers");
      }
    );
  }
});

module.exports = router;
