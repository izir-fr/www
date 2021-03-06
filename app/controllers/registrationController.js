var Promise = require('bluebird')

// custom modules
var catList = require('../../middleware/lists/category-list')
var dateList = require('../../middleware/lists/date-list')
var disList = require('../../middleware/lists/discipline-list')
var chronometrageModules = require('../../middleware/app/registration/chronometrage')

// Models
var Event = require('../models/event')
var Registration = require('../models/registration')
var Notification = require('../models/notification')
var Dashboard = require('../../middleware/app/registration/dashboardRegistrationModel')

var userBirthday = (val) => {
  var date = {
    jour: '',
    mois: '',
    annee: ''
  }
  if (val !== undefined && val !== null && val !== '') {
    if (val.split('/').length === 3) {
      date.jour = val.split('/')[0]
      date.mois = val.split('/')[1]
      date.annee = val.split('/')[2]
    }
  }
  return date
}

var getEventData = (id) => {
  return new Promise((resolve, reject) => {
    Event
      .getEventById(id, (err, event) => {
        if (err) {
          reject(err)
        } else {
          resolve(event)
        }
      })
  })
}

var getRegistrationsData = (id) => {
  return new Promise((resolve, reject) => {
    Registration
      .chronometrageQuery(id, (err, registrations) => {
        if (err) {
          reject(err)
        } else {
          resolve(registrations)
        }
      })
  })
}

var isRegistrationManager = (user, author) => {
  if (String(user) === String(author) || String(user) === String(process.env.ADMIN)) {
    return true
  } else {
    return false
  }
}

