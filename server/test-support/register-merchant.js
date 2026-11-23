module.exports = async function registerMerchant(authService, details) {
  const challenge = await authService.requestSignupOtp(details);
  return authService.register({ ...details, otp: challenge.otpPreview });
};
