require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");
const mongoose = require("mongoose");
const _ = require("lodash");
const ejs = require("ejs");

//encrypt
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
//gauth
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// const req = require("express/lib/request");
// const { json } = require("body-parser");
// const { name } = require("ejs");

const app = express();

// ejs module
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

// cookie session setup
app.use(
  session({
    secret: "MyBigSeccret",
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// adding mongodb to project
mongoose.connect(
  "mongodb+srv://duck_trap_69:duck69trap@cluster0.dwlz9ap.mongodb.net/userDB"
);
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);
///////////////////////////////////////////////start//////////////////////////////////////////////////////////////

app.get("/", function (req, res) {
  res.render("home");
});

// google auth
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home to secrets.
    res.redirect("/secrets");
  }
);
//google auth end

app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/secrets", function (req, res) {
  User.find({ secret: { $ne: null } })
    .then((foundUsers) => {
      res.render("secrets", { usersWithSecrets: foundUsers });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});
app.post("/submit", function (req, res) {
  User.findById(req.user)
    .then((foundUser) => {
      if (foundUser) {
        foundUser.secret = req.body.secret;
        return foundUser.save();
      }
      return null;
    })
    .then(() => {
      res.redirect("/secrets");
    })
    .catch((err) => {
      console.log(err);
    });
});
app.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app.post("/register", function (req, res) {
  User.register({ username: req.body.username }, req.body.password)
    .then(() => {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

////////////////////////////////////////////////end//////////////////////////////////////////////////////////////
app.listen(process.env.PORT || 3000, function () {
  console.log("server active comander");
});