var registrationCtrl = {
  postAjaxCart: (req, res) => {
    var registration
    var produits = []
    var form = req.body
    var data = form.data
    var cart = data.cart
    var participant = data.participant
    var user = req.user._id
    var event = req.params.id
    var epreuveFormat = form.option.epreuve_format

    // some check
    if (!user) {
      // res.contentType('json')
      res.send({error_msg: 'Not logged user'})
    } else if (!event) {
      // res.contentType('json')
      res.send({error_msg: 'No event reconized'})
    } else {
      if (epreuveFormat.team && epreuveFormat.individuel) {
        req.flash('error_msg', 'Une erreur est survenue lors du choix de l\'épreuve')
        res.redirect('/inscription/' + event)
      } else if (!epreuveFormat.team && !epreuveFormat.individuel) {
        req.flash('error_msg', 'Une erreur est survenue lors du choix de l\'épreuve')
        res.redirect('/inscription/' + event)
      } else {
        // ajout des produits dans la commande
        cart.epreuve.forEach((val) => {
          produits.push({
            race: val.id,
            produitsRef: val.produit,
            produitsPrix: val.price,
            produitsQuantite: val.qty,
            produitsSubTotal: val.subTotal
          })
        })

        // ajout des options à la commande
        if (cart.options.length >= 1) {
          cart.options.forEach((val) => {
            produits.push({
              produitsRef: val.produit,
              produitsPrix: val.price,
              produitsQuantite: val.qty,
              produitsSubTotal: val.subTotal
            })
          })
        }

        // ajout des dons à la commande
        if (cart.dons) {
          if (cart.dons !== null && cart.dons !== '0') {
            produits.push({
              produitsRef: 'don',
              produitsPrix: 1,
              produitsQuantite: cart.dons,
              produitsSubTotal: cart.dons
            })
          }
        }

        // création du panier
        registration = new Registration({
          user: user, // user
          event: event, // event
          eventName: participant.event,
          produits: produits,
          orderAmount: cart.totalCart,
          options: {
            'epreuve_format': {
              team: epreuveFormat.team,
              individuel: epreuveFormat.individuel
            },
            'team_limits': {
              min: form.option.team.min,
              max: form.option.team.max
            }
          },
          statut: 'pré-inscrit',
          updated: new Date()
        })

        // enregistrement de la pré-commande
        registration.save((err, registration) => {
          if (err) {
            res.send({ error_msg: 'Une erreur est survenue lors de l\'enregistrement de votre inscription' })
          } else {
            // create notification paiement
            var notification = new Notification({
              sender: req.user.id,
              receiver: [registration.user],
              message: 'Vous venez de commencer une inscription pour l\'épreuve ' + registration.eventName + ', vous pouvez a tout moment reprendre ou modifier cette inscription depuis votre compte, rubrique mes inscriptions.'
            })

            // save notification
            notification
              .save((err, notification) => {
                if (err) throw err
                // EMAIL NOTIFICATION
                require('../../middleware/mailer')({user: registration.user})
              })
            res.send({ redirect: '/inscription/' + registration.id + '/participant' })
          }
        })
      }
    }
  },
  getParticipantUpdate: (req, res) => {
    var data
    var user = req.user.id
    var birthday = {
      jour: '',
      mois: '',
      annee: ''
    }

    if (req.user.birthday !== '') {
      try {
        birthday.jour = req.user.birthday.split('/')[0]
        birthday.mois = req.user.birthday.split('/')[1]
        birthday.annee = req.user.birthday.split('/')[2]
      } catch (err) {
        birthday.jour = ''
        birthday.mois = ''
        birthday.annee = ''
      }
    }

    Registration
      .findById(req.params.registration)
      .populate('event')
      .populate('produits.race')
      .exec((err, registration) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors du choix de l\'épreuve')
          res.redirect('/inscription/recap/user/' + user)
        }
        var races = 0
        data = {
          results: registration,
          birthday: birthday,
          date_list: dateList,
          category_list: catList,
          discipline_list: disList
        }

        registration.produits.forEach((produit) => {
          if (produit.race !== undefined) {
            if (produit.race.team === true) {
              races++
            }
          }
        })

        if (races >= 1) {
          res.redirect('/inscription/' + req.params.registration + '/team')
        } else {
          res.render('partials/registration/step-participant', data)
        }
      })
  },
  postParticipantUpdate: (req, res) => {
    var id = req.params.registration
    // update registration
    Registration.update(
      { _id: id },
      { $set: {
        'participant': {
          'nom': req.body.surname,
          'prenom': req.body.name,
          'email': req.body.email,
          'phone': req.body.phone,
          'sex': req.body.sex,
          'dateNaissance': req.body.jourNaissance + '/' + req.body.moisNaissance + '/' + req.body.anneeNaissance,
          'team': req.body.team,
          'numLicence': req.body.numLicence,
          'categorie': req.body.categorie,
          'adresse1': req.body.adresse1,
          'adresse2': req.body.adresse2,
          'codePostal': req.body.codePostal,
          'city': req.body.city
        },
        'updated': new Date(Date.now())
      }
      }, (err, user) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors de la saisie de vos informations')
          res.redirect('/inscription/' + id + '/participant')
        } else {
          Registration
            .findById(id)
            .populate('event')
            .exec((err, registration) => {
              if (err) {
                req.flash('error_msg', 'Une erreur est survenue lors de la saisie de vos informations')
                res.redirect('/inscription/' + id + '/participant')
              } else {
                res.redirect('/inscription/recap/user/' + req.user.id)
              }
            })
        }
      })
  },
  getCartTeamUpdate: (req, res) => {
    var data

    Registration
      .findById(req.params.id)
      .populate('event')
      .populate('produits.race')
      .exec((err, registration) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors du chargement de l\'événement')
          res.redirect('/inscription/' + registration[0].event.id)
        }

        var team = []
        if (registration.team.length >= 1) {
          registration.team.forEach((val) => {
            var member = val
            member.birthday = userBirthday(member.dateNaissance)
            team.push(member)
          })
        }

        registration.team = team

        data = {
          results: registration,
          date_list: dateList,
          category_list: catList,
          discipline_list: disList
        }
        var teamLimits = {}
        if (registration.produits.length >= 1) {
          registration.produits.forEach((produit) => {
            if (produit.race.team === true) {
              teamLimits.max = produit.race.team_qty_max
              teamLimits.min = produit.race.team_qty_min
            }
          })
        }
        data.results.options.team_limits = teamLimits
        // console.log(registration.produits)
        res.render('partials/registration/step-team', data)
      })
  },
  postCartTeamUpdate: (req, res) => {
    var id = req.params.id
    var capitaine = {
      nom: req.body.capitaine_name,
      prenom: req.body.capitaine_surname,
      email: req.body.capitaine_email,
      team: req.body.capitaine_team,
      codePostal: req.body.capitaine_cp,
      city: req.body.capitaine_city
    }

    var team = []

    req.body.member_nom.forEach((val, key) => {
      team.push({
        nom: req.body.member_nom[key],
        prenom: req.body.member_prenom[key],
        sex: req.body.member_sex[key],
        dateNaissance: req.body.membre_birth_day[key] + '/' + req.body.membre_birth_month[key] + '/' + req.body.membre_birth_year[key],
        team: req.body.capitaine_team,
        numLicence: req.body.member_license[key],
        email: req.body.member_email[key]
      })
    })

    Registration.update(
      { _id: id }, {
        $set: {
          'participant': capitaine,
          'team': team,
          'updated': new Date(Date.now())
        }
      }, (err, user) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors de la saisie de vos informations')
          res.redirect('/inscription/' + id + '/team')
        } else {
          Registration
            .findById(id)
            .populate('event')
            .exec((err, registration) => {
              if (err) {
                req.flash('error_msg', 'Une erreur est survenue lors de la saisie de vos informations')
                res.redirect('/inscription/' + id + '/team')
              } else {
                res.redirect('/inscription/recap/user/' + req.user.id)
              }
            })
        }
      }
    )
  },
  getCertificat: (req, res) => {
    var id = req.params.id

    var member = false
    if (req.query.membre) {
      member = req.query.membre
    }

    Registration
      .find({_id: id})
      .populate('event')
      .exec((err, registration) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors du chargement de la page')
        }
        var data = {results: registration[0], member: member}
        if (registration[0].options.epreuve_format.team && member === false) {
          res.redirect('/inscription/' + id + '/certificat/team')
        } else {
          res.render('partials/registration/step-certificat', data)
        }
      })
  },
  postCertificat: (req, res) => {
    var id = req.params.id
    // update registration
    Registration.update(
      { _id: id }, {
        $set: {
          docs: {
            'certificat': req.body.certificat_file,
            'certificat_validation': true
          },
          'updated': new Date(Date.now())
        }
      }, (err, user) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors de la saisie de vos informations')
          res.redirect('/inscription/' + id + '/certificat')
        } else {
          res.redirect('/inscription/recap/user/' + req.user.id)
        }
      }
    )
  },
  getCertificatTeam: (req, res) => {
    var id = req.params.id

    Registration
      .find({_id: id})
      .populate('event')
      .exec((err, registration) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors du chargement de la page')
        }
        var data = {results: registration[0]}
        res.render('partials/registration/step-certificat-team', data)
      })
  },
  postCertificatTeam: (req, res) => {
    var id = req.params.id
    var member = req.params.member

    Registration.updateOne(
      { 'team._id': member }, {
        $set: {
          'team.$.docs': {
            'certificat': req.body.certificat_file,
            'certificat_validation': true
          }
        }
      }, (err, user) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors de la saisie de vos informations')
        }
        res.redirect('/inscription/' + id + '/certificat')
      })
  },
  getOtherPaiementCaptured: (req, res) => {
    var id = req.params.id

    // update registrration
    Registration
      .update(
        { _id: id },
        { $set: { 'paiement': { 'captured': true }, 'updated': new Date(Date.now()), 'statut': 'inscrit' } },
        (err, val) => {
          if (err) {
            req.flash('error_msg', 'Une erreur est survenue lors du paiement')
            res.redirect('/')
          }

          // find registration update infos for redirection
          Registration
            .findById(id)
            .populate('event')
            .exec((err, registration) => {
              if (err) {
                req.flash('error_msg', 'Une erreur est survenue lors de la validation du paiement')
                res.redirect('/inscription/recap/organisateur/' + registration.event)
              } else {
                // create notification paiement
                var notification = new Notification({
                  sender: req.user.id,
                  receiver: [registration.user],
                  message: 'Nous vous confirmons la bonne réception de votre paiement pour l\' inscription N°' + id + ' à l\'épreuve ' + registration.event.name
                })

                // save notification
                notification
                  .save((err, notification) => {
                    if (err) throw err
                    // EMAIL NOTIFICATION
                    require('../../middleware/mailer')({user: registration.user})
                  })

                // set headers
                req.flash('success_msg', 'Le dossier N°' + id + ' est mis à jour avec un paiement guichet (chèque / espèces) validé')

                // REDIRECTION
                res.redirect('/inscription/recap/organisateur/' + registration.event._id)
              }
            })
        })
  },
  // Get user all inscription recap
  getRecapUser: function (req, res) {
    Registration
      .find({ user: req.user.id })
      .sort({ created_at: -1 })
      .populate('event')
      .populate('cart')
      .populate('produits.race')
      .exec((err, registrations) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue')
          res.redirect('/')
        }

        var formatedRegistrations = []
        var api = {
          next: [],
          past: []
        }

        if (registrations.length >= 1) {
          registrations.forEach((registration) => {
            var paiementRequired = false
            var cart = false
            var certificatRequired = false
            var organisateurValidation = false

            registration.config = {
              progress_bar: {
                color: 'bg-danger',
                pourcentage: 0
              }
            }

            try {
              paiementRequired = registration.event.paiement
            } catch (err) {
              if (err) {
                paiementRequired = true
              }
            }
            if (!registration.event) {
              paiementRequired = false
            }

            try {
              cart = registration.cart.paiement.captured
            } catch (err) {
              if (err) {
                cart = false
              }
            }

            try {
              certificatRequired = registration.event.certificat_required
            } catch (err) {
              if (err) {
                certificatRequired = false
              }
            }

            try {
              organisateurValidation = registration.organisateur_validation.all
            } catch (err) {
              if (err) {
                organisateurValidation = false
              }
            }

            if (paiementRequired && (registration.paiement.captured || registration.paiement.other_captured || cart)) {
              registration.config.progress_bar.pourcentage += 33
              registration.config.paiement = true
            } else if (!paiementRequired) {
              registration.config.progress_bar.pourcentage += 33
              registration.config.paiement = true
            }

            if (registration.participant.nom && registration.participant.prenom) {
              registration.config.progress_bar.pourcentage += 33
              registration.config.participant = true
            }

            if (certificatRequired && (registration.docs.certificat !== '' && registration.docs.certificat !== null && registration.docs.certificat !== undefined)) {
              registration.config.progress_bar.pourcentage += 33
              registration.config.certificat = true
            } else if (!certificatRequired) {
              registration.config.progress_bar.pourcentage += 33
              registration.config.certificat = true
            }

            if (organisateurValidation) {
              registration.config.progress_bar.pourcentage += 1
            }

            if (registration.config.progress_bar.pourcentage <= 25) {
              registration.config.progress_bar.color = 'bg-danger'
            } else if (registration.config.progress_bar.pourcentage <= 50) {
              registration.config.progress_bar.color = 'bg-warning'
            } else if (registration.config.progress_bar.pourcentage <= 75) {
              registration.config.progress_bar.color = 'bg-warning'
            } else if (registration.config.progress_bar.pourcentage < 100) {
              registration.config.progress_bar.color = 'bg-success'
            } else if (registration.config.progress_bar.pourcentage >= 100) {
              registration.config.progress_bar.color = 'bg-success'
            }

            formatedRegistrations.push(registration)
          })
        }

        if (formatedRegistrations.length >= 1) {
          formatedRegistrations.forEach((registration) => {
            if (registration.produits.length >= 1) {
              if (registration.produits[0].race !== null && registration.produits[0].race !== undefined) {
                if (new Date(registration.produits[0].race.date_debut) >= new Date(Date.now())) {
                  api.next.push(registration)
                } else {
                  api.past.push(registration)
                }
              } else {
                api.past.push(registration)
              }
            } else {
              api.past.push(registration)
            }
          })
        }

        res.render('partials/registration/recap-user', { registrations: api })
      })
  },
  postDelete: (req, res) => {
    var id = req.params.registration
    var user = req.user.id
    Registration
      .findById(id)
      .exec((err, registration) => {
        if (err) {
          req.flash('error_msg', 'Une erreur est survenue lors de la suppression de l\'inscription')
          res.redirect('/inscription/recap/user/' + user)
        }
        if (String(registration.user) === String(user)) {
          Registration
            .deleteOne({_id: id})
            .exec((err) => {
              if (err) {
                req.flash('error_msg', 'Une erreur est survenue lors de la suppression de l\'inscription')
                res.redirect('/inscription/recap/user/' + user)
              }
              req.flash('success_msg', 'L\'inscription a bien été supprimée.')
              res.redirect('/inscription/recap/user/' + user)
            })
        }
      })
  },
  // Get organisateur a recap
  getRecapOrganisateur: (req, res) => {
    Promise
      .props({
        event: getEventData(req.params.id),
        inscriptions: getRegistrationsData(req.params.id)
      })
      .then((results) => {
        var admin = isRegistrationManager(req.user.id, results.event.author)

        if (admin) {
          var data = new Dashboard(chronometrageModules.registrationFormated(results.inscriptions, 'web'))
          var dashboard = data.formatedData(req.query.sort, req.query.epreuve)
          dashboard.event = results.event

          res.render('partials/registration/recap-organisateur', dashboard)
        } else {
          req.flash('error_msg', 'Vous n\'avez pas les droits pour administrer cet événement.')
          res.redirect('/organisateur/events')
        }
      })
      .catch((err) => {
        if (err) {
          req.flash('error_msg', 'Impossible de charger les inscriptions de cet événement.')
          res.redirect('/organisateur/events')
        }
      })
  },
  setCertificatReject: (req, res) => {
    var origine = req.headers.referer + '#' + req.params.id
    Registration.update({_id: req.params.id}, {
      $set: {
        'docs.certificat': '',
        'docs.certificat_validation': false,
        'organisateur_validation.certificat': false,
        'organisateur_validation.all': false,
        'updated': new Date(Date.now())
      }
    }, (err, data) => {
      if (err) {
        req.flash('error_msg', 'Une erreur est survenue')
        res.redirect(origine)
      } else {
        Registration
          .findOne({_id: req.params.id})
          .populate('event')
          .exec((err, registration) => {
            if (err) {
              req.flash('error_msg', 'Une erreur est survenue')
              res.redirect(origine)
            } else {
              var notification = new Notification({
                sender: req.user.id,
                registration: registration.id,
                receiver: [registration.user],
                message: 'Le certificat médicale de votre inscription N°' + registration.id + ' à ' + registration.event.name + ' vient d\'être rejeté par l\'organisateur.'
              })

              notification.save((err, notification) => {
                if (err) {
                  req.flash('error_msg', 'Une erreur est survenue')
                } else {
                  require('../../middleware/mailer')({user: registration.user})
                  req.flash('success_msg', 'Vous venez de refuser le certificat médical du dossier N°' + req.params.id + ', une notification a été envoyée au participant')
                }
                res.redirect(origine)
              })
            }
          })
      }
    })
  },
  setCheckoutValidate: (req, res) => {
    var origine = req.headers.referer + '#' + req.params.id
    Registration.update({_id: req.params.id}, {
      $set: {
        'organisateur_validation.all': true,
        'updated': new Date(Date.now())
      }
    }, (err, data) => {
      if (err) {
        req.flash('error_msg', 'Une erreur est survenue')
        res.redirect(origine)
      } else {
        Registration
          .findById(req.params.id)
          .populate('event')
          .exec((err, registration) => {
            if (err) {
              req.flash('error_msg', 'Une erreur est survenue')
              res.redirect(origine)
            } else {
              var notification = new Notification({
                sender: req.user.id,
                receiver: [registration.user],
                message: 'Votre inscription N°' + registration.id + ' à ' + registration.event.name + ' vient d\'être validée par l\'organisateur.'
              })

              notification.save((err, notification) => {
                if (err) {
                  req.flash('error_msg', 'Une erreur est survenue')
                } else {
                  require('../../middleware/mailer')({user: registration.user})
                  req.flash('success_msg', 'Le dossier N°' + req.params.id + ' a été mis à jour avec une validation du dossier')
                }
                res.redirect(origine)
              })
            }
          })
      }
    })
  }
}

module.exports = registrationCtrl
