let Deck = require("./deck");

let GameState = {
    "OPEN": 1,
    "CLOSED": 2,
    "DISCARD": 3
};

class Room {
    constructor(roomName, size) {
        this.roomName = roomName;
        this.players = [];
        this.size = size;
        this.inProgress = false;
        this.gameNumber = gameNumber++;
        this.deck = undefined;
        this.specialDeck = undefined;
        this.hands = {};
        this.specials = {};
        this.status = {};
        this.counter = new Set();
    }

    join(username) {
        if (this.players.length >= this.size) throw new Error(`Room ${this.roomName} is full`);
        this.players.push(username);
    }

    leave(username) {
        if (this.players.indexOf(username) !== -1){
            this.players.splice(this.players.indexOf(username), 1);
            if (this.players.length === 0) deleteRoom(this.roomName);
        }
    }

    startGame() {
        let double = this.players.length > 2;
        this.deck = new Deck("numbers", double);
        this.specialDeck = new Deck("specials", false);
        this.deck.shuffle();
        this.specialDeck.shuffle();
        for (let i = this.players.length - 1; i >= 0; i--) {
            this.hands[this.players[i]] = this.deck.deal(5);
            this.status[this.players[i]] = {
                "hp": 10,
                "flipped": false,
                "damaged": false,
                "alive": true
            };
            this.specials[this.players[i]] = [];
        }
        this.size = this.players.length;
        this.state = GameState.OPEN;
        this.attack = {};
    }

    endTurn() {
        for (let i = this.players.length - 1; i >= 0; i--) {
            this.status[this.players[i]].damaged = false;
        }
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
        if (num === "JS") num = 10;
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

    buy(username) {
        this.specials[username].push(this.specialDeck.draw());
    }

    useQueen(username, card) {
        let user = this.status[username];
        if (user.hp !== 10) user.hp = 10;
        else (user.flipped = false);
        this.specials[username].splice(this.specials[username].indexOf(card), 1);
    }

    fullHeal(username) {
        let user = this.status[username];
        user.hp = 10;
        user.flipped = false;
        this.specials[username].splice(this.specials[username].indexOf("JH"), 1);
    }

    jackOfClubs(source, target) {
        this.specials[target] = this.specials[target].filter(item => item.indexOf("Q") === -1);
        this.specials[source].splice(this.specials[source].indexOf("JC"), 1);
    }

    jackOfSpades(source, target) {
        this.createAttack(source, target, "JS");
        this.specials[source].splice(this.specials[source].indexOf("JS"), 1);
    }

    jackOfDiamonds(source) {

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
            let cur = this.players[i++ % this.size];
            if (this.hands[cur].length < 5) {
                let card = this.deck.draw();
                if (!card) break;
                this.hands[cur].push(card);
            }
            if (i === 20) break; // TODO: write a better exit case lol
        }
        this.state = GameState.OPEN;
    }

    getRoomInfo(username) {
        let specials = {};
        for (let player of this.players) {
            if (player === username) specials[player] = this.specials[player];
            else specials[player] = Array(this.specials[player].length).fill("Back");
        }

        return {
            "players": this.players,
            "size": this.size,
            "hand": this.hands[username],
            "specials": specials,
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