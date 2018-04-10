var bodyParser = require('body-parser'),
	express = require('express'),
	router = express.Router(),
	urlencodedParser = bodyParser.urlencoded({ extended: false });

// Models
var	Event = require('../models/event'),
	Registration = require('../models/registration'),
	User = require('../models/user');

// Controllers
var registrationCtrl = require('../controllers/registrationController')

// Custom Modules
var ensureAuthenticated = require('../../custom_modules/app/router/ensureAuthenticated')

// Get a pre-inscription form
router.get('/recap/user/:id', ensureAuthenticated, registrationCtrl.getRecapUser  );

// Post a pre-inscription
router.get('/recap/organisateur/:id', ensureAuthenticated, registrationCtrl.getRecapOrganisateur )

// Get checkout form
router.get('/file/excel/:id', ensureAuthenticated, registrationCtrl.getFileExcell )

// Post a checkout
router.get('/file/gmcap/:id', ensureAuthenticated, registrationCtrl.getFileGmcap )

// Get user all inscription recap
router.get('/pre-inscription/:id', ensureAuthenticated, registrationCtrl.getPreinscription);

// Get organisateur a recap
router.post('/pre-inscription/:id', registrationCtrl.postPreinscription );

// Get a file excell
router.get('/checkout/:id', ensureAuthenticated, registrationCtrl.getCheckout )

// Get a file GmCAP
router.post('/checkout/:id', registrationCtrl.postCheckout )

module.exports = router;