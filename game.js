/**
 * Image Referance:
 * I have created my own images, all images are by law owned by Ben Silvester
 */

/**
 * @typedef {Object} Coordinates
 * @property {Number} x
 * @property {Number} y
 */
 class Entity{
    constructor(x,y){
        this.name = "";
        this.identifier = "";
        this.position = {
            x:x,
            y:y
        };
        this.joinable = true;
        this.destroyable = true;
        this.image = '';
    }

    /**
     * Return tiles around the entity, including diagonals
     * Note: An improvement could be to return tiles based on the true radius (circle )
     * @param {Board} board 
     * @param {Number} radius - Generic square based radius 
     * @param {Coordinates} coordinates
     * @returns {Tile[]}
     */
    scan(board,radius=1,coordinates=this.position){
        //Allows for cleaner array indexing
        const x = coordinates.x
        const y = coordinates.y

        const tiles = new Array();
        for (let i = x - 1* radius; i <= x + 1* radius; i++) { 
            for (let j = y - 1 * radius; j <= y + 1 * radius; j++) {
                //Avoid checking entities in current position
                if(JSON.stringify({x:x,y:y}) != JSON.stringify({x:i,y:j})){
                    //Avoid checking out-of-bound elements
                    if(board.tiles[i] != undefined){
                        if(board.tiles[i][j] != undefined){
                            tiles.push(board.tiles[i][j]);
                        }
                    }
                }
            } 
            
        }
        return tiles;
    }

    /**
     * Return tiles around the entity, excluding diagonals
     * @param {Board} board 
     * @param {Coordinates} coordinates
     * @returns {Tile[]}
     */
    sideScan(board, coordinates=this.position){
        //Allows for cleaner array indexing

        const x = coordinates.x
        const y = coordinates.y

        const tiles = new Array();

        if(board.tiles[x-1] != undefined){
            tiles.push(board.tiles[x-1][y]) //Left
        }
        if(board.tiles[x+1] != undefined){
            tiles.push(board.tiles[x+1][y]) //Right
        }
        if(board.tiles[x][y-1] != undefined){
            tiles.push(board.tiles[x][y-1]) //Up
        }
        if(board.tiles[x][y+1] != undefined){
            tiles.push(board.tiles[x][y+1]) //Down
        }

        return tiles;
    }

}

class Movable extends Entity{

    constructor(x,y){
        super(x,y);
        this.alive = true;
    }
    /**
     * Move entity to a given location.
     * @param {Board} board 
     * @param {Coordinates} coordinates
     */
    move(board,coordinates){
        //Stop movement to a non-joinable tile.
        if(board.getGrid(coordinates).entities.some(e=>e.joinable == false)) return;
        
        board.getGrid(this.position).remove(this);
        board.getGrid(coordinates).add(this);
    }

    /**
     * 
     * @param {Coordinates} pos1 
     * @param {Coordinates} pos2 
     * @returns 
     */
    equal(pos1, pos2){
        return (pos1.x == pos2.x) && (pos1.y == pos2.y)
    }

