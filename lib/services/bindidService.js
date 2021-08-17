const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');
const jwt = require('jsonwebtoken');
const jwt_decode = require('jwt-decode');
const { certToPEM } = require('../utils');

/**
 * Get ID and access tokens from authorization code
 * @param {String} code: authorization code
 * @returns 
 */
const tokenExchange = async code => {
  const bodyData = {
    'grant_type': 'authorization_code',
    'code': code,
    'redirect_uri': process.env.REDIRECT_URL,
    'client_id': process.env.CLIENT_ID,
    'client_secret': process.env.CLIENT_SECRET
  };

  // Exchange token
  try {
    const response = await axios.post(
      `${process.env.BINDID_BASE_URL}/token`,
      qs.stringify(bodyData),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded'} }
    );
    return response.data;
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
    throw error;
  }
};

/**
 * Retrieve BindID JWKS from /jwks endpoint 
 * @returns JWKS
 */
const retrieveJWKS = async () => {
  try {
    const resp_jwks = await axios.get(`${process.env.BINDID_BASE_URL}/jwks`); 
    return resp_jwks.data;
  }
  catch (error) {
    console.error("ERROR getting JWKS");
    console.log(error.message);

    throw error;
  }
};

/**
 * Validate BindID idToken
 * @param {String} jwt_idtoken: idtoken in JWT format
 * @param {String} nonce: nonce used in /authorize endpoint request 
 * @returns idToken body in JSON format
 */
const validateToken = async (jwt_idtoken, nonce) => {
  // Validate ID Token is signed by BindID
  const jwks = await retrieveJWKS();

  const decoded_id_token_header = jwt_decode(jwt_idtoken, {header:true});
  const jwks_key = jwks.keys.find(k => k.kid === decoded_id_token_header.kid);
  const publicKey = certToPEM(jwks_key.x5c[0]);

  let idtoken = null;
  try {
    idtoken = jwt.verify(jwt_idtoken, publicKey);
    console.log(idtoken);
  }
  catch (error) {
    console.log("Look out! Invalid Token Signature");
    console.error(error);

    throw new Error("ValidateToken: invalid token signature");
  }

  // Validate "audience"
  if (idtoken.aud !== process.env.CLIENT_ID) {
    throw new Error("ValidateToken: audience not valid");
  }

  // Validate "issuer"
  if (idtoken.iss !== process.env.BINDID_BASE_URL) {
    throw new Error("ValidateToken: issuer not valid");
  }

  // Validate expiry time
  if (idtoken.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("ValidateToken: token expired");
  }

  // Validate nonce
  // TODO: create a nonce for every home request and keep it to compare
  /*
  if (idtoken.nonce !== initialNonce) {
    return res.send({"message": "invalid nonce"});
  }
  */

  return idtoken;
};

/**
 * Set BindID Alias
 * @param {String} bindIdAlias 
 * @param {String} accessToken 
 */
const setBindIdAlias = async (bindIdAlias, accessToken) => {
  const bodyData = {
    "subject_session_at": accessToken,
    "reports": [{
      "type": "authentication_performed",
      "alias": bindIdAlias,
      "time": Math.floor(Date.now() / 1000), // seconds
    }]
  };

  console.log(bodyData);

  const feedbackAuthVal = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
    .update(accessToken)
    .digest('base64');

  try {
    const response = await axios.post(
      `${process.env.BINDID_API_URL}/session-feedback`,
      bodyData,
      { headers: {
        'Content-Type': 'application/json',
        'Authorization': `BindIdBackend AccessToken ${accessToken}; ${feedbackAuthVal}`,
      } }
    );
    console.log(`Feedback complete: ${JSON.stringify(response.data)}`);
  }
  catch (error) {
    console.error("ERROR feedback");
    console.log(error.message);

    throw error;
  }
};

/**
 * Get User Info from /userinfo endpoint
 * @param {String} access_token 
 * @returns 
 */
const getUserInfo = async access_token => {
  try {
    const userInfo = await axios.get(
      `${process.env.BINDID_BASE_URL}/userinfo`,
      { headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${access_token}`
      }}
    );
    return userInfo.data;
  }
  catch (error) {
    console.error("ERROR feedback");
    console.log(error.message);

    throw error;
  }

};

/**
 * Set Custom User Data
 * @param {String} accessToken 
 * @param {Object} data 
 */
const setUserData = async (accessToken, data = {}) => {

  const bodyData = { "data": data };
  console.log("UserData:", bodyData);

  const feedbackAuthVal = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
    .update(accessToken)
    .digest('base64');

  try {
    const response = await axios.post(
      `${process.env.BINDID_API_URL}/custom-user-data`,
      bodyData,
      { headers: {
        'Content-Type': 'application/json',
        'Authorization': `BindIdBackend AccessToken ${accessToken}; ${feedbackAuthVal}`,
      } }
    );
    console.log(`Set UserData complete: ${JSON.stringify(response.data)}`);
  }
  catch (error) {
    console.error("ERROR userdata");
    console.log(error.message);

    throw error;
  }
};

/**
 * Retrieves Customr User Data
 * @param {String} accessToken 
 * @returns custom user data
 */
const getUserData = async (accessToken) => {
  const feedbackAuthVal = crypto.createHmac('sha256', process.env.CLIENT_SECRET)
    .update(accessToken)
    .digest('base64');

  try {
    const response = await axios.get(
      `${process.env.BINDID_API_URL}/custom-user-data`,
      { headers: {
        'Content-Type': 'application/json',
        'Authorization': `BindIdBackend AccessToken ${accessToken}; ${feedbackAuthVal}`,
      } }
    );
    console.log(`UserData complete: ${JSON.stringify(response.data)}`);
    return response.data;
  }
  catch (error) {
    console.error("ERROR userdata");
    console.log(error.message);

    throw error;
  }
};


module.exports = {
  tokenExchange: tokenExchange,
  validateToken: validateToken,
  setBindIdAlias: setBindIdAlias,
  getUserInfo: getUserInfo,
  getUserData: getUserData,
  setUserData: setUserData,
};