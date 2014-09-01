/** @jsx React.DOM */

// TODO: Refactor player and box to own React components?

var Game = React.createClass({
    getDefaultProps: function(){
        return { levelMaps: [
            [' xxxxxx ',
             ' x   px ',
             ' x b  x ',
             ' x   tx ',
             ' xxxxxx '],
             
            [' xxxx   ',
             ' x tx   ',
             ' x  xxx ',
             ' x p  x ',
             ' x* b x ',
             ' x  xxx ',
             ' x  x   ',
             ' xxxx   '],
             
            [' xxxxxxxx   ',
             ' x p x  x   ',
             ' x      x   ',
             ' x      x   ',
             ' xxxxxb x   ',
             '     x  xxx ',
             '     xb ttx ',
             '     x  xxx ',
             '     xxxx   ']
        ]};
    },
    getInitialState: function(){
        return { currentLevel: 0 };
    },
    loadCurrentLevel: function(){ // convert level map to Level React component
        var props = { initialWallList: [], targetList: [], initialBoxList: [], initialPlayer: {}, key: this.state.currentLevel };
        var currentLevelMap = this.props.levelMaps[this.state.currentLevel];
        currentLevelMap.forEach(function(rowString, i){
            for (var j = 0; j < rowString.length; j++){
                switch (rowString[j].toLowerCase()){
                    case 'p': { // player
                        props.initialPlayer = { y: i, x: j };
                        break;
                    }
                    case 't': { // target
                        props.targetList.push({y: i, x: j});
                        break;
                    }
                    case 'b': { // box
                        props.initialBoxList.push({y: i, x: j});
                        break;
                    }
                    case 'x': case 'w': { // wall
                        props.initialWallList.push({y: i, x: j});
                        break;
                    }
                    case '*': { // both target and box on same spot
                        props.targetList.push({y: i, x: j});
                        props.initialBoxList.push({y: i, x: j});
                    }                    
                }
            }
        });
        return Level(props);
    },
    render: function(){
        return (
            <div>
                <div>(All puzzles except the first are by David Skinner)</div>
                <h3>Level {this.state.currentLevel + 1}</h3>
                <button onClick={this.prevLevel} disabled={this.state.currentLevel <= 0}>Previous Level</button>
                <button onClick={this.nextLevel} disabled={this.state.currentLevel >= this.props.levelMaps.length - 1}>Next Level</button>
                {this.loadCurrentLevel()}
            </div>
        );
    },
    prevLevel: function(){
        this.setState({ currentLevel: this.state.currentLevel - 1 });
    },
    nextLevel: function(){
        this.setState({ currentLevel: this.state.currentLevel + 1 });
    }
});

