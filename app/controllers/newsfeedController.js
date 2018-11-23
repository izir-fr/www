// Modèles
var Post = require('../models/post')

var newsfeedController = {
  getAllPosts: (req, res) => {
    Post
      .find({ 'published_date': { $gte: 0 } })
      .sort({ 'published_date': -1 })
      .exec((err, posts) => {
        if (err) {
          res.redirect('/event/finder')
        }
        res.render('partials/newsfeed/index', { posts: posts })
      })
  }
}

module.exports = newsfeedController