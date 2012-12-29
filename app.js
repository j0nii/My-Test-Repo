"use strict";

/* global require, process, console, __dirname, exports, module */

var express = require('express'),
    routes = require('./routes'),
    path = require('path'),
    auth = require('http-auth'),
    config = require('./config'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    User = require('./datamodel/user'),
    flash = require('connect-flash'),
    util = require('util'),
    MongoStore = require('connect-mongo')(express);

var app = exports = module.exports = express();

passport.serializeUser(function (user, done) {
  done(null, user.email);
});

passport.deserializeUser(function (email, done) {
  User.findByEmail(email, function (error, user) {
    done(error, user);
  });
});

passport.use(new LocalStrategy(
  function (email, password, done) {
    process.nextTick(function () {
      User.findByEmail(email, function (error, user) {
        if (error)
          return done(error);

        if (!user) {
          return done(null, false, { message: 'Unknown user ' + email });
        }

        user.comparePassword(password, function (error, match) {
          if (match) {
            return done(null, user);
          } else {
            return done(null, false, { message: 'Username and password did not match' });
          }
        });
      });
    });
  }
));

app.configure('production', function () {
  app.use(express.logger('default'));
});

app.configure('development', function () {
  app.use(express.logger('dev'));
  app.locals.pretty = true;
});

app.configure(function () {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.cookieParser());
  app.use(express.bodyParser({
    uploadDir: __dirname + '/public/uploads',
    keepExtensions: true
  }));
  app.use(express.limit('20mb'));
  app.use(express.methodOverride());
  app.use(express.session({
    secret: 'smug hippies',
    store: new MongoStore({
      url: config.mongo.url
    })
  }));
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

app.configure('production', function () {
  app.use(express.errorHandler({
    showMessage: true,
    showStack: false
  }));
});

// require HTTP basic
var basic = auth({
  authRealm: "Beach Energy - Private Area",
  authList: ['beaches:beaches']
});

// filters
app.all('*', function (req, res, next) {
  basic.apply(req, res, function () { next(); });
});

// session
app.all('*', function (req, res, next) {
  app.locals.currentUser = req.user || new User();
  app.locals.messages = {
    error: req.flash('error'),
    info: req.flash('info'),
    success: req.flash('success'),
    warning: req.flash('warning')
  };
  next();
});


// Main routes
app.get('/', routes.index);

app.get('/admin/users', routes.admin.users.index);
app.post('/admin/users/:email', routes.admin.users.setRole);
app.post('/admin/users/:email/delete', routes.admin.users.delete);

app.get('/admin/articles', routes.admin.articles.index);
app.post('/admin/articles/:slug', routes.admin.articles.setVisible);
app.post('/admin/articles/:slug/delete', routes.admin.articles.delete);

app.get('/admin/images', routes.admin.images.index);
app.post('/admin/images/:slug', routes.admin.images.setVisible);
app.post('/admin/images/:slug/delete', routes.admin.images.delete);

app.get('/admin/docs', routes.admin.docs.index);
app.post('/admin/docs/:slug', routes.admin.docs.setVisible);
app.post('/admin/docs/:slug/delete', routes.admin.docs.delete);

app.get('/admin/links', routes.admin.links.index);
app.post('/admin/links/:id', routes.admin.links.setVisible);
app.post('/admin/links/:id/delete', routes.admin.links.delete);

app.get('/users/login', routes.users.login);
app.post('/users/login', passport.authenticate('local', {
  failureRedirect: '/',
  successRedirect: '/',
  failureFlash: true
}));
app.get('/users/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});
app.get('/users/edit', routes.users.edit);
app.get('/users/new', routes.users.new);
app.post('/users', routes.users.create);
app.post('/users/:email', routes.users.update);

app.get('/articles', routes.articles.index);
app.post('/articles', routes.articles.create);
app.get('/articles/new', routes.articles.new);
app.get('/articles/:article', routes.articles.show);
app.post('/articles/:article', routes.articles.update);
app.get('/articles/:article/edit', routes.articles.edit);

app.get('/images', routes.images.index);
app.post('/images', routes.images.create);
app.get('/images/new', routes.images.new);
app.get('/images/:slug', routes.images.show);
app.post('/images/:slug', routes.images.update);
app.get('/images/:slug/edit', routes.images.edit);

app.get('/docs', routes.docs.index);
app.post('/docs', routes.docs.create);
app.get('/docs/new', routes.docs.new);
app.get('/docs/:slug', routes.docs.show);
app.post('/docs/:slug', routes.docs.update);
app.get('/docs/:slug/edit', routes.docs.edit);

app.get('/links', routes.links.index);
app.get('/links/new', routes.links.new);
app.post('/links', routes.links.create);
app.get('/links/:id/edit', routes.links.edit);
app.post('/links/:id', routes.links.update);
