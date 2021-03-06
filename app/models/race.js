var mongoose = require('mongoose')
var Schema = mongoose.Schema

// Event Schema
var raceSchema = mongoose.Schema({
  author: { type: Schema.ObjectId, ref: 'User', required: true },
  event: { type: Schema.ObjectId, ref: 'Event', required: true },
  name: { type: String },
  discipline: { type: String },
  description: { type: String },
  tarif: { type: Number },
  distance: { type: Number },
  denivele: { type: Number },
  placesDispo: { type: Number },
  date_debut: { type: Date },
  // team
  team: { type: Boolean },
  team_qty_min: { type: Number },
  team_qty_max: { type: Number },
  created_at: { type: Date, required: true, default: Date.now },
  updated: { type: Date }
})

module.exports = mongoose.model('Race', raceSchema)
