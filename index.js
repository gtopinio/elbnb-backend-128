const throng = require('throng');
const express = require("express");
const mysql = require("mysql");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const upload = multer();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const WORKERS = process.env.WEB_CONCURRENCY || 1
const PORT = process.env.PORT || 3001;
require('./models/user');
require('./models/accommodation');
require('./models/room');
const app = express();
const appLink = "https://mockup-backend-128.herokuapp.com"



// Create a connection pool to the database
const pool = mysql.createPool({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.AWS_PASS,
  database: process.env.AWS_DB_NAME,
  port: process.env.AWS_PORT
});

pool.getConnection((err, connection) => {
  if (err) {
    console.log("Error connecting to database:", err);
  } else {
    console.log("Connected to database!");
    connection.release();
  }
});

// Pass the database connection pool to your routes module
require("./routes")(app, pool);

throng({
  workers: WORKERS,
  lifetime: Infinity
}, start)


function start() {

  
  

  
  // The two lines below is to ensure that the server has parser to read the body of incoming requests
  app.use(express.urlencoded({extended: true}));
  app.use(express.json());
  app.use(cookieParser());
  
  // for parsing multipart/form-data
  app.use(upload.fields([{ name: 'accommodationName', maxCount: 1 }, { name: 'data', maxCount: 1 }, { name: 'username', maxCount: 1 }, { name: 'data', maxCount: 1 }]));
  
  // allow CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Access-Control-Allow-Methods, Origin, Accept, Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    next();
  });
  

  
  // ========================== CRON JOB for RESTARTING THE SERVER ==========================
  
  const cron = require('node-cron');
  const HEROKU_APP_ID = process.env.HEROKU_APP_ID;
  const HEROKU_API_TOKEN = process.env.HEROKU_API_TOKEN;
  
  // Restart dynos every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
      try {
          console.log("Restarting dynos every 5 minutes...");
          const fetch = await import('node-fetch').then((module) => module.default);
          const response = await fetch(`https://api.heroku.com/apps/${HEROKU_APP_ID}/dynos`, {
              method: 'DELETE',
              headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/vnd.heroku+json; version=3',
                  'Authorization': `Bearer ${HEROKU_API_TOKEN}`
              }
          });
          console.log("Response status:", response.status);
          console.log("Response body:", await response.text());
      } catch (error) {
          console.log("Error:", error);
      }
  });
  
  // ========================== END OF CRON JOB for RESTARTING THE SERVER ==========================
  
  // ================ START OF MESSAGING FEATURE ================
  // Chat functionalities
  const harperSaveMessage = require('./services/harper-save-message'); // For saving messages
  const harperGetMessages = require('./services/harper-get-messages'); // For getting messages
  const leaveRoom = require('./utils/leave-room'); // For leaving room
  
  const server = http.createServer(app); // Create server for socket.io
  
  // Create an io server and allow for CORS from https://elbnb.netlify.app with GET and POST methods
  const io = new Server(server, {
    cors: {
      origin: 'https://chat-remote-client.herokuapp.com',
      methods: ['GET', 'POST'],
    },
  });
  
  // Listen for when the client connects via socket.io-client
  const CHAT_BOT = 'ChatBot';
  let chatRoom = ''; // E.g. student1 and owner1 room,...
  let allUsers = []; // All users in current chat room
  
  io.on('connection', (socket) => {
    console.log(`User connected ${socket.id}`);
  
    // Socket Event Listeners
    
    // Add a user to a room
    socket.on('join_room', (data) => {
        const { username, room } = data; // Data sent from client when join_room event emitted
        socket.join(room); // Join the user to a socket room
        console.log(`User ${username} joined room ${room}`);
  
      // Get last 100 messages sent in the chat room
      // harperGetMessages(room)
      // .then((last100Messages) => {
      //   // console.log('latest messages', last100Messages);
      //   socket.emit('last_100_messages', last100Messages);
      // })
      // .catch((err) => console.log(err));
  
        let __createdtime__ = Date.now(); // Current timestamp
  
        // Send message to all users currently in the room, apart from the user that just joined
        socket.to(room).emit('receive_message', {
          message: `${username} has joined the chat room`,
          username: CHAT_BOT,
          __createdtime__,
        });
  
        // Send welcome msg to user that just joined chat only
        socket.emit('receive_message', {
          message: `Welcome ${username}`,
          username: CHAT_BOT,
          __createdtime__,
        });
  
  
        // Save the new user to the room
        chatRoom = room;
        allUsers.push({ id: socket.id, username, room });
        chatRoomUsers = allUsers.filter((user) => user.room === room);
        socket.to(room).emit('chatroom_users', chatRoomUsers);
        socket.emit('chatroom_users', chatRoomUsers);
    });
  
    // Send message to all users in room
    socket.on('send_message', (data) => {
    const { message, username, room, __createdtime__ } = data;
    io.in(room).emit('receive_message', data); // Send to all users in room, including sender
    // harperSaveMessage(message, username, room, __createdtime__) // Save message in db
    //   .then((response) => console.log(response))
    //   .catch((err) => console.log(err));
  });
  
  // Remove user from room
    socket.on('leave_room', (data) => {
      const { username, room } = data;
      socket.leave(room);
      const __createdtime__ = Date.now();
      // Remove user from memory
      allUsers = leaveRoom(socket.id, allUsers);
      socket.to(room).emit('chatroom_users', allUsers);
      socket.to(room).emit('receive_message', {
        username: CHAT_BOT,
        message: `${username} has left the chat`,
        __createdtime__,
      });
      console.log(`${username} has left the chat`);
    });
  
  // Remove user from room when they disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected from the chat');
      const user = allUsers.find((user) => user.id == socket.id);
      if (user?.username) {
        allUsers = leaveRoom(socket.id, allUsers);
        socket.to(chatRoom).emit('chatroom_users', allUsers);
        socket.to(chatRoom).emit('receive_message', {
          message: `${user.username} has disconnected from the chat.`,
        });
      }
    });
  
  });
  
  // ================ END OF MESSAGING FEATURE ================
  
  // start server
  server.listen(PORT, (err) => {
      if(err){ console.log(err);}
      else{console.log("Server listening at port " + PORT);}
  });
  
}