// jshint node: true, esversion: 6
'use strict';

const fs      = require('fs'),
      hbs     = require('handlebars'),
      mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_KEY, domain: 'lcssl.org' });

const mail = {

  send: function(recipient, cc, subject, template_file, context, done) {

    // convert template and context into message
    let template = fs.readFileSync(__dirname + '/templates/' + template_file, 'utf8');
    let message = hbs.compile(template);

    var data = {
      from: '<goalmine@goalmine.eu>',
      to: recipient,
      subject: subject,
      text: message(context)
    };

    // if (cc) {
    //   data.cc = cc;
    // }

    mailgun.messages().send(data).then(response => {
      console.log('email sent', response); // move to winston
      done(response);
    }, function(err) {
      console.error('not sent', err); // move to winston
      done(err);
    });

  },

};

module.exports = mail;
