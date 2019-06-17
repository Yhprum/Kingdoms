class User {
    constructor(name) {
        this.username = name;
        this.room = "";
    }
}

function add(user) {
    if (users.has(user.username)) throw new Error(`Name is taken: ${user.username}`);
    users.set(user.username, user);
}

function deleteUser(username) {
    users.delete(username);
}

function getUser(user) {
    if (!user || user === '!') return null;
    if (user.username) return user;
    return users.get(user) || null;
}

let users = new Map();

let Users = Object.assign(getUser, {
    add: add,
    delete: deleteUser,
    users: users,
    get: getUser
});

module.exports.Users = Users;
module.exports.User = User;