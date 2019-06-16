var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");
var Deck = require("./deck.js");

var User = require("./users.js").User;
var Users = require("./users.js").Users;
var Rooms = require("./rooms.js");

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function(socket) {

    socket.on('login', function(username, callback) {
        socket.username = username;
        try {
            Users.add(new User(username));
            callback(true);
        } catch (e) {
            // Username taken
            callback(false);
        }
        console.log(username + ' has connected');
        io.emit('users', Array.from(Users.users.keys()));
        io.emit('rooms', mapToObject(Rooms.rooms));
    });

    socket.on('chatroom message', function(name, msg, room) { // TODO: sanitize for HTML input, add a roomname param and only send to that room
        msg = msg.trim();
        if (msg.startsWith('/')) { // include ! command to broadcast?
            handleChatCommand(name, msg, room);
        } else {
            msg = "<b>" + name + ":</b> " + msg;
            io.emit('chatroom message', msg, room);
        }
    });

    function handleChatCommand(name, msg, room) {
        if (msg.startsWith("/help")) {
            handleHelp(name, msg, room);
        } else if (msg.startsWith("/ban")) {
            // TODO: check for mod privileges
            handleBan(name, msg, room);
        } else if (msg.startsWith("/barno")) {
            handleBarno(name, room);
        } else if (msg.startsWith("/test")) {
            //more checks
        } else {
            let r = "<i>Unknown command. Type /help for a list of commands</i>"
            io.to(usernames[[name]]).emit('chatroom message', r, room);
        }
    }

    function handleHelp(name, msg, room) {
        let r, args = msg.split(" ");
        if (args.length == 1) {
            r = "<i>available commands: /help /barno</i><br><span>type /help [command name] for help on a specific command</span>";
        } else if (args.length == 2) {
            if (args[1] == "help") {
                r = "&#3232;_&#3232;"
            } else if (args[1] == "ban") {
                r = "Syntax: /ban [username] [time in seconds]<br> If no time is stated, the user will be banned for 5 minutes";
            } else if (args[1] == "barno") {
                r = "barno";
            }
        } else {
            r = "<i>Invalid syntax. Correct syntax is /help [command name]</i>"
        }
        io.to(usernames[[name]]).emit('chatroom message', r, room);
    }

    function handleBan(name, msg, room) {
        let r, time, args = msg.split(" ");
        if (args.length == 2 || args.length == 3) {
            time = ~~args[2] || 3000;
            r = args[1] + " has been banned for " + time + " seconds";
            ban(name);
            setTimeout(function() { unban(name) }, time);
        } else {
            r = "<i>Invalid syntax. Correct syntax is /ban [username] [time in seconds] or /ban [username]</i>"
        }
        io.to(usernames[[name]]).emit('chatroom message', r, room);
    }

    function ban(name) {
        // TODO: ban them (check name validity, check banee usertype, check if they're already banned, delete chat messages)
    }

    function unban(name) {
        // TODO: make it so they can chat again
    }

    function handleBarno(name, room) {
        let r = "Barno";
        for (let i = 0; i < 100; i++) r += " Barno";
        io.to(usernames[[name]]).emit('chatroom message', r, room);
    }

    socket.on('create room', function (username, roomName, size, callback) {
        try {
            Rooms.createRoom(roomName, size);
            Rooms(roomName).join(username);
            socket.join(roomName);
            callback(true);
            io.emit('rooms', mapToObject(Rooms.rooms));
            console.log(username + " created room " + roomName);
        } catch (e) {
            // Room exists
            callback(false);
        }
    });

    socket.on('join room', function(username, roomName, callback) {
        console.log("join");
        try {
            Rooms(roomName).join(username);
            socket.join(roomName);
            callback(true);
            io.emit('rooms', mapToObject(Rooms.rooms));
            console.log(username + " joined room " + roomName);
        } catch (e) {
            // Room full
            callback(false);
        }
    });

    socket.on('leave room', function(username, roomName) {
        console.log("leave");
        socket.leave(roomName);
        Rooms(roomName).leave(username);
        io.emit('users', Array.from(Users.users.keys()));
        io.emit('rooms', mapToObject(Rooms.rooms));
    });

    socket.on('start', function (roomName) {
        Rooms(roomName).deck = new Deck("numbers"); // TODO:make these hidden from client
        Rooms(roomName).specials = new Deck("specials");
        io.emit('rooms', mapToObject(Rooms.rooms));
        io.to(roomName).emit('start game', Rooms(roomName).gameNumber);
    });

    socket.on('chat message', function (msg, name, roomname) { // TODO: Sanitize for HTML, filter language
        msg = name + ": " + msg;
        io.to(roomname).emit('chat message', msg);
    });

    socket.on('game end', function(roomname, winner) {
        let str = winner + " is the winner!";
        io.to(roomname).emit('game end', str);
        io.emit('users', Array.from(Users.users.keys()));
        io.emit('rooms', mapToObject(Rooms.rooms));
    });

    socket.on('disconnect', function(){
        console.log(socket.username + ' has disconnected');
        io.emit('users', Array.from(Users.users.keys()));
        io.emit('rooms', mapToObject(Rooms.rooms));
    });

    function mapToObject(map) {
        return Object.assign({}, ...[...map.entries()].map(([k, v]) => ({[k]: v})))
    }
});

http.listen(process.env.PORT || 3000, function() {
    console.log('listening on *:3000');
});
