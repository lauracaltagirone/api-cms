var LocalStrategy = require('passport-local').Strategy;
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const bcrypt = require('bcrypt-nodejs');
module.exports = function(passport) {

  // ========================/=================================================
  // passport session setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser(function(id, done) {
    let users = fse.readJsonSync(path.join(__dirname, 'users.json'));
    users.filter((user) => {
      if(user.id === id){
        done(null, user);
      }
    });
  });

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use('local-signup', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'email',
      passwordField: 'password',
      surnameField: 'surname',
      nameField: 'name',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) {

      // asynchronous
      // User.findOne wont fire unless data is sent back
      process.nextTick(function() {

        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({
          'email': email
        }, function(err, user) {
          // if there are any errors, return the error
          if (err)
            return done(err);

          // check to see if theres already a user with that email
          if (user) {
            return done(null, false, req.flash('signupMessage', req.i18n_texts.pages.legacy.home.loginForm.userExists));
          } else {

            // if there is no user with that email
            // create the user
            var newUser = new User();

            // set the user's local credentials
            newUser.email = email;
            newUser.name = req.body['name'];
            newUser.surname = req.body['surname'];
            newUser.password = newUser.generateHash(password);

            // save the user
            newUser.save(function(err) {
              if (err)
                throw err;
              return done(null, newUser);
            });
          }

        });

      });

    }));
  // =========================================================================
  // LOCAL LOGIN =============================================================
  // =========================================================================
  // we are using named strategies since we have one for login and one for signup
  // by default, if there was no name, it would just be called 'local'

  passport.use('local-login', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done) { // callback with email and password from our form

      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      let users = fse.readJsonSync(path.join(req.rootPath, 'users.json'));
      let userExists = false;
      users.forEach((user, index) => {
        if(user.email === email){
          userExists = true;
        }
        if(index === users.length -1){
          if(!userExists){
            return done(null, false, req.flash('loginMessage', 'No user found'));
          } else {
            if(bcrypt.compareSync(password, user.password)){
              return done(null, user);
            } else{
              return done(null, false, req.flash('loginMessage', 'Wrong Password'));
            }
          }
        }
      });
    }));

};