    distance(pos1,pos2){
        return Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y);
    }

    /**
     * @param {Board} board 
     */
    kill(board){
        this.alive = false;
    }

        /**
     * A* pathfinding algorithm,
     * @param {Board} board 
     * @param {Coordinates} start 
     * @param {Coordinates} end 
     * @returns {Coordinates[]}
     * 
     */
    pathfind(board, start, end){
        /**@type {Path[]} */
        var open = new Array();
        /**@type {Path[]} */
        const closed = new Array();

        //Add our start tile to the open list
        const beginning = new Path(board.getGrid(start),0,0)
        open.push(beginning);

        //Iterate until the open list is empty
        while (open.length > 0) {
            //Get the tile with the lowest f value (g(distance from start) + h(estimated distance from end))
            var current = open[0];
            open.forEach(element => {
                if(element.f < current.f){
                    current = element;
                }
            });
            open = open.filter(node => node.tile != current.tile);
            closed.push(current);

            //Check if we have reached our goal
            if(this.equal(current.tile.position,end)){
                //Traverse back down our path, storing each coordinate
                const travel = new Array();
                var currentNode = current;
                //While the node has a parent, go to that parent and store its coordinates
                while (currentNode.parent != undefined) {
                    travel.push(currentNode.tile.position)
                    currentNode = currentNode.parent;
                }
                return travel.reverse();
            }

            //Obtain all the surrounding tiles around or current tile

            const children = this.sideScan(board, current.tile.position)
            //Look through each of our child tile
            children.forEach(child => {
                //Check the tile is joinable 
                //Robot instance only checks if it can join another robot
                if(child.entities.filter(e=>e.joinable == false).length <= 0){
                    
                    var g = Math.hypot(current.tile.position.x - child.position.x, current.tile.position.y - child.position.y); //Set our g value (distance from starting node)
                    var h = Math.hypot(child.position.x - end.x, child.position.y - end.y) //Estimated distance from end
                    const pathChild = new Path(child, current , g, h); //Initilize the path with the correct values
                    //Check path has not been visted already
                    const inClosed = closed.filter(child=> child.tile == pathChild.tile).length >=1;
                    if(inClosed == false){
                        
                        ///Check child in not already in the open list
                        var inOpen = false
                        open.forEach(openNode=>{
                            if(pathChild.tile == openNode.tile && pathChild.g > openNode.g){
                                inOpen = true;
                            }
                        })

                        if(inOpen == false){
                            open.push(pathChild);
                        }
                    }

                }
            });
        }

        return [];
    }
}

class Path{
    constructor(tile, parent , g, h){
        /**@type {Tile} */
        this.tile = tile;
        this.g = g;
        this.h = h;
        this.f = g + h;
        /**@type {Path} */
        this.parent = parent;
    }    
}

class Mine extends Entity {
    constructor(x,y,active=false){
        super(x,y);

        this.name = "Mine";
        this.identifier = "m"
        this.active = active;
        this.destroyable = false;
        this.blastradius = 1;
        this.exploded = false;
        this.image = './images/Mine(Red).png'
        this.activeImage = './images/Mine(Green).png'
    }

    activate(){
        this.active = true;
        return this;
    }

    /**
     * Detonate the current mine
     * @param {Board} board 
     */
    detonate(board){
        this.exploded = true;
        board.getGrid(this.position).entities = board.getGrid(this.position).entities.filter(e=>(e instanceof Mine) == false)
        for (const tile of this.scan(board, this.blastradius)) {
            tile.find(Mine).forEach(m=>{
                //Fun: Not needed
                //Chain reaction of mines detonating
                if(m.destroyable == true && m.exploded == false) {
                    //Recusively call function on other mine object that are within radius
                    m.detonate(board);
                }
            });
            board.getGrid(tile.position).entities.forEach(t=>{
                if(t.destroyable == true && t instanceof Robot){
                    t.kill(board);
                }
            })
            board.getGrid(tile.position).entities = board.getGrid(tile.position).entities.filter(e=>e.destroyable==false);
            
        }
    }
}

class Asteroid extends Entity{
    constructor(x,y){
        super(x,y);

        this.name = "Asteroid";
        this.identifier = "a"
        this.destroyable = true;
        this.joinable = false;
        this.image = './images/Asteroid.png'

    }
}

