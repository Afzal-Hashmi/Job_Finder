const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const cookieparser = require("cookie-parser");
const { Connect } = require("./connections/db");
// const { createServer } = require("http");
// const { Server } = require("socket.io");
// const io = new Server();
app.use(cors());
app.use(cookieparser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
// app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use("/", require("./routes/auth"));
app.use("/v1", require("./routes/Job_Portal"));

// io.on("connection", (socket) => {
//   console.log("a user connected");
//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });
// const httpServer = createServer(app);
// httpServer.listen(process.env.PORT || 8080, () => {
//   Connect();
//   console.log("listening on port", process.env.PORT || 8080);
// });

app.listen(process.env.PORT || 8080, () => {
  Connect();
  console.log("listening on port", process.env.PORT || 8080);
});
