const { verifyToken } = require("./auth");

// This function creates a middleware function that checks if a cookie exists on the request object.
// If the cookie exists, it is verified using the verifyToken function from the auth.js file.
// If the token is valid, the user payload is added to the request object.
// If the token is not valid or does not exist, nothing happens.

// The function takes in one parameter: the name of the cookie to check for.

function checkCookie(tokenName) {
  // This is the middleware function that gets returned.
  return async (req, res, next) => {
    try {
      // Get the token from the request cookies.
      const token = req.cookies[tokenName];

      // If the token does not exist, call the next middleware function and exit.
      if (!token) return next();

      // Verify the token using the verifyToken function from the auth.js file.
      // This function returns a promise that resolves to the token payload if the token is valid.
      const payload = await verifyToken(token);

      // If the token is not valid, call the next middleware function and exit.
      if (!payload) return next();

      // If the token is valid, add the user payload to the request object.
      req.user = payload;
    } catch (error) {
      // If there is an error during the token verification process, do nothing.
    }

    // Call the next middleware function.
    return next();
  };
}

module.exports = checkCookie;
