const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const port = 5000;
const { OAuth2Client } = require("google-auth-library");
const db = require("./db/connection");
const dotenv = require("dotenv");
dotenv.config();

const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const client = new OAuth2Client(process.env.REACT_APP_GOOGLE_CLIENT_ID);

app.use(cors());
app.use(bodyParser.json());

/* --------------- */

app.get("/", function (req, res) {
  res.send("Welcome to Pomopals!");
});

httpServer.listen(port, () => {
  console.log(`pomopals backend is running on port ${port}...`);
});
