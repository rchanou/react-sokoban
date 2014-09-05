/** @jsx React.DOM */

// TODO: Refactor player and box to own React components?

var Game = React.createClass({
    getInitialState: function(){
        return {
            currentLevel: null,
            levels: [{ initialPlayer: {x:0, y: 0}, initialBoxList:[], initialTargetList: [], initialWallList: [] }]
        };
    },
    loadLevel: function(level){ // convert level map to Level React component
        return <Level initialPlayer={{x: parseInt(level.initialPlayer.x), y: parseInt(level.initialPlayer.y) }}
            initialBoxList={level.initialBoxList}
            initialTargetList={level.initialTargetList}
            initialWallList={level.initialWallList}
            key={level._id} _id={level._id} preview={level.preview} scale={level.scale}
            onLevelSave={this.handleLevelSave} onPreviewClick={this.handlePreviewClick} />;
    },
    render: function(){
        var headStyle = {fontSize: 50, color: 'hsl(0,0%,20%)', textAlign: 'center', padding: 0, overflow: 'hidden' };
        var subHeadStyle = $.extend({}, headStyle, {fontSize: 20});


        var navStyle = {
            backgroundColor: 'hsl(110,50%,85%)',
            width: '100%',
            fontSize: '20px', 
            cursor: 'pointer',
            display: 'inline-block',
            padding: '5px',
            overflow: 'hidden'
        }

        var navButtonStyle = $.extend({}, navStyle, { display: 'inline-block' });
        //navButtonStyle.float = 'left';

        var main;
        if (this.state.currentLevel == null){
            previews = $.extend(true, [], this.state.levels).map(function(level, i){
                level.preview = true;
                level.scale = 20;
                return this.loadLevel(level);
            }.bind(this));
            main = <div ref='preview'>{previews}</div>;
        } else {
            main = this.loadLevel(this.state.levels[this.state.currentLevel]);
        }

        return (
            <div>
                <div style={navStyle}>
                    <h1 style={headStyle}>React Sokoban!</h1>
                    <h4 style={subHeadStyle}>Puzzles by <a href='http://www.onlinespiele-sammlung.de/sokoban/sokobangames/skinner/'>David W. Skinner</a></h4>
                </div><br/>
                <div style={{textAlign: 'center'}}>
                    {this.state.currentLevel == null? '':<button className='nav-button' onClick={this.handleChooseClick}>Choose a Level</button>}
                    <button className='nav-button' onClick={this.createLevel}>Create a New Level</button>
                </div>
                <br/>
                <div style={{display:'inline-block'}}>
                    {this.state.currentLevel == null?'':<h3>Level {this.state.currentLevel + 1}</h3>}
                    {main}
                </div>
            </div>
        );
    },
    componentWillMount: function(){
        $.ajax({
            url: '/levels',
            dataType: 'json',
            success: function(resp){
                this.setState({ levels: resp });
            }.bind(this)
        });
    },
    componentDidMount: function(){
        /*if (this.refs.preview){
            $(window).resize(function(){
                $(this.refs.preview.getDOMNode()).width($(window).width() - 100);                
            }.bind(this));
        }*/
    },
    prevLevel: function(){
        this.setState({ currentLevel: this.state.currentLevel - 1 });
    },
    nextLevel: function(){
        this.setState({ currentLevel: this.state.currentLevel + 1 });
    },
    createLevel: function(){
        var body = {
            _id: '000000000000',
            level: {
                initialPlayer: { x:3, y: 3}, initialBoxList: [], initialTargetList: [], initialWallList: []
            }
        };
        $.ajax({
            url: '/level',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify(body),
            success: function(resp){
                var newLevelIndex = resp.length - 1;
                this.setState({ currentLevel: newLevelIndex, levels: resp });
            }.bind(this),
            error: function(xhr, status, err){
                console.log(err);
            }
        });
    },
    handleLevelSave: function(levels){
        var newLevelIndex = this.state.currentLevel;
        if (newLevelIndex >= levels.length){
            newLevelIndex = levels.length - 1;
        }
        this.setState({ currentLevel: newLevelIndex, levels: levels });
    },
    handleChooseClick: function(){
        this.setState({ currentLevel: null });
    },
    handlePreviewClick: function(e){
        var chosenLevel = _.chain(this.state.levels).pluck('_id').indexOf(e._id).value();
        this.setState({ currentLevel: chosenLevel });
    }
});



