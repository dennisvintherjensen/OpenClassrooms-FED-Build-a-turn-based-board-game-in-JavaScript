// Run when document is ready and avoid global scope
$((function(){

    "use strict";

    /**
     * GAME SETTING
     */
    const gameSettings = {
        sectorSize: 50,                     // Size of a sector in the game. Increase/decrease to enlarge/reduce the game board.
        gridWidth: 10,                      // Amount of sector on the x axis.
        gridHeight: 10,                     // Amount of sector on the y axis.
        gameId: 'game',                     // ID of the element in which the game should be rendered.
        moveLimit: 3,                       // Amount of sectors that a user is allowed to move per turn.
        weaponTypes: [                      // Name and damage for the four weapons available
            { name: "KBM2", damage: 15 },
            { name: "KBA3", damage: 20 },
            { name: "L11A5", damage: 25 },
            { name: "L30", damage: 30 }
        ],
        players: [                          // Player names
            {
                name: "Player One",
            },
            {
                name: "Player Two",
            }
        ]
    };

    // ##############################################################
    //
    // GAME
    //
    // ##############################################################

    /**
     * Game
     * 
     * Creates a new Game and sets up all top level actions, such as
     * - Creating DOM element
     * - Handling actions on next turn and game over
     */
    function Game(gameSettings) {

        // Store refference to game settings
        this.settings = gameSettings;

        // Refference and create some needed DOM elements
        this.out = $("#" + gameSettings.gameId);
        this.out.addClass("container-fluid");

        this.gameBoardTop = $("<div id='top' class='row'>");
        this.gameBoardBottom = $("<div id='bottom' class='row'><canvas id='gameCanvas'></div>");

        this.out.append(this.gameBoardTop);
        this.out.append(this.gameBoardBottom);

        // Create and refference a grid
        this.grid = new Grid(this);

        // Set the first player in the player array as the first to move
        this.activePlayer = 0;

        // Refference move limit for ease of access
        this.moveLimit = gameSettings.moveLimit;

        // Create Players
        this.players = gameSettings.players.map(function(player, index) {

            player["id"] = "player" + (index + 1);
            player["group"] = "players";

            return new Player(player, this);

        }, this);

        // Render
        this.renderGameBoard();
        this.render();

    }

    /**
     * Renders the Player Boards
     */
    Game.prototype.renderGameBoard = function() {

        let that = this;

        this.players
            .forEach(function(player, index) {

                let playerDiv = $("<div id='" + player.id + "Board'>");
                this.gameBoardTop.append(playerDiv);

                let playerUl = $("<ul class='list-group'></ul>");

                // Header
                playerUl.append("<li class='list-group-item list-group-item-primary list-group-header' id='" + player.id + "'><span class='player-name'>" + player.name + "</span></i><i class='fa fa-pencil fa-fw' data-player-id='" + player.id + "'></li>");

                // Attack and Weapon
                let attackButton = $("<li class='list-group-item weapon'><span class='name'>" + player.weapon.name + "</span><span class='damage'>" + player.weapon.damage + "</span></li>");
                playerUl.append(attackButton);
                
                // Defend and Shield
                let defendButton = $("<li class='list-group-item shield'><i class='fa fa-shield fa-fw'></i><span class='level'>" + player.shield + "</span></li>");
                playerUl.append(defendButton);
                
                // Health
                let healthItem = $("<li class='list-group-item health'><i class='fa fa-heart fa-fw'></i><span class='level'>" + player.health + "</span></li>");
                playerUl.append(healthItem);

                playerDiv.append(playerUl);

                // Handle attack
                attackButton.on("click", function(event) {

                    let activePlayer = that.players[that.activePlayer];

                    if (activePlayer.inBattle && activePlayer.id === player.id) {

                        that.players[that.activePlayer].whack();

                    }
                    
                });

                // Handle defend
                defendButton.on("click", function(event) {

                    let activePlayer = that.players[that.activePlayer];

                    if (activePlayer.inBattle && activePlayer.id === player.id) {

                        that.players[that.activePlayer].defend();

                    }
                    
                });

                // Revert CSS transition when player is hit (we add the class hit in the Player.setHealth function).
                healthItem.on("transitionend", function(event) {

                    $(this).removeClass("hit");

                });
                defendButton.on("transitionend", function(event) {

                    $(this).removeClass("hit");

                });

            }, this);

            // Modal used for updating player names
            $(document.body).append($("<div class='modal fade' id='playerEditModal' tabindex='-1' role='dialog'><div class='modal-dialog' role='document'><div class='modal-content'><div class='modal-header'><h4 class='modal-title' id='modalTitle'></h4><button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button></div><div class='modal-body'><label for='playerName'>New Name</label><input id='playerName' type='text'/></div><div class='modal-footer'><button type='button' class='btn btn-outline-secondary' data-dismiss='modal'>Cancel</button><button type='button' class='btn btn-outline-primary' data-update='name'>Save</button></div></div></div><div>"));

            // Open modal
            $(".list-group-header .fa-pencil").on("click", function(event) {
                
                let playerId = $(event.target).attr("data-player-id");
                let player = that.players
                    .filter(function(player) {
                        return player.id === playerId;
                    })[0];

                $("#modalTitle").attr("data-player-id", playerId);
                $("#modalTitle").text("Update name for " + player.name);
                $("#playerEditModal").modal();

            });

            // Close modal and update name
            $("button[data-update='name']").on("click", function(event) {
                
                let playerId = $("#modalTitle").attr("data-player-id");
                let player = that.players
                    .filter(function(player) {
                        return player.id === playerId;
                    })[0];

                let newName = $("#playerName").val();

                if (newName !== "") {

                    player.name = newName;
                    $("#playerName").val("");
                    $("#" + playerId + " .player-name").text(player.name);

                }

                $("#playerEditModal").modal("hide");

            });

    }

    /**
     * Renders the button used to reset the game when it's over.
     */
    Game.prototype.renderResetButton = function() {

        this.grid.canvas.drawRect({
            layer: true,
            name: "reset",
            groups: ["reset"],
            x: this.grid.canvas.get(0).width / 2 - 150,
            y: this.grid.canvas.get(0).height / 2 + 50,
            fillStyle: "#35B66B",
            height: 40,
            width: 300,
            fromCenter: false,
            index: 1000,
            mouseover: function(layer) {
                $(this).animateLayer(layer, {
                    fillStyle: '#298550'
                }, 50);
            },
            mouseout: function(layer) {
                $(this).animateLayer(layer, {
                    fillStyle: '#35B66B'
                }, 50);
            },
            click: function(layer) {
                window.location.href = "./index.html";
            }

        });

        this.grid.canvas.drawText({
            layer: true,
            groups: ["reset"],
            fillStyle: '#fff',
            fontFamily: 'Ubuntu, sans-serif',
            fontSize: "20px ",
            fontStyle: "bold",
            text: "PLAY AGAIN",
            x: this.grid.canvas.get(0).width / 2,
            y: this.grid.canvas.get(0).height / 2 + 70,
            letterSpacing: 0.03
        });

    }

    /**
     * Renders the Game (the canvas).
     */
    Game.prototype.render = function() {

        // Used for the canvas layer index
        let layerindex = 0;

        // Calculate how many obstacles are needed in each column.
        let neededSectors = Math.floor(this.grid.height / 3);

        for (let column = 0; column < this.grid.width; column++) {

            // Do not place obstacles in the first, last, or even numbered columns. This is to avoid walling in other objects.
            if (column === 0 || column === this.grid.width - 1 || column % 2 === 0) {

                continue;

            }

            // Create and place obstacles
            this.grid.getRandomEmptyInColumn(neededSectors, column + 1)
                .forEach(function(sector, index) {

                    this.grid.set(sector, new Obstacle({
                        id: "obstacle" + column.toString() + index.toString(),
                        name: "obstacle",
                        group: "obstacles",
                        index: layerindex
                    }, this));

                    layerindex++;

                }, this);

        }

        // Create and place weapons
        this.grid.getRandomEmpty(4)
            .forEach(function(sector, index) {

                this.grid.set(sector, new Weapon({
                    id: 'weapon' + (index + 1),
                    name: this.settings.weaponTypes[index].name,
                    damage: this.settings.weaponTypes[index].damage,
                    group: 'weapons',
                    index: layerindex
                }, this));

                layerindex++;

            }, this);

        // Create and place shields
        this.grid.getRandomEmpty(2)
            .forEach(function(sector, index) {

                this.grid.set(sector, new Shield({
                    id: 'shield' + (index + 1),
                    name: 'Shield',
                    group: 'shields',
                    index: layerindex,
                    value: 20
                }, this));

                layerindex++;

            }, this);

        // Place players - first half is placed in the first column, the other in the last column.
        this.players
            .forEach(function(player, index) {

                let sector;

                if (index % 2 === 0) {

                    sector = this.grid.getRandomEmptyInColumn(1, 1)[0];
                    player.direction = "e";

                } else {

                    sector = this.grid.getRandomEmptyInColumn(1, this.grid.width)[0];
                    player.direction = "w";

                }

                player.index = layerindex;
                this.grid.set(sector, player);

                layerindex++;

            }, this);

        // Render the placed items
        this.grid.render();

        // Display the valid moves for player one
        this.players[this.activePlayer].highlightValidMoves();
        this.players[this.activePlayer].displayActiveState();
 
    }

    /**
     * End the current turn and start the next
     */
    Game.prototype.nextTurn = function() {


        // Set next player as the active player
        this.activePlayer++

        if (this.activePlayer >= this.players.length) {

            this.activePlayer = 0;

        }

        // If next player is not in a battle, then highlight moves.
        if (!this.players[this.activePlayer].inBattle) {

            this.players[this.activePlayer].highlightValidMoves();

        } 

        // Display player as active
        this.players[this.activePlayer].displayActiveState();

    }

    /**
     * Set winner and looser and display game over message
     */
    Game.prototype.gameOver = function() {

        $(".list-group.active").removeClass("active");

        let winner = this.players
            .filter(function(player) {

                return player.health > 0;

            })[0];

        winner.setGameOverState('winner');    

        let looser = this.players
            .filter(function(player) {

                return player.health <= 0;

            })[0];

        looser.setGameOverState('looser');

        this.grid.canvas.drawRect({
            layer: true,
            groups: ["gameOver"],
            fillStyle: "rgba(0, 0, 0, .8)",
            x: 0,
            y: 0,
            height: this.grid.canvas.get(0).height,
            width: this.grid.canvas.get(0).width,
            fromCenter: false
        });

        let textLayers = [
            {
                fontSize: "20px",
                text: "THE WINNER IS",
                xOffset: -100
            },
            {
                fontSize: "50px",
                text: winner.name.toUpperCase(),
                xOffset: -25
            }

        ];

        textLayers
            .forEach(function(layer) {

                this.grid.canvas.drawText({
                    layer: true,
                    groups: ["gameOver"],
                    fillStyle: '#fff',
                    fontFamily: 'Ubuntu, sans-serif',
                    fontSize: layer.fontSize,
                    fontStyle: "bold",
                    text: layer.text,
                    x: this.grid.canvas.get(0).width / 2,
                    y: this.grid.canvas.get(0).height / 2 + layer.xOffset,
                    letterSpacing: 0.03
                });

            }, this);

        this.renderResetButton();

    }

    // ##############################################################
    //
    // GRID
    //
    // ##############################################################

    /**
     * Creates a new Grid and sets the size
     */
    function Grid(game) {

        this.game = game;
        this.width = game.settings.gridWidth;
        this.height = game.settings.gridHeight;
        this.sectorSize = game.settings.sectorSize;

        this.canvas = $("#gameCanvas");
        this.canvas.get(0).width = this.sectorSize * this.width;
        this.canvas.get(0).height = this.sectorSize * this.height;

        this.sectors = this.generateSectors();
    }

    /**
     * Return a map of the sectors for the grid
     */
    Grid.prototype.generateSectors = function() {

        let sectors = {};

        let sectorsNeeded = this.width * this.height;

        for (let i = 0; i < sectorsNeeded; i++) {

            sectors[i] = [];

        }

        return sectors;
    }

    /**
     * Returns the content of a grid sector - false if sector is outside the grid.
     */
    Grid.prototype.get = function(sector) {

        if (!this.isInside(sector)) {

            return false;

        }

        return this.sectors[sector];

    }

    /**
     * Returns an array of random empty sectors
     */
    Grid.prototype.getRandomEmpty = function(amount) {

        return this.getRandomEmptyInColumn(amount);

    }

    /**
     * Returns an array of random empty sectors. If column is not given, they will be random of the entire grid.
     */
    Grid.prototype.getRandomEmptyInColumn = function(amount, column) {

        return Object.keys(this.sectors)
            .filter(function(sector) {

                let isEmpty = this.get(sector).length === 0;

                if (!column) {

                    return isEmpty;

                }

                return (sector % this.width) === (column - 1) && isEmpty;

            }, this)
            .shuffle()
            .slice(0, amount || 1);
    }

    /**
     * Sets the content of a grid sector. If an array is given as the value, then the current value is replaced. If a non array is given, then it will be added to the current array.
     */
    Grid.prototype.set = function(sector, value) {

        if (Array.isArray(value)) {

            this.sectors[sector] = value;

        } else {

            this.sectors[sector].push(value);

        }

    }

    /**
     * Remove an object from a grid sector
     */
    Grid.prototype.remove = function(sector, object) {

        let objectsLeft = this.get(sector)
            .filter(function(content) {

                return object !== content;

            });

        this.set(sector, objectsLeft);

    }

    /**
     * Move an object from one grid sector to another
     */
    Grid.prototype.move = function(gameObject, target) {

        this.set(target, gameObject);

        this.set(gameObject.position, this.get(gameObject.position)
            .filter(function(object) {

                return object !== gameObject;

            })
        );

    }

    /**
     * Returns the coordinates of a grid sector
     */
    Grid.prototype.getXY = function(sector) {

        return {
            x: sector % this.width,
            y: Math.floor(sector / this.width)
        };

    }

    /**
     * Returns true if vector is inside grid and false if not.
     */
    Grid.prototype.isInside = function(sector) {

        return sector >= 0 && sector <= this.width * this.height - 1;

    }

    /**
     * Renders the grid background
     */
    Grid.prototype.renderBackground = function() {

        let that = this;

        this.canvas.createPattern({
            x: 0,
            y: 0,
            width: this.sectorSize,
            height: this.sectorSize,
            source: 'images/sand.png',
            load: function(pattern) {
                
                that.canvas.drawRect({
                    layer: true,
                    name: "background",
                    fillStyle: pattern,
                    x: 0,
                    y: 0,
                    width: that.canvas.get(0).width,
                    height: that.canvas.get(0).height,
                    fromCenter: false
                });

                that.canvas.moveLayer('background', 0);

            }

        });

    }

    /**
     * Renders the grid background and objects in the grid
     */
    Grid.prototype.render = function() {

        // Render background
        this.renderBackground();

        // Render objects
        Object.keys(this.sectors)
            .forEach(function(sector) {

                let objects = this.get(sector);

                objects.forEach(function(object) {

                    object.render(sector);

                });

            }, this)

        // Set layer indexes so that they are stacked in correct order
        this.canvas.getLayerGroup('obstacles').forEach(function(obstacle) {

            this.canvas.moveLayer(obstacle, obstacle.index);

        }, this);

        this.canvas.getLayerGroup('weapons').forEach(function(weapon) {

            this.canvas.moveLayer(weapon, weapon.index);

        }, this);

        this.canvas.getLayerGroup('players').forEach(function(player) {

            this.canvas.moveLayer(player, player.index);

        }, this);

        // Since shields are actually removed from the map when picked up, we check if any are left before trying to set the index.
        let shields = this.canvas.getLayerGroup('shields');
        if (shields) {

            shields.forEach(function(shield) {

                this.canvas.moveLayer(shield, shield.index);

            }, this);

        }

        this.canvas.drawLayers();

    }

    // ##############################################################
    //
    // VIEW
    //
    // ##############################################################

    /**
     * Creates a view which handles checking sectors in view of the user.
     */
    function View(grid, observer) {
        this.grid = grid;
        this.observer = observer;
        this.dirs = ['n', 'e', 's', 'w'];
    }

    /**
     * Returns the sector in the given direction and distance, false if outside grid.
     */
    View.prototype.getTarget = function(dir, dist) {

        let target;

        switch (dir) {
            case "n":
                target = this.observer - this.grid.width * dist;
                break;
            case "s":
                target = this.observer + this.grid.width * dist;
                break;
            case "w":
                target = ((this.observer + 1 - dist) % this.grid.width !== 0) ? this.observer - dist : -1;
                break;
            case "e":
                target = ((this.observer + dist) % this.grid.width !== 0) ? this.observer + dist : -1;
                break;
        }

        if (!this.grid.isInside(target)) {

            return false;

        }

        return target;

    }

    /**
     * Returns the sectors next to the observer
     */
    View.prototype.getNeighbors = function() {

        return this.dirs
            .map(function(dir) {

                return {
                    direction: dir,
                    sector: this.getTarget(dir, 1)
                };

            }, this);

    }

    /**
     * Returns the sectors that makes up the path from the observer to the destination given.
     */
    View.prototype.getDirectionsTo = function(destination) {

        let distance = 0;
        let direction;
        let directionMetric;
        let directions = [];

        // north
        if (destination < this.observer && (this.observer - destination) % this.grid.width === 0) {

            distance = (this.observer - destination) / this.grid.width;
            directionMetric = -this.grid.width;
            direction = "n";

        }
        // west
        else if (destination < this.observer) {

            distance = this.observer - destination;
            directionMetric = -1;
            direction = "w";

        }
        // south
        else if (destination > this.observer && (destination - this.observer) % this.grid.width === 0) {

            distance = (destination - this.observer) / this.grid.width;
            directionMetric = this.grid.width;
            direction = "s";

        }
        // east
        else {

            distance = destination - this.observer
            directionMetric = 1;
            direction = "e";

        }

        for (let i = 0; i < distance; i++) {

            directions.push({
                destination: this.observer + directionMetric * (i + 1),
                direction: direction
            });

        }

        return directions;

    }

    /**
     * Returns the moves which are valid for a player to move to.
     */
    View.prototype.getValidMoves = function(distance) {

        let validMoves = [];

        // Get moves for all 4 possible directions
        for (let i = 0; i < this.dirs.length; i++) {

            let dir = this.dirs[i];

            // Get moves for possible amount of distance
            for (let dist = 1; dist <= distance; dist++) {

                // Get content of target to check for obstacles or other players
                let target = this.getTarget(dir, dist);

                // Stop checking in this direction if we are off the grid
                if (target === false) {

                    break;

                }

                // Check if sector contains an obstacle or player - in this case we cannot move to the sector.
                let moveIsValid = this.grid.get(target)
                    .filter(function(gameObject) {

                        return (gameObject instanceof Obstacle || gameObject instanceof Player);

                    }, this).length === 0;


                // Stop checking in this direction if there are obstacles or players in the way
                if (!moveIsValid) {

                    break;

                }

                validMoves.push(this.getTarget(dir, dist));

            }

        }

        return validMoves;
    }

    // ##############################################################
    //
    // GAMEOBJECT
    //
    // ##############################################################

    /**
     * Base object for other game objects to extend
     */
    function GameObject(data, game) {
        this.game = game;
        this.id = data.id;
        this.name = data.name;
        this.onClick = data.onClick || null;
        this.group = data.group || null;
        this.position;
        this.index = data.index || null;
        this.source = data.source;
    }

    /**
     * Renders the game object in the given sector
     */
    GameObject.prototype.render = function(sector) {

        this.xy = this.game.grid.getXY(sector);
        this.position = Number(sector);

        let drawData = {
            layer: true,
            name: this.id,
            source: this.source,
            x: this.xy.x * this.game.grid.sectorSize,
            y: this.xy.y * this.game.grid.sectorSize,
            width: this.game.grid.sectorSize,
            height: this.game.grid.sectorSize,
            fromCenter: false
        };

        if (this.group) {
            drawData.groups = [this.group];
        }

        // Add click handler if provided - just here for future possibilities
        if (this.onClick) {
            drawData.click = this.onClick;
        }

        if (this.index) {
            drawData.index = this.index;
        }

        // Point object in a specific direction
        if (this.direction) {
            this.setRotationDegree(this.direction)
            drawData.rotate = this.rotation;
        }

        this.game.grid.canvas.drawImage(drawData);

    }

    // ##############################################################
    //
    // OBSTACLE
    //
    // ##############################################################

    /**
     * Created an obstacle which inherits from the game object
     */
    function Obstacle(data, game) {

        data.source = 'images/tree.png';

        GameObject.call(this, data, game);

    }

    // Inherit prototypes
    Obstacle.prototype = Object.create(GameObject.prototype);

    // ##############################################################
    //
    // PLAYER
    //
    // ##############################################################

    /**
     * Creates a player object which inherits from the game object
     */
    function Player(data, game) {

        data.source = 'images/' + data.id + '.png';

        GameObject.call(this, data, game);
        
        this.view;
        this.neighbors;
        this.inBattle;
        this.oponent;
        this.oponentDirection;
        this.health = 100;
        this.shield = 10;
        this.direction = data.direction;
        this.rotation;
        this.defending;

        // Create a default weapon for the player
        this.weapon = new Weapon({name: 'default', id: this.name + 'DefaultWeapon', damage: 10, group: "weapons"}, this.game);

    }

    // Inherit prototypes
    Player.prototype = Object.create(GameObject.prototype);

    /**
     * Explodes the player
     */
    Player.prototype.explode = function() {

        this.game.grid.canvas.removeLayer(this.id);
        this.game.grid.canvas.drawLayers();

        let frames = [
            {
                id: "explosion1",
                source: "images/explosion1.png"
            },
            {
                id: "explosion2",
                source: "images/explosion2.png"
            },
            {
                id: "explosion3",
                source: "images/explosion3.png"
            },
            {
                id: "explosion4",
                source: "images/explosion4.png"
            },
            {
                id: "explosion5",
                source: "images/explosion5.png"
            }
        ];

        this.renderExplosion(frames);

    }

    /**
     * Renders the player explosion
     */
    Player.prototype.renderExplosion = function(frames) {

        // Ref this for use inside callback
        let that = this;
        // Grab the first of the remaining frames
        let frame = frames.shift();

        this.game.grid.canvas.drawImage({

            layer: true,
            name: frame.id,
            source: frame.source,
            x: (this.xy.x * this.game.grid.sectorSize) + (this.game.grid.sectorSize / 2) ,
            y: (this.xy.y * this.game.grid.sectorSize) + (this.game.grid.sectorSize / 2),
            width: this.game.grid.sectorSize,
            height: this.game.grid.sectorSize,
            fromCenter: true

        }).animateLayer(frame.id, {

            width: 0,
            height: 0
            
        }, 65, function(layer) {

            that.game.grid.canvas.removeLayer(frame.id);

            if (frames.length > 0) {

                // Render next frame                
                that.renderExplosion(frames);

            } else {

                // End game
                that.game.gameOver();

            }
            
        });

    }

    /**
     * Highlights the moves that are valid for a user.
     */
    Player.prototype.highlightValidMoves = function() {

        this.view = new View(this.game.grid, this.position);

        let moves = this.view.getValidMoves(this.game.moveLimit);

        moves.forEach(function(target) {

            this.renderValidMove(target);

        }, this);

    }

    /**
     * Render a sector as a valid move and attach a handler to the click event
     */
    Player.prototype.renderValidMove = function(destination) {

        // Ref this for inside callback
        let that = this;

        let xy = this.game.grid.getXY(destination);

        this.game.grid.canvas.drawRect({
            layer: true,
            groups: ["moves"],
            fillStyle: "rgba(0, 255, 0, .3)",
            x: xy.x * this.game.grid.sectorSize,
            y: xy.y * this.game.grid.sectorSize,
            height: this.game.grid.sectorSize,
            width: this.game.grid.sectorSize,
            fromCenter: false,
            click: function(layer) {

                that.animateMoveTo(destination);

            }
        });

    }

    /**
     * Hides the vadid moves by removing the layer group
     */
    Player.prototype.hideValidMoves = function() {

        let movesLayers = this.game.grid.canvas.getLayerGroup("moves");

        if (movesLayers !== undefined && movesLayers.length > 0) {

            this.game.grid.canvas.removeLayerGroup("moves");
            this.game.grid.canvas.drawLayers();

        }

    }

    /**
     * Animate a player's move to the destination.
     */
    Player.prototype.animateMoveTo = function(destination) {

        // Stop moving if player has reached the destination
        if (destination === this.position) {

            this.game.nextTurn();
            return;

        }

        // Ref this for use inside callbacks
        let that = this;

        let directions = this.view.getDirectionsTo(destination);

        let moveTo = directions.shift();

        this.hideValidMoves();

        let xy = this.game.grid.getXY(moveTo.destination);

        // Rotate to the direction if needed
        if (moveTo.direction !== this.direction) {

            this.rotateTo(moveTo.direction, destination);

            return;

        }

        // Move
        this.move(moveTo.destination);

        // Animate
        this.game.grid.canvas.animateLayer(this.id, {

            x: xy.x * this.game.grid.sectorSize,
            y: xy.y * this.game.grid.sectorSize

        }, 150, function(layer) {

            that.xy = xy;

            // Search sector that player have moved into
            that.search();

            // Check for enemies in nearby sectors
            let enemyNeigbors = that.getEnemyNeighbors();

            if (enemyNeigbors !== null) {

                // Select a random oponent - this is primarily done to support having multiple players in nearby sectors
                let oponent = enemyNeigbors.getRandom();

                // Get direction of player seen from oponent - used to turn oponent so players faces each other
                let oponentTurnTo;
                switch (oponent.direction) {

                    case "n": oponentTurnTo = "s"; break;
                    case "s": oponentTurnTo = "n"; break;
                    case "e": oponentTurnTo = "w"; break;
                    case "w": oponentTurnTo = "e"; break;

                }

                that.oponentDirection = oponent.direction;
                oponent.oponentDirection = oponentTurnTo;

                that.setupBattle(oponent.enemy);

                that.rotateTo(that.oponentDirection);
                that.oponent.rotateTo(oponent.oponentDirection);

            } else {

                that.animateMoveTo(destination);

            }

        });


    }

    /**
     * Rotates the player into the given direction. If destination is given, then animateMoveTo is called, if not, then player is next to an enemy and a battle is started.
     */
    Player.prototype.rotateTo = function(direction, destination) {

        // Ref this for use inside callback
        let that = this;
        // Calculate how long it should take to rotate (so that rotating 180 does not show in twice the speed of rotating 90 degrees)
        let preRotation = this.rotation;
        this.setRotationDegree(direction);
        let rotationTimer = Math.abs(preRotation - this.rotation);

        this.game.grid.canvas.animateLayer(this.id, {

            rotate: this.rotation

        }, rotationTimer, function(layer) {

            that.direction = direction;

            if (destination) {

                that.animateMoveTo(destination);

            } else if (!that.inBattle) {

                that.startBattle();

            }

        });

    }

    /**
     * Returns enemies in nearby sectors, if none are found, null is returned.
     */
    Player.prototype.getEnemyNeighbors = function() {

        let enemyNeighbors = [];

        this.view.getNeighbors()
            .forEach(function(neighbor) {

                // Skip checking neigbors outside the grid
                if (neighbor.sector === false) {

                    return false;

                }

                this.game.grid.get(neighbor.sector)
                    .forEach(function(gameObject) {

                        if (gameObject instanceof Player) {

                            enemyNeighbors.push({
                                enemy: gameObject,
                                direction: neighbor.direction
                            });

                        }

                    });

            }, this);

        return (enemyNeighbors.length > 0) ? enemyNeighbors : null;

    }

    /**
     * Renders controls used while in battle and sets players to being in battle.
     */
    Player.prototype.setupBattle = function(oponent) {

        this.oponent = oponent;
        this.inBattle = true;

        this.oponent.oponent = this;
        this.oponent.inBattle = true;

        this.displayActiveState();

    }

    /**
     * Renders the players battle state - for future implementations
     */
    Player.prototype.startBattle = function() {

        this.renderBattleState();
        this.oponent.enemy.renderBattleState();

    }

    /**
     * Calculates and sets the players rotation degree.
     */
    Player.prototype.setRotationDegree = function(direction) {

        // Start from 0 if current rotation is not set
        this.rotation = this.rotation || 0;
        let calculatedRotaion = this.rotation % 360;
        let desiredRotation = this.degreeOfDirection(direction);

        // Turn left if going from the right to left
        if (calculatedRotaion < 180 && (desiredRotation > (calculatedRotaion + 180))) {
            this.rotation -= 360;
        }

        // Turn right if going from the left to right
        if ( calculatedRotaion >= 180 && (desiredRotation <= (calculatedRotaion - 180)) ) {
            this.rotation += 360;
        }

        this.rotation += (desiredRotation - calculatedRotaion);

    }

    /**
     * Return the degree which a direction matches
     */
    Player.prototype.degreeOfDirection = function(direction) {

        switch (direction) {

            case "n": return 0;
            case "e": return 90;
            case "s": return 180;
            case "w": return 270;

        }

    }

    /**
     * For future fanciness
     */
    Player.prototype.renderBattleState = function() { }

    /**
     * Hits the oponent with the force of the players weapon
     */
    Player.prototype.whack = function() {

        let damage = this.weapon.damage;

        // Recuce damage if oponent is defending
        if (this.oponent.defending) {

            damage = damage / 2;
            this.oponent.defending = false;

        }

        this.showFire();
        this.oponent.setHealth(damage);
        this.game.nextTurn();

    }

    /**
     * Renders a short fireburst from the players cannon
     */
    Player.prototype.showFire = function() {

        // In case another blast is not done rendering, remove it
        this.game.grid.canvas.removeLayerGroup("blast")

        let that = this;

        let tankXY = {
            x: this.xy.x * this.game.grid.sectorSize,
            y: this.xy.y * this.game.grid.sectorSize
        };

        let blastXY = {
            x: 0,
            y: 0,
            rotation: 0
        };

        switch (this.direction) {

            case "e":
                blastXY.x = tankXY.x + this.game.grid.sectorSize;
                blastXY.y = tankXY.y + this.game.grid.sectorSize / 2;
                blastXY.rotation = 90;
                break;
            case "w":
                blastXY.x = tankXY.x;
                blastXY.y = tankXY.y + this.game.grid.sectorSize / 2;
                blastXY.rotation = 270;
                break;
            case "n":
                blastXY.x = tankXY.x + this.game.grid.sectorSize / 2;
                blastXY.y = tankXY.y;
                blastXY.rotation = 0;
                break;
            case "s":
                blastXY.x = tankXY.x + this.game.grid.sectorSize / 2;
                blastXY.y = tankXY.y + this.game.grid.sectorSize;
                blastXY.rotation = 180;
                break;

        }

        this.game.grid.canvas.drawImage({
            layer: true,
            name: "blast",
            groups: ["blast"],
            source: "images/blast.png",
            x: blastXY.x,
            y: blastXY.y,
            rotate: blastXY.rotation,
            width: 12,
            height: 15,
            fromCenter: true,
            index: that.index - 1,
        }).animateLayer("blast", {
            width: 0
        }, 100, function(layer) {

            that.game.grid.canvas.removeLayerGroup("blast");

        });

    }

    /**
     * Subtracts the given damage from the players shield/health
     */
    Player.prototype.setHealth = function(damage) {

        $(".list-group.defending").removeClass("defending");

        if (this.shield >= damage) {

            this.shield -= damage;
            $("#" + this.id + "Board .shield").addClass("hit");

        } else if (this.shield < damage) {

            damage = damage - this.shield;

            if (this.health - damage <= 0) {

                this.health = 0;

                this.explode();

            } else {

                this.health -= damage;

            }

            $("#" + this.id + "Board .health").addClass("hit");

            if (this.shield > 0) {

                $("#" + this.id + "Board .shield").addClass("hit");

            }

            this.shield = 0;
        }

        $("#" + this.id + "Board .shield .level").html(this.shield);
        $("#" + this.id + "Board .health .level").html(this.health);

    }

    /**
     * Sets the player as defending
     */
    Player.prototype.defend = function() {

        $("#" + this.id + "Board .list-group").addClass("defending");
        this.defending = true;
        this.game.nextTurn();

    }

    /**
     * Updates the players position in the grid map
     */
    Player.prototype.move = function(target) {

        this.game.grid.move(this, target);
        this.position = target;
        this.view.observer = target;

    }

    /**
     * Search the sectors next to the user, if weapons or shield is found, pick them up
     */
    Player.prototype.search = function() {

        let that = this;

        let objectsFound = this.game.grid.get(this.position)
            .filter(function(gameObject) {

                return !(gameObject instanceof Player);

            });

        if (objectsFound.length > 0) {

            objectsFound
                .forEach(function(object) {

                    if (object instanceof Weapon) {

                        that.pickUpWeapon(object);

                    }

                    if (object instanceof Shield) {

                        that.pickUpShield(object);

                    }

                }, this);

        }

    }

    /**
     * Highlights the currently active players board and the message
     */
    Player.prototype.displayActiveState = function() {

        $(".list-group.active").removeClass("active");

        if (this.health > 0) {
            
            $("#" + this.id + "Board .list-group").addClass("active");

        }

        if (this.inBattle) {

            $("#" + this.id + "Board .list-group").addClass("in-battle");

        }

    }

    /**
     * Highlight whether the player is winner or looser.
     */
    Player.prototype.setGameOverState = function(state) {

        $("#" + this.id + "Board .list-group-header").addClass(state);

    }

    /**
     * Pick up a weapon and leave the current one behind. Also updates the player's board with weapon info
     */
    Player.prototype.pickUpWeapon = function(weapon) {

            this.weapon.index = weapon.index;
            this.game.grid.remove(this.position, weapon);
            this.game.grid.set(this.position, this.weapon);
            this.weapon = weapon;

            this.game.grid.canvas.removeLayerGroup("weapons");
            this.game.grid.render();

            $("#" + this.id + "Board .weapon").addClass(weapon.id);
            $("#" + this.id + "Board .weapon .name").html(weapon.name);
            $("#" + this.id + "Board .weapon .damage").html(weapon.damage);

    }

    /**
     * Pick up shield. Also updates the player's board with shield status
     */
    Player.prototype.pickUpShield = function(shield) {

            this.game.grid.remove(this.position, shield);
            this.game.grid.canvas.removeLayer(shield.id);
            this.shield += shield.value;
            this.game.grid.render();
            $("#" + this.id + "Board .shield .level").html(this.shield);
    }

    // ##############################################################
    //
    // WEAPON
    //
    // ##############################################################

    /**
     * Creates a new wepons that inherits from the game object
     */
    function Weapon(data, game) {

        if (data.name == "default") {

            data.source = 'images/weaponDefault.png';

        } else {

            data.source = 'images/' + data.id + '.png';

        }

        GameObject.call(this, data, game);

        this.damage = data.damage;
    }

    // Inherit prototype
    Weapon.prototype = Object.create(GameObject.prototype);

    // ##############################################################
    //
    // SHIELD
    //
    // ##############################################################

    /**
     * Creates a new shield that inherits from the game object
     */
    function Shield(data, game) {

        this.value = data.value;

        data.source = 'images/shield.png';

        GameObject.call(this, data, game);

    }

    // Inherit prototype
    Shield.prototype = Object.create(GameObject.prototype);




    // --------------------------------------
    // HELPER FUNCTIONS
    // --------------------------------------

    /**
     * Return a random element of an array
     */
    if (!Array.prototype.getRandom) {

        Array.prototype.getRandom = function() {

            return this[Math.floor(Math.random() * this.length)];

        }

    }

    /**
     * Shuffles the elements in an array using the Durstenfeld shuffle algorithm and returns the array
     * Source: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
     */
    if (!Array.prototype.shuffle) {

        Array.prototype.shuffle = function() {

            for (var i = this.length - 1; i > 0; i--) {

                var j = Math.floor(Math.random() * (i + 1));
                var temp = this[i];
                this[i] = this[j];
                this[j] = temp;

            }

            return this;

        }

    }

    // Preload images - To avoid trying to render something for which the image has not yet been loaded
    function preload(sources, callback) {

        if (sources.length) {

            var preloaderDiv = $('<div style="display: none;"></div>').prependTo(document.body);

            $.each(sources, function(i, source) {

                $("<img/>").attr("src", source).appendTo(preloaderDiv);

                if (i == sources.length - 1 ) {

                    $(preloaderDiv).imagesLoaded(function() {

                        $(this).remove();

                        if(callback) callback();

                    });
                }
            });

        } else {

            if (callback) callback();

        }
    }

    // Images that should be preloaded
    let imageSources = [
        "images/player1.png",
        "images/player2.png",
        "images/sand.png",
        "images/tree.png",
        "images/weapon1.png",
        "images/weapon2.png",
        "images/weapon3.png",
        "images/weapon4.png",
        "images/weaponDefault.png",
        "images/blast.png",
        "images/explosion1.png",
        "images/explosion2.png",
        "images/explosion3.png",
        "images/explosion4.png",
        "images/explosion5.png",
        "images/shield.png"

    ];

    // Start game when images are loaded
    preload(imageSources, function() {

        let game = new Game(gameSettings);

    });

})());

