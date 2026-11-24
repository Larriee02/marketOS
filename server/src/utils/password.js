const AppError = require('./AppError');

module.exports = function validatePassword(password) {
  if (typeof password !== 'string' || Array.from(password).length < 12 || Buffer.byteLength(password) > 72) {
    throw new AppError('Use at least 12 characters and at most 72 UTF-8 bytes for your password.', 400, 'WEAK_PASSWORD');
  }
};
