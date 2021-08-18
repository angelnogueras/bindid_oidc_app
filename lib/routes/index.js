const express = require('express');
const { 
  tokenExchange, 
  setBindIdAlias, 
  getUserData, 
  setUserData, 
  validateToken, 
  getUserInfo 
} = require('../services/bindidService');
const { generateNonce } = require('../utils');

const router = express.Router();

// Home route
const index = (req, res) => {
  // Generate nonce and save in session for validation
  const nonce = generateNonce();
  req.session.nonce = nonce;

  res.render('index', {
    redirect_uri: process.env.REDIRECT_URL,
    client_id: process.env.CLIENT_ID,
    bindid_base: process.env.BINDID_BASE_URL,
    nonce: nonce,
  });
};
router.get('/', index);
router.get('/index.html', index);

// Redirect URL
router.get('/redirect.html', (req, res) => {
  res.render('redirect', {
    client_id: process.env.CLIENT_ID,
    bindid_base: process.env.BINDID_BASE_URL,
  });
});

// API to fetch user data and show it in redirect URL screen
router.get('/token_exchange', async (req, res) => {
  // TODO: error handling

  // Get token
  const code = req.query.code;
  let tokenExchangeBody;
  try {
    tokenExchangeBody = await tokenExchange(code);
  } 
  catch (error) {
    res.status(400).send({
      error: 'Invalid Request',
      message: error.message
    });
  }
  const jwt_idtoken = tokenExchangeBody.id_token;
  console.log(jwt_idtoken);

  const idToken = await validateToken(jwt_idtoken, req.session.nonce);
  const access_token = tokenExchangeBody.access_token;
  /* Other usefull info:
    const scope = tokenExchangeBody.scope;
    const expires_in = tokenExchangeBody.expires_in;
    const token_type = tokenExchangeBody.token_type;
  */

  // jwt_decode throws Invalid Token Error
  // const decodedHeader = jwt_decode(jwt_idtoken, {header: true});
  // const decodedBody = jwt_decode(jwt_idtoken);

  // Set BindID Alias 
  const bindIdAlias = idToken.bindid_alias;
  console.log(`BindIdAlias: ${bindIdAlias}`);
  if (!bindIdAlias) {
    // TODO: This should be a New User, so register or something
    // For testing (and be able to set/get user data) just setting "sub" as alias
    try {
      await setBindIdAlias(idToken.sub, access_token);
    }
    catch (error) {
      res.status(500).send({
        error: 'Internal Error',
        message: error.message
      });
    }
  }

  // Get User Info from /userinfo endpoint
  let userInfo = null;
  try {
    userInfo = await getUserInfo(access_token);
  } 
  catch (error) {
    console.log(`Error getting user info: ${error}`);
    userInfo = error.message;
  }

  /////////////// Uncomment to set some static User Data
  /*
  try {
    await setUserData(access_token, {some: "data"});
  }
  catch (error) {
    console.log(`Error setting user data: ${error}`);
  }
  */
  ///////////////

  // Get User Data
  let userData = null;
  try {
    userData = await getUserData(access_token);
  }
  catch (error) {
    console.log(`Error getting user data: ${error}`);
    userData = error.message;
  }

  // Send information to page
  // Uncomment the info to be shown in /redirect.html
  res.send({
    //"message": "authentication ok",
    //"bindid_header": decodedHeader,
    "bindid_passport": idToken,
    //"userinfo": userInfo,
    "user_data": userData,
  });

});


module.exports = router;