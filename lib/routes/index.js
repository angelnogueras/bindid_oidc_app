const express = require('express');
const { 
  tokenExchange, 
  setBindIdAlias, 
  getUserData, 
  setUserData, 
  validateToken, 
  getUserInfo 
} = require('../services/bindidService');

const router = express.Router();

// Home route
const index = (req, res) => {
  res.render('index', {
    redirect_uri: process.env.REDIRECT_URL,
    client_id: process.env.CLIENT_ID,
    bindid_base: process.env.BINDID_BASE_URL,
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
  const tokenExchangeBody = await tokenExchange(code);
  const jwt_idtoken = tokenExchangeBody.id_token;
  console.log(jwt_idtoken);

  // TODO: NONCE required as 2nd parameter
  const idToken = await validateToken(jwt_idtoken, null);
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
    await setBindIdAlias(idToken.sub, access_token);
  }

  // Get User Info from /userinfo endpoint
  let userInfo = null;
  try {
    await getUserInfo(access_token);
  } 
  catch (error) {
    console.log(`Error getting user info: ${error}`);
  }

  /////////////// Uncomment to set some static User Data
  //await setUserData(access_token, some_data_object);
  ///////////////

  // Get User Data
  let userData = null;
  try {
    userData = await getUserData(access_token);
  }
  catch (error) {
    console.log(`Error getting user data: ${error}`);
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