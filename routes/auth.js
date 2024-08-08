const router = require("express").Router();
const { client } = require("../connections/db");
const checkCookie = require("../middlewares/checkCookies");
const {
  hashPassword,
  verifyHashAndGenerateToken,
} = require("../middlewares/hashpassword");

router.get("/login", checkCookie("token"), function (req, res) {
  if (req.user) {
    return res.redirect("/v1/dashboard");
  }
  return res.render("login");
});
router.post("/login", async function (req, res) {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    if (!email || !password)
      return res
        .status(400)
        .render("login", { message: "All fields are required" });
    const token = await verifyHashAndGenerateToken(
      email.toLowerCase(),
      password
    );

    if (!token)
      return res
        .status(400)
        .render("login", { message: "Invalid credentials" });
    return res.status(200).cookie("token", token).redirect("/v1/dashboard");
  } catch (error) {
    return res.status(500).render("login", { message: error.message });
  }
});
router.get("/", function (req, res) {
  return res.render("register");
});
router.post("/register", async function (req, res) {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role)
      return res
        .status(400)
        .render("register", { message: "All fields are required" });
    const exist = await client.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);
    if (exist.rows.length > 0)
      return res.status(400).json({ message: "User already exist" });
    const { salt, hash } = await hashPassword(password);
    const user = await client.query(
      `INSERT INTO users (username, email, salt, hashedpassword,  role) VALUES ($1 , $2, $3, $4, $5)`,
      [username, email.toLowerCase(), salt, hash, role]
    );
    if (user.rowcount == 0)
      return res
        .status(500)
        .render("register", { message: "Something went wrong" });
    return res.status(200).redirect("/login");
  } catch (error) {
    return res.status(500).render("register", { message: error.message });
  }
});
router.get("/logout", function (req, res) {
  return res.clearCookie("token").redirect("/login");
});
module.exports = router;
