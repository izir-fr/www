require('dotenv').config()

var bodyParser = require('body-parser')
var express = require('express')
var helmet = require('helmet')
var path = require('path')
var cookieParser = require('cookie-parser')
var exphbs = require('express-handlebars')
var expressValidator = require('express-validator')
var flash = require('connect-flash')
var session = require('express-session')
var passport = require('passport')
var mongoose = require('mongoose')
var morgan = require('morgan')
var MongoStore = require('connect-mongo')(session)
var Liana = require('forest-express-mongoose')

// Init App
var app = express()
var port = 3000

// Credentials
var credentials = require('./config/credentials')

// MongoDB
mongoose.Promise = require('bluebird')
mongoose.connect(credentials.mLab)

// Router
var cms = require('./app/router/cmsRoutes')
var users = require('./app/router/userRoutes')
var events = require('./app/router/eventRoutes')
var cart = require('./app/router/cartRoutes')
var shop = require('./app/router/shopRoutes')
var registration = require('./app/router/registrationRoutes')
var organisateur = require('./app/router/organisateurRoutes')
var chronometrage = require('./app/router/chronometrageRoutes')
var notifications = require('./app/router/notificationRoutes')
var newsfeed = require('./app/router/newsfeedRoutes')

// morgan
app.use(morgan('dev'))

// Http to Https
if (!process.env.DEV) {
  var redirectToHTTPS = require('express-http-to-https').redirectToHTTPS
  app.use(redirectToHTTPS([/localhost:(\d{4})/]))
}

// Handlebars
var hbs = exphbs.create({
  defaultLayout: 'main',
  layoutsDir: 'app/views/layouts',
  partialsDir: 'app/views/partials',
  helpers: require('./middleware/handlebarsHelpers')
})

app.engine('handlebars', hbs.engine)
app.set('views', path.join(__dirname, '/app/views/'))
app.set('view engine', 'handlebars')

// BodyParser Middleware
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.text({ type: 'text/html', defaultCharset: 'utf-8' }))
app.use(cookieParser())

// Helmet
app.use(helmet())

// Set Static Folder
app.use(express.static(path.join(__dirname, 'assets/public')))

// Express Session
app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  resave: true,
  store: new MongoStore({
    url: credentials.mLab
  }),
  cookie: {
    maxAge: 180 * 60 * 1000
  }
}))

// Passport init
app.use(passport.initialize())
app.use(passport.session())

// Express Validator
app.use(expressValidator({
  errorFormatter: function (param, msg, value) {
    var namespace = param.split('.')
    var root = namespace.shift()
    var formParam = root

    while (namespace.length) {
      formParam += '[' + namespace.shift() + ']'
    }
    return {
      param: formParam,
      msg: msg,
      value: value
    }
  }
}))

// Connect Flash
app.use(flash())

// Global Vars
app.use(function (req, res, next) {
  res.locals.localhost = process.env.LOCAL === 'true'
  res.locals.success_msg = req.flash('success_msg')
  res.locals.error_msg = req.flash('error_msg')
  res.locals.info_msg = req.flash('info_msg')
  res.locals.user = req.user || null
  res.locals.cart = req.session.cart || { products: [] }
  res.locals.session = req.session
  next()
})

app.use('/', cms)
app.use('/user', users)
app.use('/event', events)
app.use('/cart', cart)
app.use('/shop', shop)
app.use('/inscription', registration)
app.use('/organisateur', organisateur)
app.use('/chronometrage', chronometrage)
app.use('/notifications', notifications)
app.use('/newsfeed', newsfeed)

// FOREST SET UP
app.use(Liana.init({
  modelsDir: path.join(__dirname, '/app/models'), // Your models directory.
  envSecret: process.env.FOREST_ENV_SECRET,
  authSecret: process.env.FOREST_AUTH_SECRET,
  mongoose: mongoose // The database connection.
}))

// 404
app.use(function (req, res, next) {
  res.status(404)

  // respond with html page
  if (req.accepts('html')) {
    res.render('partials/404', { url: req.url })
    return
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' })
    return
  }

  // default to plain-text. send()
  res.type('txt').send('Not found')
})

// Set Port
app.set('port', (process.env.PORT || port))

app.listen(app.get('port'), function () {
  console.log('mongoose connect : ' + credentials.mLab)
  console.log('<==========')
  console.log('app on : localhost:' + app.get('port'))
  console.log('==========>')
})

module.exports = app
