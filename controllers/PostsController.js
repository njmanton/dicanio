// jshint node: true, esversion: 6
'use strict';

const models  = require('../models'),
      logger  = require('winston'),
      marked  = require('marked'),
      utils   = require('../utils'),
      moment  = require('moment');

const controller = {

  get_index: function(req, res) {
    models.Post.findAll({
      include: { 
        model: models.User,
        attributes: ['username', 'id']
      },
      attributes: ['id', 'title', 'body', 'sticky', 'createdAt', 'updatedAt'],
      order: [['sticky', 'DESC'], ['updatedAt', 'DESC']]
    }).then(posts => {
      posts.map(post => { post.body = marked(post.body) });
      res.render('posts/index', {
        title: 'Posts',
        data: posts
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
      title: 'Create New Post'
    });
  }],

  get_edit_id: [utils.isAdmin, function(req, res, id) {
    models.Post.findById(id).then(post => {
      if (!post) {
        req.flash('error', 'Sorry, that post could not be found');
        res.redirect('/posts/add');
      } else {
        res.render('posts/edit', {
          title: 'Edit Post',
          data: post
        })
      }

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
      author_id: usr.id || 0
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

    models.Post.create(data).then(p => {
      req.flash('success', `Post '${ p.title }' successfully added by ${ usr } `);
      res.redirect('/posts');
    }).catch(e => {
      logger.error(e)
      req.flash('error', 'Sorry, there was a problem creating that post');
      res.redirect('/posts');
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