module.exports = class Deck {
    constructor(type, double) {
        let deck = [];
        let values = [];
        if (type === "numbers") {
            values = ['2', '3', '4', '5', '6', '7', '8', '9', '10'];
        } else if (type === "specials") {
            values = ['A', 'J', 'Q'];
        }
        let suits = ['C', 'D', 'H', 'S'];

        suits.forEach(function (suit) {
            values.forEach(function (value) {
                deck.push(value + "" + suit);
            });
        });
        if (double) deck.push(...deck);

        this.deck = deck;
        this.discardPile = [];
    }

    size() {
        return this.deck.length;
    }

    addKings(num) {
        let suits = ['C', 'D', 'H', 'S'];
        for (let i = num - 1; i > 0; i--) {
            this.deck.push('K' + suits[i]);
        }
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    draw() {
        if (this.deck.length === 0) {
            if (this.discardPile.length === 0) {
                return false;
            } else {
                this.deck = this.discardPile;
                this.discardPile = [];
                this.shuffle();
            }
        }
        return this.deck.pop();
    }

    deal(num) {
        let cards = [];
        for (let i = num - 1; i >= 0; i--) {
            cards.push(this.draw());
        }
        return cards;
    }

    discard(card) {
        this.discardPile.push(card);
    }
};