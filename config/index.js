// jshint node: true, esversion: 6
'use strict'; 

const config = {

  callbacks: {
    'FB': 'http://localhost:1980/auth/facebook/callback',
    'GG': 'http://localhost:1980/auth/google/callback'
  },

  cfg: {
    ignoreExpiry:   0, // ignores deadlines
    allowCurlAjax:  0, // allow a curl request sent to an ajax-only route
    allowCurlAuth:  0, // allow a curl request sent to an authorised route
    allowCurlAdmin: 0, // allow a curl request sent to an admin-only route
    allowCurlAnon:  0  // allow a curl request send to an anon-only route    
  },

  goalmine: {
    start_week: 450,
    league_start: 450,
    league_weeks: 30,
    hide_bets: 1,
    pts_closest: 3,
    win_pct: 0.75
  }

}

module.exports = config;