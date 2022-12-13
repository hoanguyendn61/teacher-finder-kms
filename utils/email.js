const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();
const smtpTransport = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    type: "OAuth2",
    user: "teacherfinder.kms@gmail.com",
    pass: process.env.GMAIL_PW,
    clientId: process.env.OAUTH_CLIENTID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

module.exports = smtpTransport;
