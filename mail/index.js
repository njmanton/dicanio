// jshint node: true, esversion: 6
'use strict';

const fs      = require('fs'),
      hbs     = require('handlebars'),
      pkg     = require('../package.json'),
      logger  = require('winston'),
      mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_KEY, domain: 'goalmine.eu' });

const mail = {

  send: (recipient, cc, subject, template_file, context, done) => {

    // convert template and context into message
    let template = fs.readFileSync(__dirname + '/templates/' + template_file, 'utf8');
    let message = hbs.compile(template);

    context.app = {
      version: pkg.version,
      name: pkg.name
    }

    var data = {
      from: '<do-not-reply@goalmine.eu>',
      to: recipient,
      subject: subject,
      text: message(context),
      html: message(context)
    };

    // if (cc) {
    //   data.cc = cc;
    // }

    mailgun.messages().send(data).then(response => {
      logger.info(`email sent to ${ recipient } with subject ${ subject }`);
      done(response);
    }, err => {
      winston.error('email not sent');
      done(err);
    });

  },

};

module.exports = mail;
