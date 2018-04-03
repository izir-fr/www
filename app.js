require('dotenv').config()

var async = require('async'),
    bcrypt = require('bcrypt'),
    bodyParser = require('body-parser'),
    crypto = require('crypto'),
    express = require('express'),
    helmet = require('helmet'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    exphbs = require('express-handlebars'),
    expressValidator = require('express-validator'),
    flash = require('connect-flash'),
    Liana = require('forest-express-mongoose'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mongo = require('mongodb'),
    mongoose = require('mongoose'),
    morgan = require('morgan'),
    os = require('os'),
    url = require('url'),
    MongoStore = require('connect-mongo')(session);

// Credentials
var credentials = require('./routes/credentials')

// MongoDB
var mongoose = mongoose.connect(credentials.mLab, { useMongoClient: true });

// Routes
var routes = require('./routes/index'),
	users = require('./routes/user'),
	events = require('./routes/event'),
  cart = require('./routes/cart');

//cutom modules
var cronConfig = require('./custom_modules/cron');

// Init App
var app = express();
app.use(morgan('dev'))

// Http to Https
var redirectToHTTPS = require('express-http-to-https').redirectToHTTPS
app.use(redirectToHTTPS([/localhost:3000/]));

// Handlebars
var hbs = exphbs.create({
  defaultLayout:'layout',
  helpers: {
      date: (val) => { return val.getDate() + '/' + (parseInt(val.getMonth())+1) + '/' + val.getFullYear() }
    }
});

app.engine('handlebars', hbs.engine);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text({ type: 'text/html', defaultCharset: 'utf-8' }))
app.use(cookieParser());

// Helmet
app.use(helmet())

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true,
    store : new MongoStore({
      mongooseConnection: mongoose 
    }),
    cookie : {
      maxAge: 180 * 60 * 1000
    }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  res.locals.session = req.session;
  next();
});

app.use('/', routes);
app.use('/user', users);
app.use('/event', events);
app.use('/catalogue', cart);

// FOREST SET UP
app.use(require('forest-express-mongoose').init({
  modelsDir: __dirname + '/models',  // Your models directory.
  envSecret: process.env.FOREST_ENV_SECRET,
  authSecret: process.env.FOREST_AUTH_SECRET,
  mongoose: require('mongoose') // The database connection.
}));

//404
app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
});

// Set Port
app.set('port', (process.env.PORT || 3000));

app.listen(app.get('port'), function(){
  console.log('mongoose connect : ' + credentials.mLab);
  console.log('<==========')
	console.log('app on : localhost:' + app.get('port'));
  console.log('==========>');
});