var express = require("express");
var router = express.Router();
var Teacher = require("../models/teacher");
var middleware = require("../middleware");
var Review = require("../models/review");
var Comment = require("../models/comment");

router.get("/teachers", middleware.checkAdmin, (req, res) => {
  Teacher.find({}, (err, allTeachers) => {
    if (err) {
      console.log(err);
    } else {
      res.render("admin/teachers", { teachers: allTeachers });
    }
  });
});

module.exports = router;
