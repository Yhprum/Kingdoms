class Room {
    constructor(roomName, size) {
        this.roomName = roomName;
        this.players = [];
        this.size = size;
        this.inProgress = false;
        this.gameNumber = gameNumber++;
        this.deck = [];
        this.specials = [];
    }

    join(username) {
        if (this.players.length >= this.size) throw new Error(`Room ${roomName} is full`);
        this.players.push(username);
    }

    leave(username) {
        this.players.splice(this.players.indexOf(username), 1);
        if (this.players.length === 0) deleteRoom(this.roomName);
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