const axios = require('axios');
const crypto = require('crypto');


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

  let response = null;
  try {
    response = await axios.post(
      'https://api.bindid-sandbox.io/session-feedback',
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

  let response = null;
  try {
    response = await axios.post(
      'https://api.bindid-sandbox.io/custom-user-data',
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

  let response = null;
  try {
    response = await axios.get(
      'https://api.bindid-sandbox.io/custom-user-data',
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
    return {error: error.message};
  }
};


module.exports = {
  setBindIdAlias: setBindIdAlias,
  getUserData: getUserData,
  setUserData: setUserData,
};