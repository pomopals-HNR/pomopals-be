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

/* Socket!!! */
io.on("connection", (socket) => {
  console.log("new connection");
  socket.on("join-room", (message) => {
    io.emit(
      "prompt-join",
      `${message.username} joined room ${message.roomName}`
    );
    console.log(`${message.username} joined room ${message.roomName}`);
  });
});

/* --------------- */

app.get("/", function (req, res) {
  res.send("Welcome to Pomopals!");
});

// Login Route
app.post("/google-login", async (req, res) => {
  const { token } = req.body;
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub, name, email, picture } = payload;
  let newUser = await db
    .query(
      `INSERT INTO users (
      googleId, name, email, profilePicture, reaction) VALUES
      ($1, $2, $3, $4, 'READY')
      ON CONFLICT (googleId)
      DO UPDATE SET
      name = $2,
      email = $3,
      profilePicture = $4
      RETURNING *;`,
      [sub, name, email, picture]
    )
    .catch((err) => {
      console.log(err);
    });
  return res.json(newUser.rows[0].userid);
});

/* Users Route */

// Get all users
app.get("/users", async (req, res) => {
  let { rows } = await db.query(`SELECT * FROM users`).catch((err) => {
    console.log(err);
  });
  res.json(rows);
});

// Get User by userid
app.get("/users/:id", async (req, res) => {
  let { rows } = await db
    .query(`SELECT * FROM users WHERE userid=$1`, [req.params.id])
    .catch((err) => {
      console.log(err);
    });
  res.json(rows);
});

/* Rooms Route */

// Get all rooms
app.get("/rooms", async (req, res) => {
  let { rows } = await db.query(`SELECT * FROM rooms`).catch((err) => {
    console.log(err);
  });
  res.json(rows);
});

// Get room by name
app.get("/rooms/:name", async (req, res) => {
  let { rows } = await db
    .query(`SELECT * FROM rooms WHERE roomname=$1`, [req.params.name])
    .catch((err) => {
      console.log(err);
    });
  res.json(rows);
});

// Returns room if it exists
// Else, creates a new room
app.post("/rooms/:ownerid/:name", async (req, res) => {
  let { rows } = await db
    .query(`SELECT * FROM rooms WHERE roomname=$1`, [req.params.name])
    .catch((err) => {
      console.log(err);
    });
  if (rows.length !== 0) {
    res.json(rows);
  } else {
    if (req.params.ownerid != 0) {
      let { rows } = await db
        .query(
          `INSERT INTO rooms(roomOwner, roomName, state, worktime, breaktime)
        VALUES ($1, $2, 0, 25, 5) RETURNING *;`,
          [req.params.ownerid, req.params.name]
        )
        .catch((err) => {
          res.status(400).send("Error! Check if room name is unique.");
        });
      res.json(rows);
    } else {
      const { rows } = await db
        .query(
          `INSERT INTO rooms(roomName, state, worktime, breaktime)
        VALUES ($1, 0, 25, 5) RETURNING *;`,
          [req.params.name]
        )
        .catch((err) => {
          res.status(400).send("Error! Check if room name is unique.");
        });
      res.json(rows);
    }
  }
});

// Update room settings
app.put("/rooms/:name", async (req, res) => {
  let { worktime, breaktime } = req.body;
  let password = req.body.password ? req.body.password : null;
  let theme = req.body.theme ? req.body.theme : null;
  const { rows } = await db
    .query(
      `UPDATE rooms
       SET worktime=$1, breaktime=$2, password=$3, theme=$4
       WHERE roomname=$5
       RETURNING *`,
      [worktime, breaktime, password, theme, req.params.name]
    )
    .catch((err) => {
      res.status(400).send(err);
    });
  res.json(rows);
});

httpServer.listen(port, () => {
  console.log(`pomopals backend is running on port ${port}...`);
});
