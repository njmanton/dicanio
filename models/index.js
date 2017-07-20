// jshint node: true, esversion: 6
'use strict';

const Sequelize = require('sequelize'),
      sequelize = new Sequelize(process.env.DB_CONN, { logging: null }),
      db        = {
        Match:       sequelize.import('./matches.js'),
        Team:        sequelize.import('./teams.js'),
        League:      sequelize.import('./leagues.js'),
        Bet:         sequelize.import('./bets.js'),
        User:        sequelize.import('./users.js'),
        Prediction:  sequelize.import('./predictions.js'),
        Killer:      sequelize.import('./killers.js'),
        Kentry:      sequelize.import('./kentries.js'),
        Week:        sequelize.import('./weeks.js'),
        Standing:    sequelize.import('./standings.js'),
        Post:        sequelize.import('./posts.js'),
        Place:       sequelize.import('./places.js'),
        Ledger:      sequelize.import('./ledgers.js')
      };

// define model associations

// team[a] 1:n match
// team[b] 1:n match 
db.Team.hasMany(db.Match);
db.Match.belongsTo(db.Team, { as: 'TeamA', foreignKey: 'teama_id' });
db.Match.belongsTo(db.Team, { as: 'TeamB', foreignKey: 'teamb_id' });

db.User.hasMany(db.Post, { foreignKey: 'author_id' });
db.Post.belongsTo(db.User, { foreignKey: 'author_id' });

// league 1:n match
db.League.hasMany(db.Match, { foreignKey: 'league_id' });
db.Match.belongsTo(db.League, { foreignKey: 'league_id' });

// user 1:n prediction
db.User.hasMany(db.Prediction, { foreignKey: 'user_id' });
db.Prediction.belongsTo(db.User, { foreignKey: 'user_id' });

// user 1:n bet
db.User.hasMany(db.Bet, { foreignKey: 'user_id' });
db.Bet.belongsTo(db.User, { foreignKey: 'user_id' });

// match 1:n prediction
db.Match.hasMany(db.Prediction, { foreignKey: 'match_id' });
db.Prediction.belongsTo(db.Match, { foreignKey: 'match_id' });

// match 1:n bet
db.Match.hasMany(db.Bet, { foreignKey: 'match_id' });
db.Bet.belongsTo(db.Match, { foreignKey: 'match_id' });

// week 1:n match
db.Week.hasMany(db.Match, { foreignKey: 'week_id' });
db.Match.belongsTo(db.Week, { foreignKey: 'week_id' })

// user 1:n standings
db.User.hasMany(db.Standing, { foreignKey: 'user_id' });
db.Standing.belongsTo(db.User, { foreignKey: 'user_id' });

// week 1:n standings
db.Week.hasMany(db.Standing, { foreignKey: 'week_id' });
db.Standing.belongsTo(db.Week, { foreignKey: 'week_id' })

// user 1:n places
db.User.hasMany(db.Place, { foreignKey: 'user_id' });
db.Place.belongsTo(db.User, { foreignKey: 'user_id' });

// week 1:n places
db.Week.hasMany(db.Place, { foreignKey: 'week_id' });
db.Place.belongsTo(db.Week, { foreignKey: 'week_id' });

// user 1:n ledgers
db.User.hasMany(db.Ledger, { foreignKey: 'user_id' });
db.Ledger.belongsTo(db.User, { foreignKey: 'user_id' });

// killer 1:n kentry
db.Killer.hasMany(db.Kentry, { foreignKey: 'killer_id' });
db.Kentry.belongsTo(db.Killer, { foreignKey: 'killer_id' });

// match 1:n kentry
db.Match.hasMany(db.Kentry, { foreignKey: 'match_id' });
db.Kentry.belongsTo(db.Match, { foreignKey: 'match_id' });

// user 1:n kentry
db.User.hasMany(db.Kentry, { foreignKey: 'user_id' });
db.Kentry.belongsTo(db.User, { foreignKey: 'user_id' });

// user 1:n killer
db.User.hasMany(db.Killer, { foreignKey: 'admin_id' });
db.Killer.belongsTo(db.User, { foreignKey: 'admin_id' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