class Robot extends Movable{
    constructor(x,y){
        super(x,y);

        this.name = "Robot";
        this.identifier = "r";
        this.image = './images/Robot.png'
    }
    /**
     * Move entity to given location.
     * @param {Board} board 
     * @param {Coordinates} coordinates
     */
    move(board,coordinates){

        //Stop movement to a non-joinable tile.
        if(board.getGrid(coordinates).entities.some(e=>e.joinable == false)) return;
        if(board.getGrid(coordinates).entities.some(e=>e instanceof Robot)) return;        
        board.getGrid(this.position).remove(this);
        board.getGrid(coordinates).add(this);
        this.position = coordinates;
        
        //Check robot has stepped on player
        /** @type {Player[]}*/
        const players = board.getGrid(coordinates).find(Player)
        if(players.length > 0){
            players.forEach(p=>p.kill(board))
        }
        
        //Check robot has stepped on a mine
        /**@type {Mine[]} */
        const mines = board.getGrid(coordinates).find(Mine)
        if(mines.length > 0){
            const activeMines = mines.filter(m=>m.active == true);
            const inactiveMines = mines.filter(m=>m.active == false);
            
            if(activeMines.length > 0){
                activeMines.forEach(m=>m.detonate(board));
                this.kill(board);
            }
            if(inactiveMines.length > 0){
                board.getGrid(coordinates).disarm();
            }
        }
        
        //Detonate if in vacinity of active mine.
        const surrounding = this.scan(board,1,coordinates).filter(e=>e.entities.some(m=>m instanceof Mine && m.active == true));
        if(surrounding.length > 0){
            surrounding.forEach(t=>t.entities.filter(e=>e instanceof Mine).forEach(m=>m.detonate(board)));
            this.kill(board)
        }
    }

    /**
     * A* pathfinding algorithm,
     * @param {Board} board 
     * @param {Coordinates} start 
     * @param {Coordinates} end 
     * @returns {Coordinates[]}
     * 
     */
    pathfind(board, start, end){
        /**@type {Path[]} */
        var open = new Array();
        /**@type {Path[]} */
        const closed = new Array();

        //Add our start tile to the open list
        const beginning = new Path(board.getGrid(start),0,0)
        open.push(beginning);

        //Iterate until the open list is empty
        while (open.length > 0) {

            //Get the tile with the lowest f value (g(distance from start) + h(estimated distance from end))
            var current = open[0];
            open.forEach(element => {
                if(element.f < current.f){
                    current = element;
                }
            });
            open = open.filter(node => node.tile != current.tile);
            closed.push(current);

            //Check if we have reached our goal
            if(this.equal(current.tile.position,end)){
                //Traverse back down our path, storing each coordinate
                const travel = new Array();
                var currentNode = current;
                //While the node has a parent, go to that parent and store its coordinates
                while (currentNode.parent != undefined) {
                    travel.push(currentNode.tile.position)
                    currentNode = currentNode.parent;
                }
                return travel.reverse();
            }

            //Obtain all the surrounding tiles around or current tile
            const children = this.scan(board,1,current.tile.position);
            //Look through each of our child tile
            children.forEach(child => {
                //Check the tile is joinable 
                //Robot instance only checks if it can join another robot
                if(child.entities.filter(e=>e.joinable == false).length <= 0 && child.entities.some(e=> e instanceof Robot) == false){
                    
                    var g = Math.hypot(current.tile.position.x - child.position.x, current.tile.position.y - child.position.y); //Set our g value (distance from starting node)
                    var h = Math.hypot(child.position.x - end.x, child.position.y - end.y) //Estimated distance from end
                    const mineCheck = this.scan(board,1,child.position) //Scan the child tile surrounding

                    //Infuence the robot to avoid active tiles
                    if(mineCheck.some(e=>e.entities.some(m=>m instanceof Mine && m.active == true))){
                        g+=10;
                    }
                    if(child.entities.some(e=> e instanceof Mine && e.active == true)){
                        g+=10;
                    }
                    
                    //Infuence the robot to go to inactive tiles
                    if(mineCheck.some(e=>e.entities.some(m=>m instanceof Mine && m.active == false))) g-=2;
                    if(child.entities.some(e=> e instanceof Mine && e.active == false)) g-=3

                    const pathChild = new Path(child, current , g, h); //Initilize the path with the correct values
                    //Check path has not been visted already
                    const inClosed = closed.filter(child=> child.tile == pathChild.tile).length >=1;
                    if(inClosed == false){
                        
                        ///Check child in not already in the open list
                        var inOpen = false
                        open.forEach(openNode=>{
                            if(pathChild.tile == openNode.tile && pathChild.g > openNode.g){
                                inOpen = true;
                            }
                        })

                        if(inOpen == false){
                            open.push(pathChild);
                        }
                    }

                }
            });
        }

        //Path not found and so is inaccessible, potentially blocked by asteroids
        console.log("Cannot find");
        return [];
    }
    
