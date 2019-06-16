class Room {
    constructor(roomName, size) {
        this.roomName = roomName;
        this.players = [];
        this.size = size;
        this.inProgress = false;
    }
}

function getRoom(roomName) {
    if (roomName && roomName.id) return roomName;
    return Rooms.rooms.get(roomName);
}

function createRoom(roomName, size) {
    if (Rooms.rooms.has(roomName)) throw new Error(`Room ${roomName} already exists`);
    const room = new Room(roomName, size);
    Rooms.rooms.set(roomName, room);
    return room;
}

function joinRoom(roomName, username) {
    if (Rooms(roomName).players.length >= Rooms(roomName).size) throw new Error(`Room ${roomName} is full`);
    Rooms(roomName).players.push(username);
}
function leaveRoom(roomName, username) {

}

let gameNumber = 0;
let rooms = new Map();

let Rooms = Object.assign(getRoom, {
    rooms: rooms,
    get: getRoom,
    createRoom: createRoom,
    joinRoom: joinRoom
});

module.exports = Rooms;