var Level = React.createClass({
    prevStates: [], // array of past states to allow Undo
    animHandle: null, // handler for requestAnimationFrame
    getDefaultProps: function(){
        return {
            wallList: [{x:0,y:0},{x:3,y:3},{x:0,y:2}], // sample/test value
            targetList: [{x:1,y:2}], // sample/test value
            initialBoxList: [{x:1,y:1}], // sample/test value
            initialPlayer: {x:2,y:2}, // sample/test value
            scale: 40,
            stepSize: 6,
            levelId: null
        };
    },
    getInitialState: function(){
        return {
            player: $.extend({}, this.props.initialPlayer), // clone object to avoid changing initial props
            wallList: $.extend(true, [], this.props.initialWallList),
            boxList: $.extend(true, [], this.props.initialBoxList), // deep clone array of objects to avoid changing initial props
            moves: 0,
            editMode: false
        }; 
    },
    getVictoryStatus: function(){ // true when there is a box at every target
        return _.every(this.props.targetList, function(target){
            return (typeof _.findWhere(this.state.boxList, target) !== 'undefined');           
        }.bind(this));
    },
    render: function(){
        var k = this.props.scale;
        var editGrid = [];
        if (this.state.editMode){
            for (var i = 0; i < 20; i ++){
                for (var j = 0; j < 20; j++){
                    editGrid.push(<EditSector x={i} y={j} scale={k} key={'edit.'+i+'.'+j} onEditSectorClick={this.handleEditSectorClick} />);
                }
            }
        }

        var walls = this.state.wallList.map(function(wall, i){
            return <rect x={wall.x*k} y={wall.y*k} width={k} height={k} fill='silver' stroke='grey' key={'wall-'+i} />;        
        });
        var boxes = this.state.boxList.map(function(box, i){
            var hue;
            var className;
            if (this.getVictoryStatus()){
                hue = 100; // green
                className = 'on-target';
            } else if (typeof _.findWhere(this.props.targetList, box) !== 'undefined'){
                hue = 200; // blue
                className = 'on-target';
            } else {
                hue = 60; // yellow
                className = '';
            }
            return <rect x={box.x*k} y={box.y*k} width={k} height={k} fill={'hsl('+hue+',70%,50%)'}
                       stroke={'hsl('+hue+',50%,25%)'} className={className}
                       key={'box-'+i} ref={'x'+box.x+'y'+box.y} />;        
        }.bind(this));
        var targets = this.props.targetList.map(function(target, i){
            return <circle cx={(target.x+0.5)*k} cy={(target.y+0.5)*k} r={k/4} fill='cornFlowerBlue' key={'target-'+i} />;        
        });
        var player = (<g>
            <circle cx={(this.state.player.x+0.5)*k} cy={(this.state.player.y+0.5)*k} r={k/2} data-shape-set='player'
                fill='yellow' stroke='black' strokeWidth={2} className='player'
                ref={'x' + this.state.player.x + 'y'+this.state.player.y} />
            <circle cx={(this.state.player.x+0.5)*k} cy={(this.state.player.y+0.5)*k} r={k/8} 
                fill='black' transform={'translate(' + (-0.25)*k + ',' + (-0.125)*k + ')'} data-shape-set='player' />
            <circle cx={(this.state.player.x+0.5)*k} cy={(this.state.player.y+0.5)*k} r={k/8} 
                fill='black' transform={'translate(' + (0.25)*k + ',' + (-0.125)*k + ')'} data-shape-set='player' />
        </g>);
        
        // get svg dimensions that will fit all objects
        var allObjects = this.state.wallList.concat(this.state.boxList.concat(this.props.targetList));
        allObjects.push(this.state.player);        
        var maxX = (this.state.editMode? 20: (Math.max.apply(null, _.pluck(allObjects, 'x')) + 1));
        var maxY = (this.state.editMode? 20: (Math.max.apply(null, _.pluck(allObjects, 'y')) + 1));
        
        // time to render!
        return (
            <div>
                <svg width={maxX*k} height={maxY*k}>
                    {walls}{targets}{boxes}{player}{editGrid}                    
                </svg><br/>
                {this.state.editMode?
                <select onChange={this.handleEditSelect} ref='edit'>
                    <option value='Wall'>Wall</option>
                    <option value='Box'>Box</option>
                    <option value='Target'>Target</option>
                    <option value='Player'>Player</option>
                </select>
                :<span>Moves: {this.state.moves}
                    <button onClick={this.handleUndoClick} disabled={this.prevStates.length == 0 || this.state.moves == 0}>Undo</button>
                    <button onClick={this.handleResetClick} disabled={this.state.moves == 0}>Reset</button>
                </span>}
                <button onClick={this.handleEditClick}>{this.state.editMode? 'Exit Edit Mode': 'Edit Level!'}</button>
                <h2 style={{color: 'RoyalBlue'}}>{this.getVictoryStatus()? 'Victory!': ''}</h2>
            </div>
        );
    },
    componentWillMount: function(){
        this.prevStates = [];
    },
    componentDidMount: function(){
        document.onkeydown = function(e){
            // ignore key presses if level was won or animation is running
            if (this.getVictoryStatus() || this.animHandle != null){
                return;
            }
            
            var key = (window.event) ? event.keyCode : e.keyCode;
            switch (key){
                case 37: { // left
                    this.moveAndUpdateState('x', -1);
                    break;
                }
                case 38: { // up
                    this.moveAndUpdateState('y', -1);
                    break;
                }
                case 39: { // right
                    this.moveAndUpdateState('x', +1);
                    break;
                }
                case 40: { // down
                    this.moveAndUpdateState('y', +1);
                    break;
                }                    
            }
        }.bind(this);
    },
    moveAndUpdateState: function(axis, dir){
        if (this.state.editMode){
            return;
        }

        if (!this.canMove(this.state.player, axis, dir)){
            return;
        }
        
        // add current state to prevStates array
        this.prevStates.push($.extend(true, {}, this.state));
        if (this.prevStates.length > 100){
            this.prevStates.shift();
        }
        
        // construct the next state
        var nextState = $.extend(true, {}, this.state);
        this.move(nextState.player, axis, dir, nextState);
        nextState.moves++;
        
        // animate to next state, then set it as the current state after animation completes
        this.runAnim(this.state.boxList.concat([this.state.player]), nextState.boxList.concat([nextState.player]), function(){
            this.setState(nextState);
        }.bind(this));
    },
    canMove: function(item, axis, dir){
        var nextPos = $.extend({}, item);
        nextPos[axis] += dir;
        if (typeof _.findWhere(this.state.wallList, nextPos) !== 'undefined'){ // wall in the way
            return false;
        } else if (typeof _.findWhere(this.state.boxList, nextPos) !== 'undefined'){ // box in the way
            nextPos[axis] += dir;
            return (typeof _.findWhere(this.state.boxList.concat(this.state.wallList), nextPos) === 'undefined'); // return true if nothing is in the way of the box in the way (it can be pushed)
        } else {
            return true;
        }        
    },
    move: function(item, axis, dir, state){
        var newPos = $.extend({}, item);
        newPos[axis] += dir;
        var boxInWay = _.findWhere(state.boxList, newPos);
        if (typeof boxInWay !== 'undefined'){
            this.move(boxInWay, axis, dir, state);
        }
        item[axis] += dir;
    },
    runAnim: function(startPosList, endPosList, callback){    
        var animDone = true; // assume true until proven false
        startPosList.forEach(function(startPos, i){
            // corresponding rect/circle element is found by converting the start position to a string that matches the ref assigned to the element on render (for example, 'x2y3')
            var el = $(this.refs['x' + startPos.x + 'y' + startPos.y].getDOMNode());
            var startX = parseInt(el.attr('x') || el.attr('cx'));
            var startY = parseInt(el.attr('y') || el.attr('cy'));
            
            // if element belongs to a shape set, set el to all elements in set so they move together (currently must all be same type of shape)
            var elSet = el.data('shape-set');
            if (elSet){
                el = $("[data-shape-set='" + elSet + "']");
            }
            
            if (el.prop('tagName') == 'circle'){    
                var endX = (endPosList[i].x + 0.5) * this.props.scale;
                if (startX < endX){
                    el.attr('cx', Math.min(endX, startX + this.props.stepSize));
                    animDone = false;
                }
                if (startX > endX){
                    el.attr('cx', Math.max(endX, startX - this.props.stepSize));
                    animDone = false;
                }
                var endY = (endPosList[i].y + 0.5) * this.props.scale;
                if (startY < endY){
                    el.attr('cy', Math.min(endY, startY + this.props.stepSize));
                    animDone = false;
                }
                if (startY > endY){
                    el.attr('cy', Math.max(endY, startY - this.props.stepSize));
                    animDone = false;
                }            
            } else {       
                var endX = endPosList[i].x * this.props.scale;
                if (startX < endX){
                    el.attr('x', Math.min(endX, startX + this.props.stepSize));
                    animDone = false;
                }
                if (startX > endX){
                    el.attr('x', Math.max(endX, startX - this.props.stepSize));
                    animDone = false;
                }
                var endY = endPosList[i].y * this.props.scale;
                if (startY < endY){
                    el.attr('y', Math.min(endY, startY + this.props.stepSize));
                    animDone = false;
                }
                if (startY > endY){
                    el.attr('y', Math.max(endY, startY - this.props.stepSize));
                    animDone = false;
                }
            }
        }.bind(this));
        
        if (animDone){
            cancelAnimationFrame(this.animHandle);
            this.animHandle = null;
            callback();
        } else {
            this.animHandle = requestAnimationFrame(function(){
                this.runAnim(startPosList, endPosList, callback);
            }.bind(this));
        }
    },
    handleResetClick: function(){
        this.prevStates = [];
        this.setState($.extend(true, {}, this.getInitialState()));
    },
    handleUndoClick: function(){
        this.setState($.extend(true, {}, _.last(this.prevStates)), function(){
            this.prevStates.pop();
        }.bind(this));
    },
    handleEditClick: function(){
        this.setState({ editMode: !this.state.editMode, moves: 0 });
    },
    handleEditSelect: function(e){
        this.setState({ editMode: this.refs.edit.getDOMNode().value });
    },
    handleEditSectorClick: function(e){
        console.log(e);
        var self = this;
        var newBoxList = $.extend(true, [], this.state.boxList);
        var newWallList = $.extend(true, [], this.state.wallList);
        //var newBoxList = $.extend(true, [], this.state.boxList);

        if (typeof _.findWhere(newBoxList, e) != 'undefined'){
            newBoxList = _.reject(
                newBoxList,
                function(box){
                    return (box.x==e.x && box.y==e.y);
                }
            );
            newWallList.push(e);
            this.setState({ boxList: newBoxList, wallList: newWallList });
        } else if (typeof _.findWhere(newWallList, e) != 'undefined'){
            newWallList = _.reject(
                newWallList,
                function(wall){
                    return (wall.x==e.x && wall.y==e.y);
                }
            );
            //newWallList.push({x: e.x, y: e.y });
            this.setState({ wallList: newWallList });
        } else {
            newBoxList.push(e);
            this.setState({ boxList: newBoxList });
        }
    }
});

var EditSector = React.createClass({
    getDefaultProps: function(){
        return { onEditSectorClick: function(){} };
    },
    render: function(){
        var k = this.props.scale;
        return <rect x={this.props.x*k} y={this.props.y*k} width={k} height={k} key={'edit.'+this.props.x+'.'+this.props.y} stroke='grey' fillOpacity={0}
                onClick={this.handleClick} />;
    },
    handleClick: function(){
        this.props.onEditSectorClick({ x: this.props.x, y: this.props.y });
    }
});

React.renderComponent(<Game />, document.body);