    /**
     * Algorithm to determine where the robot should move, difficult maybe too high
     * @param {Board} board 
     * @param {Entity} target 
     */
    hunt(board, target){
        
        /**@type {Tile[]} */        
        const surrounding = this.scan(board, 1 , this.position);
        surrounding.forEach(t=>t.entities.forEach(m=> {
            if(m.active == true){
                m.detonate(board);
            }
        }))

        if(this.alive == false) return;

        const player = surrounding.filter(e=>e.entities.some(p=> p instanceof Player));
        const inactiveMines = surrounding.filter(e=>e.entities.some(p=> p instanceof Mine && p.active == false));
        const allInactiveMines = board.obtain(Mine).filter(m=>m.active == false);

        if(player.length > 0){
            this.move(board, player[this.random(player.length)].position)

        }else if(inactiveMines.length > 0){
            const rng = this.random(inactiveMines.length);
            this.move(board, inactiveMines[rng].position)
            console.log(`Bomb disarmed at {${inactiveMines[rng].position.x},${inactiveMines[rng].position.y}}`);
            
        }else if(board.getGrid(this.position).contains(Player) == false){
            var path = new Array();
            if(board.getGrid(target.position).entities.filter(e=>e instanceof Mine).length >= 1 || this.scan(board, 1 , target.position).filter(t=> t.entities.some(e=> e instanceof Mine && e.active == true)).length >=1){
                
                if(allInactiveMines.length <= 1){
                    path = this.pathfind(board,this.position, target.position);
                }else{
                    const movable = board.obtain(Mine).filter(m=>m.active == false)
                    for (let i = 0; i < movable.length; i++) {
                        path = this.pathfind(board, this.position,board.obtain(Mine).filter(m=>m.active == false)[i].position);
                        if(path.length >= 1) break;
                    }

                    if(path.length <= 0){ 
                        path = this.pathfind(board,this.position, target.position);
                    }
                }
            }else{
                console.log("Hunt player");
                path = this.pathfind(board,this.position, target.position)
            }
            if(path.length > 1){
                
                this.move(board, path[1]);
            }
        }
        

    }

    /**
     * Obtain a random number from 0 to `max`
     * @param {number} max 
     * @returns 
     */
    random(max){
        return Math.floor(Math.random() * max)
    }

    /**
     * Kill the movable object
     * @param {Board} board 
     */
    kill(board){
        board.getGrid(this.position).entities = board.getGrid(this.position).entities.filter(e=>(e instanceof Robot) == false);
        this.alive = false;
    }
}

class Player extends Movable{
    constructor(x,y){
        super(x,y);
        this.name = "Player"
        this.identifier = "u"
        this.destroyable = false;
        this.image = './images/PlayerShip.png';
    }

    /**
     * Move entity to given location.
     * @param {Board} board 
     * @param {Coordinates} coordinates
     */
    move(board,coordinates){
        //Stop movement to a non-joinable tile.
        if(coordinates.x < 0 || coordinates.x >= board.size.width) return;
        if(coordinates.y < 0 || coordinates.y >= board.size.height) return;
        if(board.getGrid(coordinates).entities.some(e=>e.joinable == false)) return;

        board.getGrid(this.position).remove(this);
        board.getGrid(coordinates).add(this);
        this.position = coordinates;

        //Active all mines the user has stood on
        board.getGrid(coordinates).find(Mine).forEach(m=>m.activate());

        //Kill the player if they step on a robot
        const robots = board.getGrid(coordinates).find(Robot)
        if(robots.length > 0){
            this.kill(board);
        }
    }