var Level = React.createClass({
    prevStates: [], // array of past states to allow Undo
    animHandle: null, // handler for requestAnimationFrame
    getDefaultProps: function(){
        return {
            initialWallList: [{x:0,y:0},{x:3,y:3},{x:0,y:2}], // sample/test value
            initialTargetList: [{x:1,y:2}], // sample/test value
            initialBoxList: [{x:1,y:1}], // sample/test value
            initialPlayer: {x:2,y:2}, // sample/test value
            scale: 40,
            stepSize: 6,
            _id: '000000000000',
            preview: false,
            onLevelSave: function(){}, onPreviewClick: function(){}
        };
    },
    getInitialState: function(){
        return {
            player: $.extend({}, this.props.initialPlayer), // clone object to avoid changing initial props
            wallList: $.extend(true, [], this.props.initialWallList),
            targetList: $.extend(true, [], this.props.initialTargetList),
            boxList: $.extend(true, [], this.props.initialBoxList), // deep clone array of objects to avoid changing initial props
            moves: 0,
            editMode: (this.props.initialTargetList.length == 0 || this.props.initialTargetList.length > this.props.initialBoxList.length)
        }; 
    },
    getVictoryStatus: function(){ // true when there is a box at every target
        return !this.state.editMode && this.checkValidLevel() && _.every(this.state.targetList, function(target){
            return (typeof _.findWhere(this.state.boxList, target) !== 'undefined');           
        }.bind(this));
    },
    render: function(){
        var k = this.props.scale;


        // create edit grid if edit mode
        var editGrid = [];
        if (this.state.editMode){
            for (var i = 0; i < 20; i ++){
                for (var j = 0; j < 20; j++){
                    editGrid.push(<EditSector x={i} y={j} scale={k} key={'edit.'+i+'.'+j}
                        onEditSectorClick={this.handleEditSectorClick} onEditSectorRightClick={this.handleEditSectorRightClick} />);
                }
            }
        }

        // create all game object elements
        var walls = this.state.wallList.map(function(wall, i){
            return <rect x={wall.x*k} y={wall.y*k} width={k} height={k} fill='silver' stroke='grey' key={'wall-'+i} />;        
        });
        var boxes = this.state.boxList.map(function(box, i){
            var hue;
            var className;
            if (this.getVictoryStatus()){
                hue = 100; // green
                className = 'on-target';
            } else if (typeof _.findWhere(this.state.targetList, box) !== 'undefined'){
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
        var targets = this.state.targetList.map(function(target, i){
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
        var allObjects = this.state.wallList.concat(this.state.boxList.concat(this.state.targetList));
        allObjects.push(this.state.player);        
        var maxX = (this.state.editMode? 20: (Math.max.apply(null, _.pluck(allObjects, 'x')) + 1));
        var maxY = (this.state.editMode? 20: (Math.max.apply(null, _.pluck(allObjects, 'y')) + 1));
    
        // if preview, only render map and make entire svg clickable
        if (this.props.preview){
            return <svg width={maxX*k} height={maxY*k} style={{borderColor: 'grey', borderWidth: 2}} onClick={this.handlePreviewClick} className='preview'>
                    {walls}{targets}{boxes}{player}                   
                </svg>;
        }

        // render all the things!
        return (
            <div width='100%' style={{textAlign: 'center'}}>
                {this.state.editMode?
                <span>
                    Left-click to change tile. Right-click to place player.
                    <button onClick={this.handleSaveClick}>Save Level</button>
                    {this.props._id == '000000000000'? '': <button onClick={this.handleDeleteClick}>Delete Level</button>}
                </span>
                :<span>Moves: {this.state.moves}<br/>
                    <button onClick={this.handleUndoClick} disabled={this.prevStates.length == 0 || this.state.moves == 0}>Undo</button>
                    <button onClick={this.handleResetClick} disabled={this.state.moves == 0}>Reset</button>
                </span>}
                <button onClick={this.handleEditClick} disabled={!this.checkValidLevel()} >{this.state.editMode? 'Exit Edit Mode': 'Edit Level!'}</button>
                <br/>
                <svg width={maxX*k} height={maxY*k}>
                    {walls}{targets}{boxes}{player}{editGrid}                    
                </svg><br/>
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
            if (this.props.preview || this.getVictoryStatus() || this.animHandle != null){
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
    checkValidLevel: function(){
        return this.state.targetList.length > 0 && this.state.boxList.length >= this.state.targetList.length;
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
    checkEditsMade: function(){
        return this.state.editMode && !_.isEqual(_.omit(this.state, 'editMode'), _.omit(this.getInitialState(), 'editMode'));
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
        var editState = $.extend(true, {}, this.state);
        if (editState.editMode){
            var confirmContinue = false;
            if (this.checkEditsMade()){
                confirmContinue = confirm('Changes were not saved. Are you sure you want to exit?');
            } else {
                confirmContinue = true;
            }
            if (confirmContinue){
                this.setState(this.getInitialState());
            }
            /*if (saveConfirmed){
                this.setState(editState, function(){
                        this.handleSaveClick();
                }.bind(this));
            } else {
                this.setState(this.getInitialState());
            }*/
        } else {
            editState = $.extend(true, {}, this.getInitialState());
            editState.editMode = !editState.editMode;
            this.setState(editState);
        }
    },
    handleEditSectorClick: function(e){
        var self = this;
        var newBoxList = $.extend(true, [], this.state.boxList);
        var newWallList = $.extend(true, [], this.state.wallList);
        var newTargetList = $.extend(true, [], this.state.targetList);

        if (typeof _.findWhere(newWallList, e) != 'undefined'){
            newWallList = _.reject(
                newWallList,
                function(wall){
                    return (wall.x==e.x && wall.y==e.y);
                }
            );
            newBoxList.push(e);
            this.setState({ boxList: newBoxList, wallList: newWallList });
        } else if (typeof _.findWhere(newBoxList, e) != 'undefined'){
            if (typeof _.findWhere(newTargetList, e) == 'undefined'){
                newTargetList.push(e);
                this.setState({ targetList: newTargetList });
            } else {
                newBoxList = _.reject(
                    newBoxList,
                    function(box){
                        return (box.x==e.x && box.y==e.y);
                    }
                );
                this.setState({ boxList: newBoxList });
            }
        } else if (typeof _.findWhere(newTargetList, e) != 'undefined'){            
            newTargetList = _.reject(
                newTargetList,
                function(target){
                    return (target.x==e.x && target.y==e.y);
                }
            );
            this.setState({ targetList: newTargetList });
        } else {
            newWallList.push(e);
            this.setState({ wallList: newWallList });
        }
    },
    handleEditSectorRightClick: function(e){
        this.setState({player: e });
    },
    handleSaveClick: function(){
        var body = {
            _id: this.props._id,
            level: {
                initialPlayer: this.state.player,
                initialBoxList: this.state.boxList,
                initialTargetList: this.state.targetList,
                initialWallList: this.state.wallList
            }
        };
        $.ajax({
            url: '/level',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify(body),
            success: function(resp){
                this.props.onLevelSave(resp);
            }.bind(this),
            error: function(xhr, status, err){
                console.log(err);
            }
        });
    },
    handleDeleteClick: function(){
        if (!confirm('Deleting this level is permanent. Click "OK" to continue deletion.')){
            return;
        }

        $.ajax({
            url: '/level/delete',
            contentType: 'application/json',
            type: 'POST',
            data: JSON.stringify({ _id: this.props._id }),
            success: function(resp){
                this.props.onLevelSave(resp);
            }.bind(this),
            error: function(xhr, status, err){
                console.log(err);
            }
        });
    },
    handlePreviewClick: function(){
        this.props.onPreviewClick({ _id: this.props._id });
    }
});

var EditSector = React.createClass({
    getDefaultProps: function(){
        return { onEditSectorClick: function(){}, onEditSectorRightClick: function(){} };
    },
    render: function(){
        var k = this.props.scale;
        return <rect x={this.props.x*k} y={this.props.y*k} width={k} height={k} key={'edit.'+this.props.x+'.'+this.props.y} stroke='grey' fillOpacity={0} className='edit'
                onClick={this.handleClick} onContextMenu={this.handleContextMenu} />;
    },
    handleClick: function(){
        this.props.onEditSectorClick({ x: this.props.x, y: this.props.y });
    },
    handleContextMenu: function(e){
        this.props.onEditSectorRightClick({ x: this.props.x, y: this.props.y });
        return false;
    }
});

React.renderComponent(<Game />, document.getElementById('app'));


