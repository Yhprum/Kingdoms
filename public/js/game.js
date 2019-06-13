$(document).ready(function() {
    var name;
    var roomname = "";
    var socket;
    var chatroom = "Lobby";
    var $login = $("#login");
    var $usernameInput = $("#username");

    var $chatForm = $("#chatForm");

    var hash = window.location.hash;
    hash && $('#tabList a[href="' + hash + '"]').tab('show');

    var unread = {"Lobby": 0, "Suggestions": 0};

    $("#chatrooms>a").click(function (e) {
        e.preventDefault();
        chatroom = this.name;
        $(this).siblings('a.active').removeClass("active");
        $(this).tab('show');
        document.getElementById("chatroomName").innerText = chatroom;
    });

    $chatForm.on('submit', function() {return false});

    $("#loginDropdown").on('shown.bs.dropdown', function() {
        $usernameInput.focus();
    });
    $login.on('click', function() {
        verify();
    });
    $usernameInput.on('keyup', function (e) {
        if (e.keyCode === 13) {
            verify();
            $("#headerButton").dropdown("toggle");
        }
    });

    function verify() { // TODO: make sure names can only be letters/numbers (or create escaping method which I don't wanna do)
        name = $usernameInput.val().trim(); // or change all the places where I used the name as an id
        if (name && name.match(/[\w]+/)[0] === name) { // change to server-side?
            login();
        } else {
            // display error
            alert("Names currently can only consist of letters, numbers, and _");
        }
    }

    function login() {
        socket = io();
        socket.emit('login', name);
        let dropdownItems = '<a class="dropdown-item" href="#">Profile</a>';
        dropdownItems += '<a class="dropdown-item" href="#">Placeholder</a>';
        dropdownItems += '<a class="dropdown-item" href="#">Placeholder</a>';
        document.getElementById("headerButton").innerHTML = name;
        document.getElementById("headerButton").classList = "dropdown-toggle";
        document.getElementById("headerDropdown").innerHTML = dropdownItems;
        document.getElementById("chatroomInput").disabled = false;
        document.getElementById("chatroomInput").placeholder = "Chat to " + chatroom;

        $("#chatrooms>a").click(function (e) {
            e.preventDefault();
            chatroom = this.name;
            $(this).siblings('a.active').removeClass("active");
            $(this).tab('show');
            document.getElementById("chatroomName").innerText = chatroom;
            document.getElementById("chatroomInput").placeholder = "Chat to " + chatroom;
            document.getElementById("badge" + chatroom).innerText = "0";
            unread[[chatroom]] = 0;
        });

        $("#create").click(function () {
            if (roomname === "")
                $('#createRoomModal').modal("show");
        });

        $("#createRoom").click(function () {
            if (roomname === "") {
                let rn = document.getElementById("roomName").value;
                let rSize = document.getElementById("numPlayers").value;
                socket.emit('create room', name, rn, rSize, function (callback) {
                    if (callback) {
                        roomname = rn;
                    } else {
                        alert("Error: room name already exists");
                    }
                });
            }
        });

        socket.on('users', function(usernames) { // update user list
            $("#online").empty();
            for (var username in usernames) {
                if (usernames.hasOwnProperty(username)) {
                    if (username != name) {
                        $("#online").append("<li class='list-group-item'>" + username + "</li>");
                    } else {
                        //$("#online").append("<li class='list-group-item'>" + username + "</li>")
                    }
                }
            }
        });

        socket.on('rooms', function(rooms) { // update room list
            $("#challenges").empty();
            for (var room in rooms) {
                if (rooms.hasOwnProperty(room) && !rooms[room]["inProgress"]) {
                    let item = document.createElement("li");
                    item.classList.add("list-group-item");
                    item.innerText = room + " (" + rooms[room]["players"].length + "/" + rooms[room]["size"] + ")";
                    let join = document.createElement("button");

                    join.classList.add("pos-right");
                    join.id = "room" + room;
                    if (room !== roomname) {
                        join.innerText = "Join Room";
                        if (roomname !== "") {
                            join.setAttribute("disabled", "");
                        }
                    } else {
                        join.innerText = "Leave Room";
                    }
                    item.appendChild(join);
                    if (rooms[room]["players"][0] === name) {
                        let start = document.createElement("button");
                        // start.classList.add("pos-right");
                        start.id = "start" + room;
                        start.innerText = "Start Game";
                        start.onclick = (e) => {
                            e.target.remove();
                            socket.emit('start', roomname);
                        };
                        item.appendChild(start);
                    }

                    document.getElementById("challenges").appendChild(item);
                    $("#room" + room).on('click', function() {
                        let rn = this.id.substring(4, this.id.length);
                        if (roomname === "") {
                            socket.emit('join room', name, rn, function (callback) {
                                if (callback) roomname = rn;
                            });
                        } else  if (roomname === rn) {
                            socket.emit('leave room', name, rn);
                            roomname = "";
                        }
                    });
                }
            }
        });

        socket.on('start game', function(gameNumber) {
            var gameTab = document.createElement("li");
            gameTab.classList = "nav-item";
            gameTab.innerHTML = "<a class='nav-link' data-toggle='tab' href='#game-" + gameNumber + "'>Game<span class='close-game'>&times;</span></a>"
            document.getElementById("tabList").appendChild(gameTab);

            var gameHTML = document.createElement("div");
            gameHTML.id = "game-" + gameNumber;
            gameHTML.classList = "tab-pane fade";
            document.getElementById("tabContent").appendChild(gameHTML);

            $("#game-" + gameNumber).load("game.html", function() {
                $('#tabList a[href="#game-' + gameNumber + '"]').tab('show');
                // Instantiate game screen vars

                document.getElementById("chatName").innerText = name;


                $("#chatInput").on('keyup', function (e) {
                    if (e.keyCode === 13) {
                        let msg = $("#chatInput").val().trim();
                        if (msg) {
                            socket.emit('chat message', msg, name, roomname);
                        }
                        $("#chatInput").val("");
                    }
                });

                $(".close-game").on("click", function() { // close the game tab
                    var tabContentId = $(this).parent().attr("href");
                    $(this).parent().parent().remove();
                    $(tabContentId).remove();
                    $('#tabList a[href="#home"]').tab('show');
                    socket.emit('leave room', name, roomname);
                    roomname = "";
                });
            });
        });

        socket.on('update', function(history, turn) {
            let row = document.createElement("tr");
            row.classList = "turn-row";
            let text = document.createElement("td");
            text.innerHTML = '<b class="turn">Turn ' + turn + '</b>';
            row.appendChild(text);
            $("#history")[0].appendChild(row); // TODO: Scroll history to bottom

            document.getElementById("turnNumber").innerText = "Turn " + (turn + 1);

            row = document.createElement("tr");
            text = document.createElement("td");
            text.innerHTML = history;
            row.appendChild(text);

            $("#history")[0].appendChild(row);
        });

        socket.on('chat message', function(msg) {
            let row = document.createElement("tr");
            let text = document.createElement("td");
            text.innerHTML = msg;
            row.appendChild(text);
            document.getElementById("history").appendChild(row);
        });

        $chatForm.on('submit', function() {
            let msg = document.getElementById("chatroomInput").value.trim();
            if (msg) {
                socket.emit('chatroom message', name, msg, chatroom);
                $chatForm[0].reset();
                return false;
            }
        });

        socket.on('chatroom message', function(msg, room) { // TODO: highlight user-sent messages/@usernames?
            var dt = new Date().toLocaleTimeString();
            dt = dt.substring(0, dt.length - 6);
            msg = "<small class='timestamp'>" + dt + " </small>" + msg; // TODO: user preferences for timestamps
            $("#messages" + room).append($("<li>").html(msg));
            if (room != chatroom) {
                document.getElementById("badge" + room).innerText = ++unread[[room]];
            }
            $("#scrollChat").stop().animate({
                scrollTop: $("#scrollChat")[0].scrollHeight
            });
        });

        socket.on('game end', function(str) {
            let row = document.createElement("tr");
            let text = document.createElement("td");
            text.innerHTML = str;
            row.appendChild(text);
            document.getElementById("history").appendChild(row);
        });
    }
});