    /**
     * @param {Board} board 
     */
    kill(board){
        //Remove player from grid
        board.getGrid(this.position).entities = board.getGrid(this.position).entities.filter(e=>(e instanceof Player) == false);
        board.stage = 3;
        this.alive = false;
    }
}

class Tile{
    constructor(x,y){
        /**@type {Entity[]} */ 
        this.entities = new Array()
        this.position = {
            x:x,
            y:y
        }
    }

    /**
     * Spawn enity on tile, removing any existing entities on that tile
     * @param {Entiy[]} entity 
     * @returns 
     */
    spawn(entity){
        this.entities = new Array();
        this.entities.push(entity)
        return this;
    }

    /**
     * Add entity on tile, along with existing entities
     * @param {Entiy} entity 
     * @returns 
     */
    add(entity){
        this.entities.push(entity);
        return this;
    }

    /**
     * Remove an enetiy from the tile
     * @param {Entity} entity 
     * @returns 
     */
    remove(entity){
        this.entities = this.entities.filter(e=>e.identifier != entity.identifier)
        return this;
    }

    /**
     * Check if the tile contains a given entity
     * @param {Entity} entity 
     * @returns 
     */
    contains(entity){
        return this.entities.some(e=>e instanceof entity);
    }

    /**
     * Find all entities that is an instance of passed parameter
     * @param {Entity} entity 
     * @returns {Entity[]}
     */
    find(entity){
        return this.entities.filter(e=>e instanceof entity)
    }

    /**
     * Remove any inactive mines on tile
     */
    disarm(){
        this.entities = this.entities.filter(e=>(e instanceof Mine) == false)
    }

}

class Board{
    constructor(width=10,height=10){
        this.size = {
            width:width,
            height:height
        };
        /**@type {Tile[][]} */ 
        this.tiles = new Array()
        this.round = 1;
        this.stage = 0;
        this.winner = -1;
        this.winReason = "";
        this.draw();
    }

