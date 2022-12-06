const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const flash = require("connect-flash");
mongoose.connect(process.env.DATABASE_URL);

app.locals.moment = require("moment");

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(flash());

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

//=============================================================================
//Starts the server

app.listen(process.env.PORT, process.env.IP, function () {
  console.log("The server has started! at ", process.env.PORT);
});
