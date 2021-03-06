var fs = require('fs')
var json2csv = require('json2csv')

// Models
var Event = require('../models/event')
var Registration = require('../models/registration')
var User = require('../models/user')

var chronometrageModules = require('../../middleware/app/registration/chronometrage')

var fields = ['NOM', 'PRENOM', 'ADRESSE1', 'ADRESSE2', 'CODE', 'VILLE', 'ETAT', 'PAYS', 'EMAIL', 'TEL', 'SEXE', 'NUMERO', 'HANDICAP', 'LICENCE', 'NAISSANCE', 'CATEGORIE', 'TEMPS', 'CLUB', 'CODECLUB', 'ORGANISME', 'NATION', 'COURSE', 'DISTANCE', 'PAYE', 'INVITE', 'ENVOICLASST', 'Certif Médical']

var isAdmin = (user, adminId) => {
  return String(user.id) === String(adminId)
}

var isUser = (user, eventUserId) => {
  return String(user.id) === String(eventUserId)
}

var isChronometreur = (user, chronometreurEvent) => {
  if (chronometreurEvent !== null & chronometreurEvent !== undefined) {
    return String(user.id) === String(chronometreurEvent.id)
  } else {
    return false
  }
}

var chronometrageCtrl = {
  getAllChronometrageEvent: (req, res) => {
    Event
      .find({ chronometreur: req.user.id })
      .populate('epreuves')
      .exec((err, events) => {
        if (err) {
          res.redirect('/')
        }
        var data = {
          event: events
        }
        res.render('partials/chronometrage/all-events', data)
      })
  },
  getChronometrageEvent: (req, res) => {
    Event
      .findOne({ _id: req.params.id })
      .populate('epreuves')
      .populate('chronometreur')
      .exec((err, event) => {
        if (err) {
          res.redirect('/')
        }

        if (isUser(req.user, event.author) === true || isChronometreur(req.user, event.chronometreur) === true || isAdmin(req.user, process.env.ADMIN) === true) {
          var profil
          if (String(req.user.id) === String(event.author)) {
            profil = {
              organisateur: true
            }
          } else {
            profil = {
              chronometreur: true
            }
          }
          var data = {
            profil,
            event
          }
          res.render('partials/chronometrage/one-event', data)
        } else {
          res.redirect('/')
        }
      })
  },
  postAddChronometreur: (req, res) => {
    User
      .findOne({ email: req.body.chronometreur_email })
      .select({
        email: 1,
        _id: 1
      })
      .exec((err, user) => {
        if (err || user === null) {
          req.flash('error_msg', 'Aucun compte n\'est associé à cet email, merci de contacter votre chronométreur pour qu\'il crée un compte ou vous donne l\'email qu\'il utilise sur la plateforme')
          res.redirect('/chronometrage/event/' + req.params.id)
        } else {
          Event
            .findOneAndUpdate({ _id: req.params.id },
              {$set: {'chronometreur': user.id}}
            )
            .exec((err, event) => {
              if (err) {
                res.redirect('/chronometrage/event/' + req.params.id)
              } else {
                res.redirect('/chronometrage/event/' + event.id)
              }
            })
        }
      })
  },
  // Get a file excell
  getFileExcell: (req, res) => {
    Registration.chronometrageQuery(req.params.id, (err, registrations) => {
      if (err) {
        req.flash('error_msg', 'Une erreur est survenue')
        res.redirect('/')
      }

      var inscriptions = chronometrageModules.registrationFormated(registrations, 'excel')

      var excelFeilds = []

      fields.forEach((val) => {
        excelFeilds.push(val)
      })

      excelFeilds.push('DOSSIER', 'ANNEE_NAISSANCE', 'MOIS_NAISSANCE', 'JOURS_NAISSANCE')

      var csv = json2csv({ data: inscriptions, fields: excelFeilds, unwindPath: ['COURSE'], del: ';', quotes: '' })
      fs.writeFile(req.params.id + '.csv', csv, 'ascii', (err) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue')
          res.redirect('/inscription/recap/organisateur/' + req.user.id)
        } else {
          res.download('./' + req.params.id + '.csv')
        }
      })
    })
  },
  // Get a file GmCAP
  getFileGmcap: (req, res) => {
    Registration.chronometrageQuery(req.params.id, (err, registrations) => {
      if (err) {
        req.flash('error_msg', 'Une erreur est survenue')
        res.redirect('/')
      }

      var inscriptions = chronometrageModules.registrationFormated(registrations, 'gmcap')

      var gmcapFeilds = fields

      var csv = json2csv({ data: inscriptions, fields: gmcapFeilds, unwindPath: ['COURSE'], del: '\t', quotes: '' })
      fs.writeFile(req.params.id + '.txt', csv, 'ascii', (err) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue')
          res.redirect('/inscription/recap/organisateur/' + req.user.id)
        }
        res.download('./' + req.params.id + '.txt')
      })
    })
  }
}

module.exports = chronometrageCtrl