    /**
     * Obtain the specific entities on the board.
     * @returns {Entity}
     */
    obtain(entity){
        var obtained = new Array();
        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                const coordinates = {x:x,y:y};
                obtained = obtained.concat(this.getGrid(coordinates).entities.filter(e=> e instanceof entity));
            }
        }
        return obtained;
    }

    /**
     * Create the initial grid of Tiles
     */
    draw(){
        //Populate the grid array with empty tiles
        for (let x = 0; x < this.size.width; x++) {
            this.tiles.push(new Array())
            for (let y = 0; y < this.size.height; y++) {
                this.tiles[x].push(new Tile(x,y))
            }
        }
    }
    
    /**
     * Return gird at a given index.
     * @param {Coordinates} coordinates
     * @returns {Tile}
     */
    getGrid(coordinates){
        return this.tiles[coordinates.x][coordinates.y];
    }

    /**
     * Check if an end state has been reached
     * `True` = end found
     * @returns {Boolean}
     */
    checkEnd(){
        /**@type {Player[]} */
        const players = this.obtain(Player)
        /**@type {Robot[]} */
        const robots = this.obtain(Robot)
        const inactive = this.obtain(Mine).filter(m=>m.active == false)

        //Check if players are alive
        if(players.filter(p=>p.alive == true) <= 0){
            this.winReason = "The player has been caught."
            return true;
        }

        //Check if robots are alive
        if(robots.length <= 0){
            this.winReason = "All robots have been destroyed.";
            return true
        }

        //Check there are inactive mines on the board
        if(inactive.length <= 0){
            this.winReason = "All inactive mines have been activated."
            return true;
        }
            

        //Check the player can pathfind to a mine, finding the shortest path
        var canGetMine = false; 
        for (const player of players) {
            for (const mine of inactive) {
                const path = (player.pathfind(this, player.position, mine.position));
                if(path.length >= 1){
                    canGetMine = true;
                }
            }
        }
        if(canGetMine == false) {
            //Player is "stuck" meaning a mine is inaccessible to the player and cannot be ended
            this.winReason = "Player has become stuck, inactive mine inaccessible."
            return true;
        }
        
        //Check there is at least one robot that is not "stuck" (in can destroy the player) 
        var canGetPlayer = false;
        for (const robot of robots) {
            for (const player of players) {
                if(robot.pathfind(this, robot.position, player.position).length >= 1){
                    canGetPlayer = true;
                }
            }
        }
        if(canGetPlayer == false) {       
            this.winReason = "Robots have become stuck."
            return true;
        }
        return false;
    }


    /**
     * Find the winner of the game
     * @returns {void}
     */
    findWinner(){

        if(this.checkEnd() == false) return; //Ignore functions if we havent ended the game

        //Generate the corretc outcome to the game
        const players = this.obtain(Player).filter(p=>p.alive == true).length
        const robots = this.obtain(Robot).length

        if(players >= 1 && robots <=0){
            this.winner = 0;
        }else if(players <=0 && robots >= 1){
            this.winner = 1;
        }else{
            this.winner = 2;
        }
    }
    

    //#region Debugging (None of this code has anything to do with the assignment, for testing purposes only)
        /**
         * Create a random game with set amount of entities
         * @param {Number} asteroids 
         * @param {Number} robots 
         * @param {Number} mines 
         * @param {Number} players 
         */
        generate(asteroids, robots, mines, players){
            const sum = asteroids + robots + mines + players
            if(sum > this.size.height * this.size.width) return;
            
            for (let i = 0; i < players; i++) {   
                this.randomPlace(new Player())
            }

            for (let i = 0; i < mines; i++) {   
                this.randomPlace(new Mine())
            }

            for (let i = 0; i < asteroids; i++) {   
                this.randomPlace(new Asteroid())
            }

            for (let i = 0; i < robots; i++) {   
                this.randomPlace(new Robot())
            }
        }

        /**
         * Spawn an enity in a random position on the board
         * @param {Entity} entity 
         */
        randomPlace(entity){
            do{
                var placed = false
                const position = {
                    x:Math.floor(Math.random() * this.size.width),
                    y:Math.floor(Math.random() * this.size.height)
                };

                if(this.getGrid(position).entities.length <= 0){
                    entity.position = position;
                    this.getGrid(position).spawn(entity)
                    placed = true
                }
            } while (placed == false); 
        }

        /**
         * Display grid as a string
         * @returns {String}
         */
        toString(){
            var output = ""
            for (let y = 0; y < this.size.height; y++) {
                for (let x = 0; x < this.size.width; x++) {
                    var identifier = this.tiles[x][y].entities.map(e => e.identifier).toString().replace(",","");
                    if(identifier == ""){
                        output +="#";
                    }else{
                        output += identifier
                    }
                    output += " "
                }        
                output += "\n"    
            }
            return output
        }

        /**
         * `Console.log()` grid as a string
         * @returns {void}
         */
        log(){
            console.log(this.toString())
        }
    //#endregion
}

class SpaceGame extends Board{
    constructor(width=10,height=10){
        super(width, height);
        this.table = null
        this.index = null;
        this.setup();
    }

    setup(){
        //Draw the table with the corretc amount of cells
        const tbl = document.getElementById('game_board');
        this.table = tbl;
        for (let x = 0; x < this.size.width; x++) {
            const row = document.createElement("tr");
            row.id = `row${x}`;
            tbl.appendChild(row)
            for (let y = 0; y < this.size.height; y++) {
                tbl.insertr
                const cell = document.createElement("td");
                cell.textContent = ""
                row.appendChild(cell);
                console.log("Added");
            }
        }
    }

    getTable(){
        return this.table;
    }

    /**
     * @param {Coordinates} coordinate 
     */
    select(coordinate){
        this.index = coordinate
    }

    /**
     * 
     * @returns {Tile}
     */
    selected(){
        return this.getGrid(this.index);
    }

