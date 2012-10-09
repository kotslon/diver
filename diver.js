function DivingFun(containerId) {

	// CONSTANTS
	
	// Dimensions of diving fun board
	// Equal to background picture dimensions
	var DFB_WIDTH = 762;
	var DFB_HEIGHT = 685;
	var CONTAINER = document.getElementById(containerId);
	
	var FPS = 30;  // Tune up for quality, down for speed
	var STEP_INTERVAL = Math.round(1000 / FPS);
	var STEPS_IN_SECOND = 1000 / STEP_INTERVAL; 
	
	// Diving world parameters
	var DWP_DEPTH = 620; // px from top
	var DWP_BOAT_X = 625;
	var DWP_BOAT_Y = 140;
	var DWP_COMPRESSOR_SPEED = 3 * 1000 / STEPS_IN_SECOND;  // ml per step (converted from liters per second)
	var DWP_SCUBA_TANK_VOLUME = 20 * 1000;  // ml
	var DWP_DIVER_SPEED = /*20*/ 120 / STEPS_IN_SECOND;  // px per step
	var DWP_EMERSION_1ST_STOP = Math.round(DWP_BOAT_Y + 
			(DWP_DEPTH - DWP_BOAT_Y) * (1 - 1 / 3) );  // px from top
	var DWP_EMERSION_1ST_STOP_DURATION = 5 * STEPS_IN_SECOND;  // steps
	var DWP_EMERSION_2ND_STOP = Math.round(DWP_BOAT_Y + 
			(DWP_DEPTH - DWP_BOAT_Y) * (1 - 2 / 3) );  // px from top
	var DWP_EMERSION_2ND_STOP_DURATION = 10 * STEPS_IN_SECOND;  // steps
	var DWP_EMERSION_3D_STOP = Math.round(DWP_BOAT_Y + 
			(DWP_DEPTH - DWP_BOAT_Y) * (1 - 4 / 5) );  // px from top
	var DWP_EMERSION_3D_STOP_DURATION = 15 * STEPS_IN_SECOND;  // steps
	var DWP_DIVER_EMERSION_VOLUME = 50;  // ml
	var DWP_SCUBA_USE_SPEED = 50 / STEPS_IN_SECOND;  // ml per step
	var DWP_MARK_SCUBA_USE = 1 / STEPS_IN_SECOND;  //  ml per rate point per step
	var DWP_MARK_EMERSION_VOLUME = 50;  // ml per rate point
	var DWP_MARK_IMMERSION_SPEED = 80  / STEPS_IN_SECOND;  // px per step
	var DWP_DIVER_VIEW = DFB_WIDTH / 3;  // px
	
	// Pre-calculate oxygen use to have no need to do it again every step
	var DWP_SCUBA_USE = new Array(); // ml per step
	for (var rate=0; rate<=20; rate++){ 
		// 1 or 2 marks: from 1 to 10 give us max summary rate 20
		DWP_SCUBA_USE[rate] = DWP_SCUBA_USE_SPEED + DWP_MARK_SCUBA_USE * rate;
		// Not a grate optimization? Whatever... 
	}
	
	// Diver states
	var DS_STILL = 0;
	var DS_IMMERSION = 1;
	var DS_LEFT = 2;
	var DS_RIGHT = 3;
	var DS_EMERSION = 4;
	
	// Mark states
	var MS_NOT_SEEN = 0;
	var MS_SEEN = 1;
	var MS_ASSIGNED = 2;
	var MS_COLLECTED = 3;
	var MS_STORED = 4;
	
	// Radio commands
	var RC_HARVEST = 0;
	var RC_RETURN_TO_BASE = 1;
	var RC_PATROL = 2;
	
	// Sources for images
	var IMGS_PREFIX = 'images/';
	var IMGS_SRCS = {
			'mark1': IMGS_PREFIX+'tf-star1.png', 'mark2': IMGS_PREFIX+'tf-star2.png',
			'mark3': IMGS_PREFIX+'tf-star3.png', 'mark4': IMGS_PREFIX+'tf-star4.png',
			'mark5': IMGS_PREFIX+'tf-star5.png', 'mark6': IMGS_PREFIX+'tf-star6.png',
			'mark7': IMGS_PREFIX+'tf-star7.png', 'mark8': IMGS_PREFIX+'tf-star8.png',
			'mark9': IMGS_PREFIX+'tf-star9.png', 'mark10': IMGS_PREFIX+'tf-star10.png',
			'bg': IMGS_PREFIX+'back.jpg', 'diver-rope': IMGS_PREFIX+'Diver-tros.png',
			'diver-go-harvest': IMGS_PREFIX+'Diver-go-harvest.png',
			'diver-go-home': IMGS_PREFIX+'Diver-go-home.png',
			};
	var IMGS_LAYOUTS = {
			'diver-go-harvest': {'marginTop': '-60px'},
			'diver-go-home': {'marginTop': '-60px'},
			'diver-rope': {'marginTop': '-50px'},
	};
	var IMGS = {}; // We'll init it later
	// Diver's hands' delta (from diver's position), heading right, for left invert X
	var DWP_DIVER_HANDS = {
			'diver-go-harvest': { lft: {dx: -35, dy: -32}, rght: {dx: -13, dy: -7} },
			'diver-go-home': { lft: {dx: 13, dy: -7}, rght: {dx: 35, dy: -32} },
			'diver-rope': { lft: {dx: 27, dy: -18}, rght: {dx: 18, dy: -49} }
	};
	
	// States
	var STATE_LOADING = 0;
	var STATE_RUNNING = 1;
	var STATE_PAUSED = 2;
	
	// Logging levels
	var LL_DEBUG = 0;
	var LL_INFO = 1;
	var LL_WARNING  = 2;
	var LL_ERROR = 3;
	var LL_MUTE = 4; // no logging
	
	var LOGGING_LEVEL = LL_INFO; // Change this according to your needs
	
	// Radio response
	var AFFIRMATIVE_SIR = true; // No great purpose,
	var NEGATIVE_SIR = false;   // just kidding :)

	// CLASSES
	
	// Simple inheritance
	function inherit(Child, Parent) {
		var Inheritance = function () { };
		Inheritance.prototype = Parent.prototype;
	    Child.prototype = new Inheritance();
	    Child.prototype.constructor = Child;
	    Child.superClass = Parent.prototype;
	}
	
	// Simple logger
	function Logger (lvl) {
		var level = lvl;
		this.s = function (str, lvl) {
			if(lvl === undefined) { lvl = LL_DEBUG; }
			if(level <= lvl){ console.log(str);} 
		};
	}
	
	// Class for objects
	function Obj(x, y) {
		this._x;
		this._y;
		this._image;
		this._imageName;
		this._wrapper;
		
		
		// Update visual elements to match current state
		this._update = function () {
			if(this._wrapper !== undefined ) {
				this._wrapper.style.left = this._x.toString()+'px';
				this._wrapper.style.top = this._y.toString()+'px';
			}
		};
		
		// Create necessary visual elements 
		this._show = function () {
			//TODO: move image to background?
			if(this._wrapper !== undefined ) {
				CONTAINER.removeChild(this._wrapper);
			}
			this._wrapper = document.createElement('div');
			this._wrapper.setAttribute('class','obj-wrapper');
			// Apply layout if one is provided
			if (IMGS_LAYOUTS[this._imageName] !== 'undefined'){
				for (var p in IMGS_LAYOUTS[this._imageName]){
					this._wrapper.style[p] = IMGS_LAYOUTS[this._imageName][p];
				}
			}
			//  Apply shift to center image
			this._wrapper.style.marginLeft = (this._wrapper.style.marginLeft === '' ?
					    Math.round( - this._image.width / 2).toString() + 'px' :
						this._wrapper.style.marginLeft);
			this._wrapper.style.marginTop = (this._wrapper.style.marginTop === '' ?
						Math.round( - this._image.height / 2).toString() + 'px':
						this._wrapper.style.marginTop);
			this._wrapper.appendChild(this._image);
			CONTAINER.appendChild(this._wrapper);
			this._update();
		};
		
		this.setImage = function (img) {
			if (this._imageName !== img) {
				this._imageName = img;
				this._image = new Image();
				this._image.src = IMGS[this._imageName].src;
				this._show();
			}
		};
		
		this.moveTo = function (x, y) {
			this._x = x;
			this._y = y;
			this._update();
		};
		
		this.moveRel = function (dx, dy) {
			this.moveTo(this._x+dx, this._y+dy);
		};
		
		this.getPosition = function () {
			return {x: this._x, y: this._y};
		};

		
		this.moveTo(x, y);
	}
	
	// Class for marks - inherited from Obj
	function Mark(x, y){
		// Parent's constructor first
		Obj.call(this, x, y);
		
		this._rate;
		this._blocked = true;
		
		this.getRate = function () {
			return this._rate;
		};
		
		this.grab = function (){
			var canGrab = false;
			if (this._y === DWP_DEPTH) {
				this._blocked = true;
				canGrab = true;
			} 
			return canGrab;
		};
		
		this.release = function () {
			this._blocked = false;
		};
		
		// Main function of mark's life cycle
		this.step = function ()  {
			if (!this._blocked) {
				// Move mark
				this.moveRel(0, DWP_MARK_IMMERSION_SPEED);
				// Check if blocked now
				if (this._y >= DWP_DEPTH) {
					this._y = DWP_DEPTH;
					this._blocked = true;
				}
				// Update visual
				this._update();
			}
		};
		
		// Initializing
		// Set random rate
		this._rate = Math.floor(Math.random() * 10) + 1; 
		this.setImage('mark' + this.getRate().toString());
		this._show();
		this.release();
	}
	
	inherit(Mark, Obj);
	
	
	// Class for divers - inherited from Obj
	function Diver(x, y){
		// Parent's constructor first
		Obj.call(this, x, y);
		
		this._prevPosition;
	
		this._scubaTank = DWP_SCUBA_TANK_VOLUME; // Remaining volume
		this._state = DS_STILL;
		this._goal = null;
		
		this._leftHand = null;
		this._rightHand = null;
		// For counting caisson disease therapy time
		this._caissonTherapy = {stop1: 0, stop2: 0, stop3: 0};
		
		
		this._setState = function (newState) {
			if(newState!==DS_EMERSION) {
				this._caissonTherapy.stop1 = 0;
				this._caissonTherapy.stop2 = 0;
				this._caissonTherapy.stop3 = 0;
			}
			this._state = newState;
			switch (this._state) {
			case DS_STILL: break;
			case DS_IMMERSION: break;
			case DS_LEFT: this.setImage('diver-go-harvest'); break;
			case DS_RIGHT: this.setImage('diver-go-home'); break;
			case DS_EMERSION: this.setImage('diver-rope'); break;
			}
		};
		
		this._savePrevPosition = function () {
			this._prevPosition = {x: this._x, y: this._y};
		};

		// Determine next move
		this._headingGoal = function () {
			if (this._goal !== null) {
				if (this._y === DWP_DEPTH) {
					// Can move sidewise - we are on the bottom
					if (this._goal.y === DWP_DEPTH) {
						// Goal is on the bottom, too
						this._setState( (this._goal.x === this._x ? DS_STILL : 
					                      (this._goal.x > this._x ? DS_RIGHT : DS_LEFT ) 
					                  ) );
					} else {
						// Going to base
						// Check if we missed the rope
						if ( ( (this._prevPosition.x >= DWP_BOAT_X) && (DWP_BOAT_X >= this._x) ) || 
						   ( (this._prevPosition.x <= DWP_BOAT_X) && (DWP_BOAT_X <= this._x) )
						   ){
							// Stay at the corner
							this._x = DWP_BOAT_X;
							this._state = DS_EMERSION;
						} else {
							// Going to the rope
							this._setState( DWP_BOAT_X > this._x ? DS_RIGHT : DS_LEFT );
						}
					}
				} else {
					// Can't move sidewise - up or down
					this._setState(this._y > this._goal.y ? DS_EMERSION : DS_IMMERSION);
				}
			} else { // We have no goal yet
				this._setState(DS_STILL);
			}
		};
		
		this._doTheJob = function () {
			if (this._goal !== null) {
				switch (this._goal.command) {
				case RC_HARVEST:
					var collected = false;
					if (this._leftHand === null) {
						if(this._goal.mark.grab()) {
							this._leftHand = this._goal.mark;
							collected = true;
						}
					} else if (this._rightHand === null) {
						if(this._goal.mark.grab()) {
							this._rightHand = this._goal.mark;
							collected = true;							
						}
					}
					// Report by radio
					if(collected){ 
						radio.reportCollected(this, this._goal.mark); 
						this._goal = null;
					}
					break;
				case RC_RETURN_TO_BASE:
					// Store marks
					if(this._leftHand !== null){
						radio.reportStored(this, this._leftHand);
						this._leftHand = null;
					}
					if(this._rightHand !== null){
						radio.reportStored(this, this._rightHand);
						this._rightHand = null;
					}
					// Charge scuba tank
					this._scubaTank += DWP_COMPRESSOR_SPEED;
					if (this._scubaTank >= DWP_SCUBA_TANK_VOLUME ){
						this._scubaTank = DWP_SCUBA_TANK_VOLUME;
						this._goal = null;
					}
					break;
				case RC_PATROL:
						this._goal = null;
					break;
				}
			}
		};
		
		// Check if diver reached his goal, and if so - do the job
		this._checkGoal = function ()  {
			var reached = false;
			if (this._goal !== null){
				// Adjust X
				if( 
					( 
					  ( (this._prevPosition.x >= this._goal.x) && (this._goal.x >= this._x) ) || 
					  ( (this._prevPosition.x <= this._goal.x) && (this._goal.x <= this._x) )    
					) && (this._y === this._goal.y)
				  ) {
					this._x = this._goal.x;
					reached = true;
				}
				// Adjust Y
				if( 
					( 
					  ( (this._prevPosition.y >= this._goal.y) && (this._goal.y >= this._y) ) || 
					  ( (this._prevPosition.y <= this._goal.y) && (this._goal.y <= this._y) )    
					) && (this._x === this._goal.x)
				  ) {
					this._y = this._goal.y;
					reached = true;
				}
			} 
			return reached;
		};
		
		this.die = function () {
			log.s('>>>> WARNING! Dead body in the water! <<<<', LL_INFO);
			log.s(this);
		};
		
		// Move marks being carried
		this._moveMarks = function () {
			if (this._leftHand !== null) {
				this._leftHand.moveTo(this._x + DWP_DIVER_HANDS[this._imageName].lft.dx, 
									  this._y + DWP_DIVER_HANDS[this._imageName].lft.dy);
			} 
			if (this._rightHand !== null) {
				this._rightHand.moveTo(this._x + DWP_DIVER_HANDS[this._imageName].rght.dx, 
						  			   this._y + DWP_DIVER_HANDS[this._imageName].rght.dy);
			} 
		};
		
		// Commands from breif by radio
		this.goGoGo = function (goal){
			this._goal = goal;
			this._headingGoal();
			return AFFIRMATIVE_SIR;  // It's equal to true. Just improving readability. Life's good. Smile!
		};
		
		// Main function of divers's life cycle
		this.step = function () {
			// 1. Move
			this._savePrevPosition();
			switch (this._state) {
			case DS_STILL: break;
			case DS_IMMERSION:
				this.moveRel(0, DWP_DIVER_SPEED);
				// Check crossing borders
				if (this._y >= DWP_DEPTH){
					this._y = DWP_DEPTH;					
				}
				break;
			case DS_LEFT:
				this.moveRel(-DWP_DIVER_SPEED, 0);
				//TODO: Check crossing borders
				break;
			case DS_RIGHT:
				this.moveRel(DWP_DIVER_SPEED, 0);
				//TODO: Check crossing borders
				break;
			case DS_EMERSION:
				// Many checks to avoid caisson desease
				if ( (this._y === DWP_EMERSION_1ST_STOP) &&
				     (this._caissonTherapy.stop1 < DWP_EMERSION_1ST_STOP_DURATION) ){
					this._caissonTherapy.stop1 += 1; // Counting in steps!
				} else if ( (this._y === DWP_EMERSION_2ND_STOP) &&
				     (this._caissonTherapy.stop2 < DWP_EMERSION_2ND_STOP_DURATION) ){
					this._caissonTherapy.stop2 += 1; // Counting in steps!
				} else if ( (this._y === DWP_EMERSION_3D_STOP) &&
				     (this._caissonTherapy.stop3 < DWP_EMERSION_3D_STOP_DURATION) ){
					this._caissonTherapy.stop3 += 1; // Counting in steps!
				} else {
					this.moveRel(0, -DWP_DIVER_SPEED);
					// Check crossing borders	
					if (this._y <= DWP_BOAT_Y){
						this._y = DWP_BOAT_Y;					
					}
					// Check if diver must start therapy
					if ( // Starting 1st therapy stop
						 ( (this._prevPosition.y > DWP_EMERSION_1ST_STOP) && 
						   (DWP_EMERSION_1ST_STOP >= this._y) )    
								   ){
						this._y = DWP_EMERSION_1ST_STOP;
						this._caissonTherapy.stop1 = 0;
						//TODO: Add visualisation
					} else if ( // Starting 2nd therapy stop
					    ( (this._prevPosition.y > DWP_EMERSION_2ND_STOP) && 
						  (DWP_EMERSION_2ND_STOP >= this._y) )    
							   ){
						this._y = DWP_EMERSION_2ND_STOP;
						this._caissonTherapy.stop2 = 0;
						//TODO: Add visualisation
					} else if ( // Starting 3d therapy stop
					    ( (this._prevPosition.y > DWP_EMERSION_3D_STOP) && 
						  (DWP_EMERSION_3D_STOP >= this._y) )    
							   ){
						this._y = DWP_EMERSION_3D_STOP;
						this._caissonTherapy.stop3 = 0;
						//TODO: Add visualisation
					}
				}
				break;
			}
			// 2. Reduce scuba tank remaining volume
			if ( (this._y > DWP_BOAT_Y) || (this._prevPosition.y > DWP_BOAT_Y) ) {
				// If diver was under the water during this step, he used oxygen
				this._scubaTank -= DWP_SCUBA_USE[
				     (this._leftHand===null ? 0 : this._leftHand.getRate())+
				     (this._rightHand===null ? 0 : this._rightHand.getRate())
				                   				];
			}
			// 3. Check if we reached the goal,  and if so - do the job
			if (this._checkGoal()) { this._doTheJob(); }
			// Move diver and marks being carried
			this._moveMarks();
			// Update visual			
			this._update();
			// Check if still alive :)
			if (this._scubaTank < 0){ this.die(); }
		};
		
		this._savePrevPosition(); // Just to initialize it
	}
	
	inherit(Diver, Obj);
	
	// Class for radio - the mastermind, collective intelligence of divers
	//TODO: make it a singleton? 
	function Radio()  {
		this._marks = new Array();
		
		this._carriedBy = function (diver) {
			var response = new Array();
			for(var i=0; i<this._marks.length; i++){
				if(this._marks[i] !== undefined){
					if((this._marks[i].assignedTo === diver)&&
					   (this._marks[i].state === MS_COLLECTED)){
						response.push(marks[i]);
					}
				}
			}
			return response;
		};
		
		this._assignedTo = function (diver) {
			var response = new Array();
			for(var i=0; i<this._marks.length; i++){
				if(this._marks[i] !== undefined){
					if((this._marks[i].assignedTo === diver)&&
					   (this._marks[i].state === MS_ASSIGNED)){
						response.push(marks[i]);
					}
				}
			}
			return response;
		};
		
		this._canAssign = function (diver, mark) {
			var response = true;
			// Check if diver has a free hand
			var load = 0;
			for(var i=0; i<this._marks.length; i++){
				if(this._marks[i] !== undefined){
					if(this._marks[i].assignedTo === diver){
						load++;
					}
				}
			}
			if (load >= 2){ response = false; } 
			//TODO: Check if diver has enough oxygen
			return response;
		};
		
		this.reportCollected = function (diver, mark) {
			for(var i=0; i<this._marks.length; i++){
				if( this._marks[i] !== undefined ) {
					if( (marks[i] === mark) && (this._marks[i].assignedTo === diver) ) {
						this._marks[i].state = MS_COLLECTED;
						break;
					} 
				}
			};
		};		
		
		this.reportStored = function (diver, mark) {
			for(var i=0; i<this._marks.length; i++){
				if( this._marks[i] !== undefined ) {
					if( (marks[i] === mark) && (this._marks[i].assignedTo === diver) ) {
						this._marks[i].state = MS_STORED;
						this._marks[i].assignedTo = null;
						break;
					} 
				}
			};
		};
		
		// Main decision making function - divers' conversation
		this.brief = function () {
			// first of all, gathering info about marksBy()
			// WARNING: we can never delete marks!
			for(var i=0; i<marks.length; i++){
				if(this._marks[i] === undefined){
					// No info about mark yet means divers have not seen it
					this._marks[i] = new Object();
					this._marks[i].state = MS_NOT_SEEN;
				}
				if(this._marks[i].state === MS_NOT_SEEN){
					// No need to check marks, that we already know about:
					// if divers saw the mark, or moved and dropped it,
					// they have reported by radio and can definitely
					// predict it's position
					
					// For now: we see everything
					//TODO: Check if we really see it
					this._marks[i].state = MS_SEEN;
				}
				if(this._marks[i].state === MS_SEEN){
					// Try to assign mark to one of divers
					for(var j=0;  j<divers.length; j++){
						if (this._canAssign(divers[j], marks[i])) {
							this._marks[i].state = MS_ASSIGNED;
							this._marks[i].assignedTo = divers[j];
							break;
						}
					}
				}
			}
			// Command
			for(var i=0;  i<divers.length; i++){
				var goal = null;
				var assigned = this._assignedTo(divers[i]);
				if(assigned.length > 0) {
					goal = {x: assigned[0].getPosition().x, y: DWP_DEPTH,
							mark: assigned[0], command: RC_HARVEST};
				} else {
					var carried = this._carriedBy(divers[i]);
					if(carried.length === 2){
						goal = { command: RC_RETURN_TO_BASE, 
								x: DWP_BOAT_X, y: DWP_BOAT_Y };
					}
				}
				divers[i].goGoGo(goal);
			}
		};
	}
	
	// VARIABLES
	
	var bgObjs = [];
	//TODO: make array a static field of Mark class?
	var marks = [];
	//TODO: make array a static field of Diver class?
	var divers = [];
	var radio;
	var timer;
	var state;
	var inStep = false;
	var log = new Logger (LOGGING_LEVEL); // creating new logger
	
	// FUNCTIONS
	
	function createDiver() {
		var diver = new Diver(DWP_BOAT_X, DWP_BOAT_Y);
		diver.setImage('diver-rope');
		divers.push(diver);
	}
	
	function createMark(x, y) {
		var mark = new Mark(x, y);
		marks.push(mark);
	}
	
	// Main user interaction function
	function onClick(event){
		event = event || window.event;
		if (event.pageX == null && event.clientX != null ) {
		    var html = document.documentElement;
			var body = document.body;
			event.pageX = event.clientX + 
				(html && html.scrollLeft || body && body.scrollLeft || 0) -
				(html.clientLeft || 0);
			event.pageY = e.clientY + (html && html.scrollTop || body && body.scrollTop || 0) -
				(html.clientTop || 0);
		}
		//TODO: apply CONTAINER's offset
		var stageX = event.pageX;
		var stageY = event.pageY;
		//TODO: create marks only in water
		createMark(stageX, stageY);
		
		event.stopPropagation ? event.stopPropagation() : (event.cancelBubble=true);
		return false;
	}
	
	// Main function of DivingFun life cycle
	function step() {
		log.s('>>>> NEW STEP: state === '+state+' <<<<', LL_DEBUG);
		// Wait for previous step if necessary
		if(inStep){
			clearInterval(timer);
			log.s('>>>> WARNING! Waiting for previous step! <<<<', LL_WARNING);
			while (inStep){
				// Waiting for previous step
			}
			timer = setInterval(step, STEP_INTERVAL);
		}
		inStep = true;		
		switch (state) {
		case STATE_LOADING:
			var loaded = true;
			for (img in IMGS){ loaded = loaded && IMGS[img].complete; }
			if (loaded) {
				// Finish initialisation
				DFB_WIDTH = IMGS['bg'].width;
				DFB_HEIGHT = IMGS['bg'].height;
				log.s('>>>> DFB_WIDTH === '+DFB_WIDTH+
						', DFB_HEIGHT === '+DFB_HEIGHT+' <<<<', LL_DEBUG);
				state = STATE_RUNNING;
				// Creating background
				var bg = new Obj(DFB_WIDTH / 2, DFB_HEIGHT / 2);
				bg.setImage('bg');
				bgObjs.push(bg);
				// Creating 1st diver
				createDiver();createDiver();createDiver();
			}
			break;
		case STATE_RUNNING:
			// Move marks
			//TODO: create static field instead of .length
			for (var i=0; i<marks.length; i++) {
				marks[i].step();
			}
			// Move divers
			//TODO: create static field instead of .length
			for (var i=0; i<divers.length; i++) {
				divers[i].step();
			}
			// Making decisions
			radio.brief();
			break;
		case STATE_PAUSED: break;
		}
		inStep = false;
	} // step
	
	// INITIALIZATION
	
	function init() {
		log.s('>>>> INIT <<<<', LL_INFO);
		state = STATE_LOADING;
		// Preloading images
		for (var img in IMGS_SRCS) {
			IMGS[img] = new Image ();
			IMGS[img].src = IMGS_SRCS[img];
		}
		// Create mastermind
		radio = new Radio();
		// Add interaction handler
		CONTAINER.onclick = onClick;
		// Set scene alive
		log.s('>>>> LAUNCH: interval === '+STEP_INTERVAL+' <<<<', LL_INFO);
		timer = setInterval(step, STEP_INTERVAL);
	}
	
	init();
	
}

var df;
