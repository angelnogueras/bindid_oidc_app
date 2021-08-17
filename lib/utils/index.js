const crypto = require('crypto');

/**
 * Certificate x5c chain certificate to PEM
 * @param {*} cert base64-encoded DER PKIX certificate value (as per @link https://datatracker.ietf.org/doc/html/rfc7517#section-4.7)
 * @returns certificate in PEM format
 */
const certToPEM = (cert) => {
  cert = cert.match(/.{1,64}/g).join('\n');
  cert = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----\n`;
  return cert;
};

/**
 * Nonce generator
 * @returns nonce
 */
const genNonce = () => {
  return crypto.randomBytes(16).toString('hex');
};

module.exports = {
  certToPEM: certToPEM,
  generateNonce: genNonce,
};