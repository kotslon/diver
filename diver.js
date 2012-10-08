function DivingFun(containerId) {

	// CONSTANTS
	
	// Dimensions of diving fun board
	// Equal to background picture dimensions
	var DFB_WIDTH = 762;
	var DFB_HEIGHT = 685;
	var CONTAINER = document.getElementById(containerId);
	
	var STEP_INTERVAL = 10;
	var STEPS_IN_SECOND = 1000 / STEP_INTERVAL; 
	
	// Diving world parameters
	var DWP_COMPRESSOR_SPEED = 3 * 1000 / STEPS_IN_SECOND;  // ml per step (converted from liters per second)
	var DWP_SCUBA_TANK_VOLUME = 20 * 1000;  // ml
	var DWP_DIVER_SPEED = /*20*/ 120 / STEPS_IN_SECOND;  // px per step
	var DWP_EMERSION_1ST_STOP = Math.round(DFB_HEIGHT - DFB_HEIGHT / 3);  // px from top
	var DWP_EMERSION_1ST_STOP_DURATION = 5 * STEPS_IN_SECOND;  // steps
	var DWP_EMERSION_2ND_STOP = Math.round(DFB_HEIGHT - DFB_HEIGHT / 3 * 2);  // px from top
	var DWP_EMERSION_2ND_STOP_DURATION = 10 * STEPS_IN_SECOND;  // steps
	var DWP_EMERSION_2D_STOP = Math.round(DFB_HEIGHT - DFB_HEIGHT / 5 * 4);  // px from top
	var DWP_EMERSION_3D_STOP_DURATION = 15 * STEPS_IN_SECOND;  // steps
	var DWP_DIVER_EMERSION_VOLUME = 50;  // ml
	var DWP_SCUBA_USE_SPEED = 50 / STEPS_IN_SECOND;  // ml per step
	var DWP_MARK_SCUBA_USE = 1 / STEPS_IN_SECOND;  //  ml per rate point per step
	var DWP_MARK_EMERSION_VOLUME = 50;  // ml per rate point
	var DWP_MARK_IMMERSION_SPEED = 80  / STEPS_IN_SECOND;  // px per step
	var DWP_DIVER_VIEW = DFB_WIDTH / 3;  // px
	// Diver's hands' delta (from diver's position), heading right
	var DWP_DIVER_LEFT_HAND_DX = 20; //TODO: px from center
	var DWP_DIVER_LEFT_HAND_DY = -10; //TODO: px from center
	var DWP_DIVER_RIGHT_HAND_DX = 10; //TODO: px from center
	var DWP_DIVER_RIGHT_HAND_DY = 0; //TODO: px from center
	
	var DWP_DEPTH = 620; // px from top
	var DWP_BOAT_X = 625;
	var DWP_BOAT_Y = 140;
	
	// Diver states
	var DS_WAITING = 0;
	var DS_IMMERSION = 1;
	var DS_LEFT = 2;
	var DS_RIGHT = 3;
	var DS_EMERSION = 4;
	var DS_RECHARGING_SCUBA = 5;
	
	// Mark states
	var MS_NOT_SEEN = 0;
	var MS_SEEN = 1;
	var MS_ASSIGNED = 2;
	var MS_COLLECTED = 3;
	var MS_STORED = 4;
	
	// Radio commands
	var RC_HARVEST = 0;
	var RC_RETURN_TO_BASE = 1;
	
	// Sources for images
	var IMGS_PREFIX = 'images/';
	var IMGS_SRCS = {
			'mark1': IMGS_PREFIX+'tf-star1.png', 'mark2': IMGS_PREFIX+'tf-star2.png',
			'mark3': IMGS_PREFIX+'tf-star3.png', 'mark4': IMGS_PREFIX+'tf-star4.png',
			'mark5': IMGS_PREFIX+'tf-star5.png', 'mark6': IMGS_PREFIX+'tf-star6.png',
			'mark7': IMGS_PREFIX+'tf-star7.png', 'mark8': IMGS_PREFIX+'tf-star8.png',
			'mark9': IMGS_PREFIX+'tf-star9.png', 'mark10': IMGS_PREFIX+'tf-star10.png',
			'bg': IMGS_PREFIX+'back.jpg', 'diver-tros': IMGS_PREFIX+'Diver-tros.png',
			'diver-go-harvest': IMGS_PREFIX+'Diver-go-harvest.png',
			'diver-go-home': IMGS_PREFIX+'Diver-go-home.png',
			};
	var IMGS = {}; // We'll init it later
	
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
	
	var LOGGING_LEVEL = LL_MUTE; // Change this according to your needs
	
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
			this._wrapper.style.marginLeft = '-' + 
				Math.round(this._image.width / 2).toString() + 'px';
			this._wrapper.style.marginTop = '-' +
				Math.round(this._image.height / 2).toString() + 'px';
			this._wrapper.appendChild(this._image);
			CONTAINER.appendChild(this._wrapper);
			this._update();
		};
		
		this.setImage = function (img) {
			this._image = new Image();
			this._image.src = IMGS[img].src;
			this._show();
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
		this._state = DS_RECHARGING_SCUBA;
		this._goal = null;
		
		this._leftHand = null;
		this._rightHand = null;
		
		
		this._setState = function (newState) {
			this._state = newState;
			switch (this._state) {
			case DS_WAITING: break;
			case DS_IMMERSION: break;
			case DS_LEFT: this.setImage('diver-go-harvest'); break;
			case DS_RIGHT: this.setImage('diver-go-home'); break;
			case DS_EMERSION: this.setImage('diver-tros'); break;
			case DS_RECHARGING_SCUBA: break;
			}
		};
		
		this._savePrevPosition = function () {
			this._prevPosition = {x: this._x, y: this._y};
		};

		this._headingToGoal = function () {
			if (this._goal !== null) {
				if(this._goal.y === DWP_DEPTH){
					if (this._y === DWP_DEPTH){
						this._setState( (this._goal.x === this._x ? DS_WAITING : 
							           (this._goal.x > this._x ? DS_RIGHT : DS_LEFT ) ) );
					} else {
						this._setState(DS_IMMERSION);
					}
				} else {
					// Goal is boat
					this._setState( this._goal.x > this._x ? DS_RIGHT : 
						            (this._goal.x < this._x ? DS_LEFT : this._state) );
				}
			}
		};
		
		this._stopAtGoal = function ()  {
			if (this._goal !== null){
				// Adjust X
				if( ( (this._prevPosition.x >= this._goal.x) && (this._goal.x >= this._x) ) || 
					( (this._prevPosition.x <= this._goal.x) && (this._goal.x <= this._x) )	
				  ){
					this._x = this._goal.x;					
					if(this._goal.command === RC_HARVEST) {
						// Collect mark
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
							this._setState(DS_WAITING);
							radio.reportCollected(this, this._goal.mark); 
						}
					} else if (this._goal.command === RC_RETURN_TO_BASE) {
						if(this._y === DWP_DEPTH){ this._setState(DS_EMERSION); }
					}
				}
				// Adjust Y
				if( ( (this._prevPosition.y >= this._goal.y) && (this._goal.y >= this._y) ) || 
						( (this._prevPosition.y <= this._goal.y) && (this._goal.y <= this._y) )	
					  ){
						this._y = this._goal.y;
						if (this._goal.command === RC_RETURN_TO_BASE) {
							//if(this._y === DWP_BOAT_Y){ this._setState(DS_EMERSION); }
							//TODO: Store marks
							if(this._leftHand !== null){
								radio.reportStored(this, this._leftHand);
								this._leftHand = null;
							}
							if(this._rightHand !== null){
								radio.reportStored(this, this._rightHand);
								this._rightHand = null;
							}
							//TODO: Charge scuba tank
						}
					}
			}
		};
		
		this.die = function () {
			
		};
		
		//TODO: How to overload moveTo ?
		this._moveMarks = function () {
			if (this._leftHand !== null) {
				this._leftHand.moveTo(this._x, this._y);
			} 
			if (this._rightHand !== null) {
				this._rightHand.moveTo(this._x, this._y);
			} 
		};
		
		this.goGoGo = function (goal){
			this._goal = goal;
			this._headingToGoal();
			return AFFIRMATIVE_SIR;  // It's equal to true. Just improving readability. Life's good. Smile!
		};
		
		// Main function of divers's life cycle
		this.step = function () {
			this._savePrevPosition();
			switch (this._state) {
			case DS_WAITING:
				this._stopAtGoal();
				break;
			case DS_IMMERSION:
				this.moveRel(0, DWP_DIVER_SPEED);
				// Check crossing borders
				if (this._y >= DWP_DEPTH){
					this._y = DWP_DEPTH;					
				}
				this._moveMarks();
				break;
			case DS_LEFT:
				this.moveRel(-DWP_DIVER_SPEED, 0);
				//TODO: Check crossing borders
				this._stopAtGoal();
				this._moveMarks();
				break;
			case DS_RIGHT:
				this.moveRel(DWP_DIVER_SPEED, 0);
				//TODO: Check crossing borders
				this._stopAtGoal();
				this._moveMarks();
				break;
			case DS_EMERSION:
				this.moveRel(0, -DWP_DIVER_SPEED);
				//TODO: make stops to avoid illness
				//TODO: Check crossing borders
				this._stopAtGoal();
				this._moveMarks();
				break;
			case DS_RECHARGING_SCUBA:
				// Charge
				this._scubaTank += DWP_COMPRESSOR_SPEED;
				if (this._scubaTank >= DWP_SCUBA_TANK_VOLUME ){
					this._scubaTank = DWP_SCUBA_TANK_VOLUME;
					this._setState(DS_WAITING);
				}
				break;
			}
			
			
			// Reduce scuba tank remaining volume
			
			// Move diver and marks being carried
			
			// Update visual
			this._update();
			// Check if still alive :)
			if (this._scubaTank < 0){ this.die(); }
		};
		
		this._savePrevPosition(); // Just to initialize it
	}
	
	inherit(Diver, Obj);
	
	// Class for radio - the mastermind,  collective intelligence of divers
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
	var log = new Logger (LOGGING_LEVEL); // creating new logger
	
	// FUNCTIONS
	
	function createDiver() {
		var diver = new Diver(DWP_BOAT_X, DWP_BOAT_Y);
		diver.setImage('diver-tros');
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
		clearInterval(timer);
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
		timer = setInterval(step, STEP_INTERVAL);
	}
	
	// INITIALIZATION
	
	function init() {
		log.s('>>>> INIT <<<<', LL_INFO);
		state = STATE_LOADING;
		// Preloading images
		for (var img in IMGS_SRCS) {
			IMGS[img] = new Image ();
			IMGS[img].src = IMGS_SRCS[img];
		}
		// Creating background
		var bg = new Obj(DFB_WIDTH / 2, DFB_HEIGHT / 2);
		bg.setImage('bg');
		bgObjs.push(bg);
		// Create mastermind
		radio = new Radio();
		// Creating 1st diver
		createDiver();
				
		// Add interaction handler
		CONTAINER.onclick = onClick;
		
		// Set scene alive
		log.s('>>>> LAUNCH: interval === '+STEP_INTERVAL+' <<<<', LL_INFO);
		timer = setInterval(step, STEP_INTERVAL);
	}
	
	init();
	
}

var df;
