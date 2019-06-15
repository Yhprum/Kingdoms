module.exports = class Deck {
    constructor() {
        this.deck = [];
    }
    generate() {
        let deck = this.deck;
        let values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J',  'Q', 'K'];
        let suits = ['C', 'D', 'H', 'S'];

        suits.forEach(function (suit) {
           values.forEach(function (value) {
                deck.push(value + "" + suit);
           });
        });
    }
    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
};