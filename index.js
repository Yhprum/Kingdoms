var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require("path");

var User = require("./users.js").User;
var Users = require("./users.js").Users;
var Rooms = require("./rooms.js");

let ids = {};

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
            ids[username] = socket.id;
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
            io.to(ids[name]).emit('chatroom message', r, room);
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
        io.to(ids[name]).emit('chatroom message', r, room);
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
        try {
            Rooms(roomName).join(username);
            socket.join(roomName);
            callback(true);
            io.emit('rooms', mapToObject(Rooms.rooms));
            console.log(username + " joined room " + roomName);
            socket.room = roomName;
        } catch (e) {
            // Room full
            callback(false);
        }
    });

    socket.on('leave room', function(username, roomName) {
        socket.leave(roomName);
        Rooms(roomName).leave(username);
        io.emit('users', Array.from(Users.users.keys()));
        io.emit('rooms', mapToObject(Rooms.rooms));
    });

    socket.on('start', function (roomName) {
        Rooms(roomName).startGame();
        io.emit('rooms', mapToObject(Rooms.rooms));
        for (let user of Rooms(roomName).players) {
            io.to(ids[user]).emit('start game', Rooms(roomName).gameNumber, Rooms(roomName).getRoomInfo(user));
        }
    });

    socket.on('buy', function (username, roomName, cards) {
        let room = Rooms(roomName);
        if (!cards.every(function (card) { return room.hands[username].includes(card) }) || getStrength(cards) < 10) return;
        room.buy(username);
        room.discard(username, cards);

        let msg = "<b>" + username + "</b> has bought a special card";
        updateState(roomName, msg, false);
    });
    
    socket.on('use cards', function (roomName, source, target, cards) {
        let room = Rooms(roomName);
        if (!cards.every(function (card) { return room.hands[source].includes(card) })) return; // Trying to cheat lol

        let strength = getStrength(cards);
        if (type(cards[0]) === "attack" && room.state === 1 && !room.status[target].damaged) {
            room.createAttack(source, target, strength);
            room.discard(source, cards);

            let msg = "<b>" + source + "</b> targets <b>" + target + "</b> with an attack of " + strength;
            updateState(roomName, msg);
        } else if (type(cards[0]) === "heal") {
            room.heal(target, strength);
            room.discard(source, cards);

            if (target === source) target = "self";
            let msg = "<b>" + source + "</b> heals <b>" + target + "</b> by " + strength + "hp";
            updateState(roomName, msg, false);
        }
    });

    socket.on('use special', function (roomName, source, target, cards) {
        let room = Rooms(roomName);
        let card = cards[0];
        if (!room.specials[source].includes(card)) return; // Trying to cheat lol

        if (card.indexOf("Q") !== -1) {
            room.useQueen(target, card);
        } else if (card.indexOf("A") !== -1) {
            // Ace
        } else if (card === "JS") {
            if (room.status[target].damaged) return;
            room.jackOfSpades(source, target);
        } else if (card === "JH") {
            room.fullHeal(target);
        } else if (card === "JD") {
            // Jack of Diamonds
        } else if (card === "JC") {
            room.jackOfClubs(source, target);
        } else {
            // King/Joker
        }

        if (target === source) target = "self";
        let msg = "<b>" + source + "</b> uses " + card + "  on <b>" + target + "</b>";
        updateState(roomName, msg, false);
    });

    socket.on('update attack', function (roomName, username, cards) {
        let room = Rooms(roomName);
        if (!cards.every(function (card) { return room.hands[username].includes(card) })) return;

        let msg;
        let strength = getStrength(cards);
        if (type(cards[0]) === "attack") {
            if (strength === room.attack.power) {
                room.state = 1;
                room.discard(username, cards);
                msg = "<b>" + username + "</b> nullifies the attack";
            } else if (strength > room.attack.power) {
                room.attack.target = room.attack.source;
                room.attack.source = username;
                room.attack.power = strength;
                room.discard(username, cards);
                msg = "<b>" + username + "</b> counters with an attack of " + strength;
            }
        } else if (type(cards[0]) === "heal") {
            if (strength >= room.attack.power) {
                msg = "<b>" + username + "</b> nullifies the attack with hearts";
                room.state = 1;
            } else {
                msg = "<b>" + username + "</b> weakens the attack by " + strength;
                room.attack.power -= strength;
            }
            room.discard(username, cards);
        }
        updateState(roomName, msg, false);
    });

    socket.on('counter JS', function (roomName, username, card) {
        let room = Rooms(roomName);
        if (!room.specials[username].includes(card)) return;

        let msg;
        if (card.indexOf("Q") !== -1) {
            room.specials[username].splice(room.specials[username].indexOf(card), 1);
            msg = "<b>" + username + "</b> nullifies the attack with a Queen";
        } else if (card === "JH") {
            room.fullHeal(username);
            msg = "<b>" + username + "</b> full heals with the Jack of Hearts";
        }
        room.state = 1;
        updateState(roomName, msg, false);
    });

    socket.on('take damage', function (username, roomName) { // TODO: get username from socket instead?
        let room = Rooms(roomName);
        if (room.attack.target === username) {
            room.takeDamage(username, room.attack.power);
            let msg = "<b>" + username + "</b> takes " + room.attack.power + " damage";
            updateState(roomName, msg, false);
        }
    });

    socket.on("end turn", function (username, roomName) {
       let room = Rooms(roomName);
       room.counter.add(username);
       if (room.counter.size === room.size) {
           room.counter.clear();
           room.endTurn();
           updateState(roomName, "discarding...", false);
       }
    });

    socket.on('discard', function (username, roomName, cards) {
        let room = Rooms(roomName);
        room.discard(username, cards);
        room.counter.add(username);
        if (room.counter.size === room.size) {
            room.counter.clear();
            room.dealCards();
            for (let user of room.players) {
                io.to(ids[user]).emit('update turn', room.hands[user]);
            }
            let msg = "<b>Turn " + ++room.turn + "</b>";
            updateState(roomName, msg, true);
        }
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

    socket.on('disconnect', function() {
        console.log(socket.username + ' has disconnected');
        Users.delete(socket.username);
        delete ids[socket.username];
        // Rooms(socket.room).leave(socket.username);
        io.emit('users', Array.from(Users.users.keys()));
        io.emit('rooms', mapToObject(Rooms.rooms));
    });

    function mapToObject(map) {
        return Object.assign({}, ...[...map.entries()].map(([k, v]) => ({[k]: v})))
    }

    function updateState(roomName, msg, isTurn) {
        for (let user of Rooms(roomName).players) {
            io.to(ids[user]).emit('update state', Rooms(roomName).getRoomInfo(user), msg, isTurn);
        }
    }

    function getStrength(cards) {
        let strength = 0;
        for (let card of cards) strength += parseInt(card.substring(0, card.length - 1));
        return strength;
    }

    function type(card) {
        if (card.indexOf("H") !== -1) return "heal";
        else if (card.indexOf("D") !== -1) return "buy";
        else return "attack";
    }
});

http.listen(process.env.PORT || 3000, function() {
    console.log('listening on *:3000');
});
