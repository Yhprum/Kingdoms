$(document).ready(function() {
    var name, opponent;
    var roomname;
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
        dropdownItems += '<a class="dropdown-item" href="#">Placeholder</a>'
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

        socket.on('users', function(usernames) { // update user list
            $("#online").empty();
            for (var username in usernames) {
                if (usernames.hasOwnProperty(username)) {
                    if (username != name) {
                        $("#online").append("<li class='list-group-item'>" + username + "<button id='chal" + username + "' class='pos-right'>Request</button></li>");
                        $("#chal" + username).on('click', function() {
                            opponent = this.id.substring(4, this.id.length);
                            socket.emit('challenge', opponent, name);
                            $("#chal" + opponent).hide();
                            $("#challenges").append("<li class='list-group-item'>To: " + opponent + "<button id=cancel" + opponent + " class='pos-right'>Cancel</button></li>");
                            $("#cancel" + opponent).on('click', function() {
                                this.parentNode.remove();
                                $("#chal" + opponent).show();
                                socket.emit('cancel', opponent, name);
                            });
                        });
                    } else {
                        //$("#online").append("<li class='list-group-item'>" + username + "</li>")
                    }
                }
            }
        });

        socket.on('battles', function(rooms) { // update ongoing battles list
            $("#battles").empty();
            for (var room in rooms) {
                if (rooms.hasOwnProperty(room)) {
                    var battleTitle = rooms[[room]].players[0] + " vs. " + rooms[[room]].players[1];
                    $("#battles").append("<li class='list-group-item'>" + battleTitle + "<button id='batl" + room + "' class='pos-right'>Spectate</button></li>");
                    $("#batl" + room).on('click', function() {
                        alert("Currently not supported");
                    });
                }
            }
        });

        socket.on('challenge', function(opponentName) {
            $("#challenges").append("<li class='list-group-item'>" + opponentName + "<button id=ac" + opponentName + " class='pos-right'>Accept</button></li>");
            $("#ac" + opponentName).on('click', function() {
                this.parentNode.remove();
                roomname = this.id.substring(2, this.id.length);
                opponent = opponentName;
                socket.emit('accept', roomname, name, opponent);
                socket.emit('join room', roomname);
            });
        });

        socket.on('cancelled challenge', function(opponentName) {
            document.getElementById("ac" + opponentName).parentElement.remove();
        });

        socket.on('accepted challenge', function(opponentName) {
            opponent = opponentName;
            document.getElementById("cancel" + opponent).parentElement.remove()
            socket.emit('join room', name);
            roomname = name;
        });

        socket.on('start game', function(gameNumber) {
            var gameTab = document.createElement("li");
            gameTab.classList = "nav-item";
            gameTab.innerHTML = "<a class='nav-link' data-toggle='tab' href='#game-" + gameNumber + "'>vs. " + opponent + "<span class='close'>&times;</span></a>"
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

                $(".close").on("click", function() { // close the game tab
                    var tabContentId = $(this).parent().attr("href");
                    $(this).parent().parent().remove();
                    $(tabContentId).remove();
                    $('#tabList a[href="#home"]').tab('show');
                    socket.emit('leave room', roomname);
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
