let Deck = require("./deck");

let GameState = {
    "OPEN": 1,
    "CLOSED": 2,
    "DISCARD": 3,
    "DRAW": 4
};

class Room {
    constructor(roomName, size) {
        this.roomName = roomName;
        this.players = [];
        this.size = size;
        this.inProgress = false;
        this.gameNumber = gameNumber++;
        this.deck = undefined;
        this.specials = undefined;
        this.hands = {};
        this.status = {};
    }

    join(username) {
        if (this.players.length >= this.size) throw new Error(`Room ${this.roomName} is full`);
        this.players.push(username);
    }

    leave(username) {
        this.players.splice(this.players.indexOf(username), 1);
        if (this.players.length === 0) deleteRoom(this.roomName);
    }

    startGame() {
        this.deck = new Deck("numbers");
        this.specials = new Deck("specials");
        this.deck.shuffle();
        this.specials.shuffle();
        for (let i = this.players.length - 1; i >= 0; i--) {
            this.hands[this.players[i]] = this.deck.deal(5);
            this.status[this.players[i]] = {
                "hp": 10,
                "flipped": false,
                "damaged": false,
                "alive": true
            };
        }
        this.state = GameState.OPEN;
    }

    endTurn() {
        this.state = GameState.DISCARD;
    }

    takeDamage(username, num) {
        let user = this.status[username];
        user.hp -= num;
        if (user.hp <= 0) {
            if (!user.flipped) {
                user.flipped = true;
                user.hp = 10;
            } else {
                user.alive = false;
            }
        }
        user.damaged = true;
    }

    heal(username, num) {
        let user = this.status[username];
        user.hp += num;
        if (user.hp > 10) user.hp = 10;
    }

    getRoomInfo(username) {
        return {
            "players": this.players,
            "size": this.size,
            "hand": this.hands[username],
            "state": this.state,
            "status": this.status
        };
    }
}

function getRoom(roomName) {
    if (roomName && roomName.id) return roomName;
    return rooms.get(roomName);
}

function createRoom(roomName, size) {
    if (rooms.has(roomName)) throw new Error(`Room ${roomName} already exists`);
    const room = new Room(roomName, size);
    rooms.set(roomName, room);
    return room;
}

function deleteRoom(roomName) {
    if (!rooms.has(roomName)) throw new Error(`Room ${roomName} does not exist`);
    rooms.delete(roomName);
}

let gameNumber = 0;
let rooms = new Map();

let Rooms = Object.assign(getRoom, {
    rooms: rooms,
    get: getRoom,
    createRoom: createRoom,
    deleteRoom: deleteRoom
});

module.exports = Rooms;