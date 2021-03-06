// jshint node: true, esversion: 6
'use strict';


const models    = require('./models'),
      moment    = require('moment'),
      marked    = require('marked'),
      mail      = require('./mail'),
      fs        = require('fs'),
      gravatar  = require('gravatar'),
      logger    = require('winston'),
      emoji     = require('node-emoji'),
      utils     = require('./utils'),
      passport  = require('passport');

const routes = app => {

  app.get('/', (req, res) => {
    let threeMonthsAgo = moment().subtract(3, 'months').format('YYYY-MM-DD');
    models.Post.findAll({
      where: { createdAt: { $gte: threeMonthsAgo }, },
      attributes: ['id', 'title', 'body', 'author_id', 'createdAt', 'updatedAt'],
      include: {
        model: models.User,
        attributes: ['id', 'username']
      },
      order: [['sticky', 'desc'], ['updatedAt', 'desc']]
    }).then(posts => {
      posts.map(post => { 
        post.body = emoji.emojify(marked(post.body)); 
        post.date = moment(post.createdAt).format('DD MMM, HH:mm');
        post.udate = post.updatedAt ? moment(post.updatedAt).format('DD MMM, HH:mm') : null;
      });
      res.render('main', {
        title: 'Welcome',
        posts: posts
      });      
    })
  });

  app.get('/money/:uid', utils.isAuthenticated, (req, res) => {
    if (req.user && (req.params.uid == 0 || req.user.admin || req.user.id == req.params.uid)) {
      models.Ledger.view(req.params.uid).then(data => {
        if (!data) {
          res.status(404).render('errors/404');
        } else {
          res.render('ledgers/view', {
            title: 'Ledger for ' + data.username,
            data: data.rows
          })          
        }

      })
    } else {
      res.sendStatus(403);
    }
  });

  app.get('/pot', utils.isAjax, (req, res) => {
    models.Ledger.balance(0).then(pot => { 
      res.status(200).send(pot.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' }));
    })
  })

  // login
  app.get('/login', utils.isAnon, (req, res) => {
    res.render('players/login', {
      title: 'Login'
    });
  });

  app.post('/login', 
    passport.authenticate('local', {
      successReturnToOrRedirect: '/home',
      failureRedirect: '/',
      failureFlash: true
    })
  );

  app.get('/home', utils.isAuthenticated, (req, res) => {
    
    res.render('players/view', {
      title: 'Home',
      gravatar: gravatar.url(req.user.email, {s: '100', r: 'x', d: 'retro'}, true)
    });

  });

  // app.get('/auth/facebook', 
  //   passport.authenticate('facebook', {
  //     //scope: ['email', 'photo']
  //   })
  // );

  // app.get('/auth/facebook/callback', 
  //   passport.authenticate('facebook', {
  //     successRedirect: '/home',
  //     failureRedirect: '/'
  //   })
  // );

  // app.get('/auth/google', 
  //   passport.authenticate('google', {
  //     scope: ['profile']
  //   })
  // );

  // app.get('/auth/google/callback',
  //   passport.authenticate('google', {
  //     successRedirect: '/home',
  //     failureRedirect: '/',
  //     failureFlash: true
  //   })
  // );

  app.get('/logout', (req, res) => {
    let usr = req.user ? req.user.username : '(unknown)';
    logger.info(usr + ' logged out');
    req.logout();
    req.flash('info', 'Logged Off');
    res.redirect('/');
  });

  // any other static content
  app.get('/pages/:page', function(req, res) {
    let path = `views/pages/${ req.params.page }.hbs`;
    try {
      fs.accessSync(path, fs.F_OK);
      res.render('pages/' + req.params.page, {
        title: req.params.page
      });      
    } catch (e) {
      res.status(404).render('errors/404', { title: 'Uh-oh' });
    }
  });

}

module.exports = routes;