let Deck = require("./deck");

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
        }
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