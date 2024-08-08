const jwt = require("jsonwebtoken");

// This function generates a JSON Web Token (JWT) for the given user object.
// A JWT is a compact, URL-safe means of representing claims to be transferred
// between two parties. The token contains a payload that includes the user's
// information such as their ID, username, email, and role.
//
// Parameters:
// - user: An object containing the user's information. It should have the
//   following properties: id, username, email, and role.
//
// Returns:
// - A JWT string that encodes the user's information and is signed with a
//   secret key. The JWT is valid for 2 hours.
//
// Throws:
// - If there is an error during the token generation process, an error message
//   is logged to the console.
async function generateToken(user) {
  // Create a payload object that contains the user's information.
  const payload = {
    userid: user.userid, // The user's ID.
    username: user.username, // The user's username.
    email: user.email, // The user's email.
    role: user.role, // The user's role.
  };
  // Sign the payload with a secret key and set the token to expire in 2 hours.
  const token = await jwt.sign(payload, process.env.JWT_Secret, {
    expiresIn: "2h",
  });

  if (!token) throw new Error("Error Generating Token");
  // Return the generated token.
  return token;
}

/**
 * This function verifies a JSON Web Token (JWT) by decoding it using a secret key.
 * The function takes in a JWT as a parameter and returns the decoded payload of the JWT if the token is valid.
 * If the token is not valid, the function returns undefined.
 */
async function verifyToken(token) {
  //
  // The await keyword is used to wait for the promise returned by jwt.verify to resolve before continuing execution.
  // If the token is valid, the decoded payload of the JWT is returned.
  // If the token is not valid, an error is thrown.
  const payload = await jwt.verify(
    token,
    process.env.JWT_Secret,
    (error, payload) => {
      if (error) throw new Error(error.message);
      return payload;
    }
  );
  // The decoded payload of the JWT is returned by the function.
  return payload;
}

module.exports = { generateToken, verifyToken };
