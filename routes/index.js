let express = require('express');
let router = express.Router();
let passport = require('passport')
require('../passport')(passport); // pass passport for configuration


router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/apicms/apis-manager');
  } else {
    res.render('login', {
      layout: 'basic-bootstrap',
      message: req.flash('loginMessage')
    });
  }
});

router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

// process the login form
router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/apicms/apis-manager', // redirect to the secure profile section
  failureRedirect: '/', // redirect back to the signup page if there is an error
  failureFlash: true // allow flash messages
}));

function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
}

module.exports = router;
