const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

mongoose.connect(process.env.DATABASE_URL);

app.locals.moment = require("moment");

//=============================================================================
//Starts the server

app.listen(process.env.PORT, process.env.IP, function () {
  console.log("The server has started! at ", process.env.PORT);
});
