require('dotenv').config()
var nodemailer = require('nodemailer');
let path = require('path')
let express = require('express')
var fs = require('fs');
let cookieParser = require('cookie-parser')
let session = require('express-session')
var FileStore = require('session-file-store')(session);
let exphbs = require('express-handlebars')
let MongoDBStore = require('connect-mongodb-session')(session)
let mongo = require('mongodb')
let mongoose = require('mongoose')
let passport = require('passport')
let bodyParser = require('body-parser')
let flash = require('connect-flash')
let i18n = require('i18n-express-4plugin')
let cors = require('cors');


//Express app initialization
let app = express()

app.use(cors({
  origin: function(origin, callback){
    // allow requests with no origin
    // (like mobile apps or curl requests)
    console.log(origin);
    let allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
//App configuration
app.use(cookieParser('keyboard cat'))
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '3mb'
}))
app.use(bodyParser.json({
  extended: true,
  limit: '3mb'
}))
app.engine('handlebars', exphbs({
  defaultLayout: 'basic-bootstrap',
  partialsDir: __dirname + '/views/partials',
  helpers: {
    equals: function(v1, v2) {
      return v1 === v2;
    },
    inc: function(value) {
      return value+1;
    },
    tagsToString(tags){
      return tags.join(';');
    },
    getColorFromString(str) {
      var hash = 0;
      for (var i = 0; i < str.length; i++) {
         hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      var c = (hash & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();
      return "#00000".substring(0, 7 - c.length) + c;
    },
    toQueryString(queries){
      return queries.split(';').join(' & ');
    },
    getRandomColor(){
      var letters = '0123456789ABCDEF';
      var color = '#';
      for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    }
  }
}))
app.set('view engine', 'handlebars')

app.use(express.static('public'))
app.use(session({
    store: new FileStore(),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize())
app.use(passport.session()) // persistent login sessions
app.use(flash()) // use connect-flash for flash messages stored in session



let index = require('./routes/index')
let apicms = require('./routes/apicms')
let dve = require('./routes/dve')
app.use(function(req, res, next) {
  req.rootPath = __dirname;
  next();
});

app.use('/', index)
app.use('/apicms', apicms)
app.use('/dve', dve);


app.get('*', (req, res, next) => {
  res.render('404');
});
app.listen(3000, function(){
    console.log("info",'Server is running at port : ' + 3000);
});
