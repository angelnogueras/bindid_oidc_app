require('dotenv').config();

const express = require('express');
const fs = require('fs');
const https = require('https');
const helmet = require('helmet');
const csp = require('helmet-csp');
const session = require('express-session');
const app = express();

const PORT = process.env.PORT || 3000;

//// MiddleWares ////
// Security Middleware
app.use(helmet());
app.use(csp({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'", "data:"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", `${process.env.BINDID_BASE_URL}`, "https://polyfill.io"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
  reportOnly: false,
}));
app.disable('x-powered-by');

// Session Middleware
app.use(session({
  secret: process.env.SECRET_SIGN_SESSION_COOKIE,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 30 * 60 * 1000, // 30min (in ms.)
    secure: true,
    sameSite: 'lax',
  },
}));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');
//// MiddleWares ////

// Routes
app.use(require('./lib/routes/index'));

// Error handling
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
https.createServer(
  {
    key: fs.readFileSync('./keys/server.key'),
    cert: fs.readFileSync('./keys/server.cert'),
  },
  app
).listen(PORT, _ => console.log(`Server running HTTPS on port ${PORT}`));
