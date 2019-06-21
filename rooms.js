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
        this.counter = 0;
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
                "hp": 7,
                "flipped": false,
                "damaged": false,
                "alive": true
            };
        }
        this.size = this.players.length;
        this.state = GameState.OPEN;
        this.attack = {};
    }

    endTurn() {
        this.state = GameState.DISCARD;
    }

    createAttack(source, target, power) {
        this.state = GameState.CLOSED;
        this.attack = {
            "source": source,
            "target": target,
            "power": power
        }
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
        this.state = GameState.OPEN;
    }

    heal(username, num) {
        let user = this.status[username];
        user.hp += num;
        if (user.hp > 10) user.hp = 10;
    }

    useQueen(username) {
        let user = this.status[username];
        if (user.hp !== 10) user.hp = 10;
        else (user.flipped = false);
    }

    fullHeal(username) {
        let user = this.status[username];
        user.hp = 10;
        user.flipped = false;
    }

    jackOfClubs(target) {
        // Delete all queens from target's pile
    }

    discard(username, cards) {
        let hand = this.hands[username];
        for (let card of cards) {
            hand.splice(hand.indexOf(card), 1);
            this.deck.discard(card);
        }
    }

    dealCards() {
        let i = 1;
        while (true) {
            if (this.deck.size() === 0) return;
            let cur = this.players[i++ % this.size];
            if (this.hands[cur].length < 5)
                this.hands[cur].push(this.deck.draw())
            if (i === 20) return; // TODO: write a better exit case lol
        }
    }

    getRoomInfo(username) {
        return {
            "players": this.players,
            "size": this.size,
            "hand": this.hands[username],
            "state": this.state,
            "status": this.status,
            "attack": this.attack
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