    refresh(){

        //Update the board the table to match what we have stored in our array
        const imgSize = 35;
        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                this.table.rows[y].cells[x].textContent = "";
                const entities = this.getGrid({x:x,y:y}).entities
                for (const entity of entities) {
                    if(entity instanceof Mine && entity.active == true){
                        this.table.rows[y].cells[x].innerHTML +=`<img src='${entity.activeImage}' style='width:${imgSize/entities.length}px;height:${imgSize/entities.length}px;'/>`;
                    }else{
                        this.table.rows[y].cells[x].innerHTML +=`<img src='${entity.image}' style='width:${imgSize  /entities.length}px;height:${imgSize/entities.length}px;'/>`;
                    }
                    //this.table.rows[y].cells[x].textContent += entity.identifier;

                }
            }
        }
    }
    /**
     * @param {Coordinates} coordinate 
     */
    deselect(coordinate){
        this.index = null;
        this.table.rows[coordinate.y].cells[coordinate.x].style.background = "transparent";
    }

    showWinner(){
        // Get the modal
        const alert = document.getElementById("alert");
        // Get the <span> element that closes the modal
        const span = document.getElementById("alert_close");
        const play = document.getElementById("play_again");
        const alertTitle = document.getElementById("alert_title")
        const alertMessage = document.getElementById("alert_message")

        switch (this.winner) {
            case 0:
                alertTitle.textContent = "Winner"
                alertMessage.textContent = "You have managed to destory all of the robots, good job!!. "
                break;
            case 1:
                alertTitle.textContent = "Loser"
                alertMessage.textContent = "Uh oh, the computers have caught and destroyed you. "
                break;
            case 2:
                alertTitle.textContent = "Draw?!?!?"
                alertMessage.textContent = "The game has ended in a draw, guess youre not better than the robots but equal. " + this.winReason;
                break;
        }

        const stage = document.getElementById("stage")
        stage.value = "Play Again"
        this.stage = 2;
        play.onclick = function(){
            document.location.reload();
        }
        span.onclick = function() {
            alert.style.display = "none";
        }
        alert.style.display = "block"
        window.onclick = function(event) {
            if (event.target == alert) {
                alert.style.display = "none";
            }
        } 
    }

    message(message){
        const content = document.getElementById("message_info")
        content.textContent = message;
    }
    
    messageClear(){
        const content = document.getElementById("message_info")
        content.innerHTML = "";    
    }
}



