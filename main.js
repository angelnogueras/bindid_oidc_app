const express = require('express');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const qs = require('qs');
const jwt_decode = require('jwt-decode');
const { setBindIdAlias, getUserData, setUserData } = require('./bindidService');
const app = express();
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');


/********** ROUTES (TODO: create router) ********/
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

app.get('/token_exchange', async (req, res) => {
  // Get token
  const code = req.query.code;

  const bodyData = {
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': process.env.REDIRECT_URL,
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
  };

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
    return res.send({
      "message": "error retrieving token"
    });
  }


  // console.log(response.status);
  // console.log(response.statusText);
  // console.log(response.headers);
  console.log(response.data);
  const id_token = response.data.id_token;
  const access_token = response.data.access_token;
  /* Other usefull info:
    const scope = response.data.scope;
    const expires_in = response.data.expires_in;
    const token_type = response.data.token_type;
  */

  // Set BindID Alias 
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
      "message": "ups, this is embarrasing, something went wrong setting alias",
      "error": err
    });
  }

  // Get User Info from /userinfo endpoint
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


  /////////////// Uncomment to set some static User Data
  //await setUserData(access_token);
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
  try {
    const decodedHeader = jwt_decode(id_token, {header: true});
    const decodedBody = jwt_decode(id_token);

    // Uncomment the info to be shown in /redirect.html
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


https.createServer(
  {
    key: fs.readFileSync('./keys/server.key'),
    cert: fs.readFileSync('./keys/server.cert'),
  },
  app
).listen(PORT, _ => console.log(`Server running on https://localhost:${PORT}`));
