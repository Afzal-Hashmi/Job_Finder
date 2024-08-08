const { createHmac, randomBytes } = require("crypto");
const { generateToken } = require("./auth");
const { client } = require("../connections/db");

/**
 * This function generates a hashed password and its corresponding salt.
 * It takes in a plain text password as an argument and returns an object
 * containing the salt and the hashed password.
 */
function hashPassword(password) {
  // Generate a random salt using the crypto.randomBytes method. The salt is
  // used to add an extra layer of security to the password.
  const salt = randomBytes(16).toString();

  // Check if the salt was successfully generated. If not, throw an error.
  if (!salt) {
    throw new Error("Could not generate salt");
  }

  // Generate the hashed password using the crypto.createHmac method. The hash
  // is a one-way encryption of the password using the salt.
  const hash = createHmac("sha256", salt).update(password).digest("hex");

  // Check if the hash was successfully generated. If not, throw an error.
  if (!hash) {
    throw new Error("Could not generate hash");
  }

  // Return an object containing the salt and the hashed password.
  return { salt, hash };
}

// This async function verifies a hashed password by comparing it to the stored hashed password and salt.
// It takes in two parameters: email (the user's email) and password (the plain text password to be verified).
// It returns the user object if the password is verified, otherwise it returns undefined.
async function verifyHashAndGenerateToken(email, password) {
  // Attempt to find a user with the given email in the database.

  const user = await client.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);

  // If no user is found, return undefined.
  if (user.rowCount == 0) throw new Error("No such user found");

  // Generate a new hash using the stored salt and the provided password.
  const hash = createHmac("sha256", user.rows[0].salt)
    .update(password)
    .digest("hex");

  // Compare the generated hash to the stored hashed password.
  // If they match, return the user object.
  // If they don't match, return undefined.
  if (hash === user.rows[0].hashedpassword) {
    const token = await generateToken(user.rows[0]);

    return token;
  }
  throw new Error("Wrong password");
}

module.exports = { hashPassword, verifyHashAndGenerateToken };
