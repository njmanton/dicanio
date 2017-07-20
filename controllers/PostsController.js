// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      logger  = require('winston'),
      marked  = require('marked'),
      utils   = require('../utils'),
      moment  = require('moment');

const controller = {

  get_index: function(req, res) {
    models.Post.findAll({}).then(posts => {
      res.render('posts/index', {

      });
    })
  },

  get_id: function(req, res, id) {
    models.Post.findById(id, {}).then(post => {
      res.render('posts/view', {

      });
    })
  },

  get_add: [utils.isAdmin, function(req, res) {
    res.render('posts/add', {

    });
  }],

  get_edit_id: [utils.isAdmin, function(req, res, id) {
    models.Post.findById(id, {

    }).then(post => {
      res.render('posts/edit', {

      })
    })
  }],

  post_preview: [utils.isAdmin, function(req, res) {
    res.send(marked(req.body.body));
  }],

  post_edit: [utils.isAdmin, function(req, res) {
    // handle req.body
    let usr = req.user ? req.user.username : '(unknown)';
    let upd = {
      body: req.body.body,
      sticky: req.body.sticky,
      author_id: req.body.author
    };
    models.Post.update(upd, {
      where: { id: req.body.id }
    }).then(r => {
      if (r) {
        logger.info(`Post id ${ id } was successfully updated by ${ usr }`);
        req.flash('success', 'Post updated');
        res.redirect('/posts');
      } else {

      }
    }).catch(e => {
      logger.error(e);
      req.flash('error', 'Sorry, there was an error updating that post');
      res.redirect('/posts');
    })
  }],

  post_add: [utils.isAdmin, function(req, res) {
    let usr = req.user ? req.user : {};
    let data = {
      title: req.body.title,
      body: req.body.body,
      sticky: req.body.sticky,
      author_id: usr.id || 0
    }
    //res.send(`<pre>${ JSON.stringify(data, null, 2) }</pre>`);
    models.Post.create(data).then(p => {
      console.log(p);
      res.send('OK');
    }).catch(e => {
      console.log(e);
    })
  }],

  delete_id: [utils.isAdmin, function(req, res, id) {
    let usr = req.user ? res.user.username : '(unknown)';
    models.Post.destroy({
      where: { id: id }
    }).then(post => {
      logger.info(`Post id ${ id } was deleted by ${ usr }`);
      res.status(200).send({ delete: true, count: post })
    }).catch(e => {
      logger.error(e);
      res.status(500).send({ delete: false, msg: 'Could not delete post from database'})
    })
  }]
}

module.exports = controller;