window.onload = function(){
    console.log("Hello world");
    //Create game
    const game = new SpaceGame();

    //Event when the table has been clicked
    game.getTable().addEventListener("click", function(e) {
        if(game.stage > 0) return; //Incorrect stage
        const cell = e.target.closest("td");

        //Get the selected cell and highlight the cell
        if(cell == null) return;
        //Update current selected tile
        const index = {
            x:cell.cellIndex,
            y:cell.parentElement.rowIndex
        }
        if(game.index != null) this.rows[game.index.y].cells[game.index.x].style.background = "transparent"; //Remove previously slected highlight
        game.select(index); //Select tile
        cell.style.background = "rgba(255, 255, 255, 0.5)"; //Highlight slected tile
    });

    document.getElementById("stage").addEventListener("click", function(e){

        if(game.stage == 0){
            if(game.obtain(Player).length > 0){
                game.messageClear();
                document.getElementById("stage").value = `End 'Play Stage'` 
                game.stage++;
                game.deselect(game.selected().position);

                game.findWinner();
                if(game.winner > -1){
                    game.showWinner();
                }
            }else{
                game.message("The game must include a player ship to end the 'Setup' stage, you can do this with 'u.'")
            }
        }else if(game.stage == 1){
            game.winReason = "You have ended the game early";
            game.winner = 2;
            game.stage = 2;
            game.showWinner();
        }else{
            document.location.reload();
        }
    })

    document.addEventListener('keydown', function(e) {
        if(game.stage == 0){
            //-----------Setup stage------------------
            if(game.index == null) return; //Check the user has slected a tile on the grid
            game.messageClear(); //Clear error messages
            switch (e.key) {

                case "a":
                    const asteroid = new Asteroid(game.index.x, game.index.y)
                    game.selected().spawn(asteroid);
                    break;
                case "m":
                    const mine = new Mine(game.index.x, game.index.y)
                    game.selected().spawn(mine);
                    break;
                case "M":
                    const activeMine = new Mine(game.index.x, game.index.y).activate()
                    game.selected().spawn(activeMine);
                    break;
                case "r":
                    const robot = new Robot(game.index.x, game.index.y)
                    game.selected().spawn(robot);
                    break;
                case "u":
                    const players = game.obtain(Player)
                    if(players.length >= 1)game.getGrid(players[0].position).remove(players[0]);
                    const player = new Player(game.index.x, game.index.y)
                    game.selected().spawn(player);
                    break;
                case "Backspace":
                    game.selected().entities = new Array(); 
                    break
                default:
                    game.message(`Invalid key '${e.key}', please select a key that includes 'a,m,r,u'`);

            }

        }else if(game.stage == 1){   
            //------------------Play Stage---------------------
            /**@type {Player} */
            const player = game.obtain(Player)[0] //Get the current player on the board
            var allowedMove = true; //Check for invalid key presses and update round to match
            switch (e.key) {
                case "w":
                    //Move forward
                    player.move(game, {x:player.position.x, y:player.position.y - 1})
                    break;
                case "a":
                    //Move left
                    player.move(game, {x:player.position.x -1, y:player.position.y})
                    break;
                case "s":
                    //Move back
                    player.move(game, {x:player.position.x, y:player.position.y + 1})
                    break;
                case "d":
                    //Move right
                    player.move(game, {x:player.position.x + 1, y:player.position.y})
                    break;
                default:
                    allowedMove = false;
                    game.message(`Invalid key '${e.key}', please select a key that includes 'a,m,r,u'`);
                    break;
            }
            if(allowedMove == false) return;
            game.round++;
            

            //Start robot AI to hunt player
            /**@type {Robot[]} */
            const robots = game.obtain(Robot)
            for (const robot of robots) {
                if(robot.alive == true){
                    robot.hunt(game,player)
                }
            }

            game.findWinner();
            if(game.winner > -1){
                game.showWinner();
            }
        }

        game.refresh(); //Update the html tbale
        const inactiveMines = game.obtain(Mine).filter(m=> m.active == false).length
        const robots = game.obtain(Robot).length
        //Update the game stats
        document.getElementById("round_value").textContent = game.round;
        document.getElementById("inactive_value").textContent = inactiveMines;
        document.getElementById("robot_value").textContent = robots;


    });
    
}

//#region Debugging
function scenario_next_to_player(){
    const test = new Board()
    test.getGrid({x:0,y:0}).spawn(new Robot(0,0))
    test.getGrid({x:6,y:0}).spawn(new Player(6,0))
    test.log();
    return test;
}
function scenario_next_to_mine(){
    const test = new Board()
    const jeff = new Robot(0,0);
    test.getGrid({x:0,y:0}).spawn(jeff)
    test.getGrid({x:1,y:0}).spawn(new Mine(1,0))
    test.getGrid({x:2,y:2}).spawn(new Asteroid(2,2))

    const bob = new Mine(2,0)
    bob.activate()
    test.getGrid({x:2,y:0}).spawn(bob)
    test.log();

    return test;
}
function scenario_stuck(){
    const test = new SpaceGame();
    const bob = new Player(3,3)
    const surrounding = bob.scan(test);
    test.getGrid({x:3,y:3}).spawn(bob)
    surrounding.forEach(element => {
        element.spawn(new Asteroid(element.position.x, element.position.y))
    });
    test.getGrid({x:0,y:0}).spawn(new Robot(0,0))
    test.getGrid({x:1,y:1}).spawn(new Mine(1,1))


    return test;
}
//#endregion