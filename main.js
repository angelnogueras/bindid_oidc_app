const PORT = 3000;

const express = require('express');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const qs = require('qs');
const jwt_decode = require('jwt-decode');
const identityStore = require('./identityStore');
const { setBindIdAlias, getUserData, setUserData } = require('./bindidService');
const app = express();
require('dotenv').config();

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');


/*
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
*/

const index = (req, res) => {
  res.render('index', {
    redirect_uri: process.env.REDIRECT_URL,
    client_id: process.env.CLIENT_ID,
  });
};
app.get('/', index);
app.get('/index.html', index);

app.get('/redirect.html', (req, res) => {
  res.render('redirect', {
    client_id: process.env.CLIENT_ID,
  });
});

//TODO: add router
app.get('/token_exchange', async (req, res) => {
  // Get token
  const code = req.query.code;
  // const state = req.query.state;

  const bodyData = {
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': process.env.REDIRECT_URL,
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
  };

  //console.log(`About to exchange code for token.`);
  //console.log(bodyData);
  //console.log(`${qs.stringify(bodyData)}`);

  // Exchange token
  let response = null;
  try {
    response = await axios.post(
      'https://signin.bindid-sandbox.io/token',
      qs.stringify(bodyData),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded'} }
    );
    console.log("done");
  }
  catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
    else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    }
    else {
      console.log(error.message);
    }
    return res.send({"message": "error retrieving token"});
  }


  // console.log(response.status);
  // console.log(response.statusText);
  // console.log(response.headers);
  console.log(response.data);
  const id_token = response.data.id_token;
  const access_token = response.data.access_token;
  //const scope = response.data.scope;
  //const expires_in = response.data.expires_in;
  //const token_type = response.data.token_type;

  /*** BindID Alias */
  try {
    const decodedHeader = jwt_decode(id_token, {header: true});
    const decodedBody = jwt_decode(id_token);

    const bindIdAlias = decodedBody.bindid_alias;
    console.log(`BindIdAlias: ${bindIdAlias}`);

    if (!bindIdAlias) {
      // TODO: This should be a New User, so register or something
      // For testing (and be able to set/get user data) just setting "sub" as alias
      await setBindIdAlias(decodedBody.sub, access_token);
    }
  }
  catch (err) {
    // InvalidTokenError
    console.error(err);
    res.send({
      "message": "ups, this is embarrasing",
      "error": err
    });
  }
  /*** BindID Alias */

  let responseUI = null;
  try {
    responseUI = await axios.get(
      'https://signin.bindid-sandbox.io/userinfo',
      { headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${access_token}`
      }}
    );
    console.log("done");
  }
  catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
    else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    }
    else {
      console.log(error.message);
    }
    return res.send({"message": "error retrieving userinfo"});
  }


  /////////////// User Data
  //await setUserData(access_token);
  ///////////////
  let userData = null;
  try {
    userData = await getUserData(access_token);
  }
  catch (error) {
    console.log(`Error getting user data: ${error}`);
  }

  try {
    const decodedHeader = jwt_decode(id_token, {header: true});
    const decodedBody = jwt_decode(id_token);

    res.send({
      //"message": "authentication ok",
      //"bindid_header": decodedHeader,
      "bindid_passport": decodedBody,
      //"userinfo": data in responseUI ? responseUI.data : null
      "user_data": userData,
    });
  }
  catch (err) {
    // InvalidTokenError
    console.error(err);
    res.send({
      "message": "ups, this is embarrasing",
      "error": err
    });
  }

});

/*
app.get('/token_exchange_page', async (req, res) => {
  // Get token
  const code = req.query.code;
  //console.log(req.query);

  const bodyData = {
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': process.env.REDIRECT_URL,
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
  };

  console.log(`About to exchange code for token:`);
  //console.log(bodyData);
  //console.log(`${qs.stringify(bodyData)}`);

  // Exchange token
  let response = null;
  try {
    response = await axios.post(
      'https://signin.bindid-sandbox.io/token',
      qs.stringify(bodyData),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded'} }
    );
    console.log("done");
  }
  catch (error) {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    }
    else if (error.request) {
      // The request was made but no response was received
      console.log(error.request);
    }
    else {
      console.log(error.message);
    }
    return res.send({"message": "error retrieving token"});
  }


  console.log(response.data);
  const id_token = response.data.id_token;
  console.log(jwt_decode(id_token));
  const access_token = response.data.access_token;

  try {
    const decodedHeader = jwt_decode(id_token, {header: true});
    const decodedBody = jwt_decode(id_token);

    const bindIdAlias = decodedBody.bindid_alias;
    console.log(`BindIdAlias: ${bindIdAlias}`);

    if (!bindIdAlias) {
      // New User
      // TODO: Save access_token as session variable instead? Maybe not
      // good idea to keep it stateless
      return res.redirect(`/passwordLogin.html?access_token=${access_token}`);
    }
    else {
      // Existing User
      const userProfile = JSON.stringify(identityStore.getUserProfile(bindIdAlias));
      return res.redirect(`/authenticated?user_details=${encodeURIComponent(userProfile)}`);
    }
  }
  catch (err) {
    // InvalidTokenError
    console.error(err);
    res.send({
      "message": "ups, this is embarrasing",
      "error": err
    });
  }

});
*/


app.post('/authenticate', (req, res) => {
  const userProfile = identityStore.getUserProfile(req.body.username, req.body.password);
  if (userProfile) {
    // Feedback bindIdAlias
    // TODO: do not send/receive access token
    setBindIdAlias(userProfile.userId, req.body.access_token);

    res.redirect(`/authenticated?user_details=${encodeURIComponent(JSON.stringify(userProfile))}`);
  }
  else {
    //TODO: user not found ==> invalid credentials
  }
});

app.get('/authenticated', (req, res) => {
  const userDetails = JSON.parse(req.query.user_details);
  if (userDetails) {
    // TODO: change
    res.send(`Hello, ${userDetails.fullName}`);
  }
  else {
    // TODO: do something
  }
});


https.createServer(
  {
    key: fs.readFileSync('./keys/server.key'),
    cert: fs.readFileSync('./keys/server.cert'),
  },
  app
).listen(PORT, _ => console.log(`Server running on https://localhost:${PORT}`));
