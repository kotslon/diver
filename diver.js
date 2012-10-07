function DivingFun(containerId) {

	// CONSTANTS
	
	// Dimensions of diving fun board
	// Equal to background picture dimentions
	var DFB_WIDTH = 762;
	var DFB_HEIGHT = 685;
	var CONTAINER = document.getElementById(containerId);
	
	var STEP_INTERVAL = 10;
	var STEPS_IN_SECOND = 1000 / STEP_INTERVAL; 
	
	// Diving world parameters
	var DWP_COMPRESSOR_SPEED = 3 * 1000 / STEPS_IN_SECOND;  // ml per step (converted from liters per second)
	var DWP_SCUBA_TANK_VOLUME = 20 * 1000;  // ml
	var DWP_DIVER_SPEED = 20 / STEPS_IN_SECOND;  // px per step
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
	var DWP_DIVER_HAND; //TODO: px from feet
	
	var DWP_DEPTH = 620; // px from top
	var DWP_DIVER_START_X = 625;
	var DWP_DIVER_START_Y = 200;
	
	// Diver states
	var DS_WAITING = 0;
	var DS_IMMERSION = 1;
	var DS_LEFT = 2;
	var DS_RIGHT = 3;
	var DS_EMERSION = 4;
	var DS_RECHARGING_SCUBA = 5;
	
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
	var AFFIRMATIVE_SIR = true; // No great purpose
	var NEGATIVE_SIR = false;   // just kidding :)

	// CLASSES
	
	// Simple inheritance
	function inherit(Child, Parent) {
		var Inheritance = function () { };
		Inheritance.prototype = Parent.prototype;
	    Child.prototype = new Inheritance();
	    Child.prototype.constructor = Child;
	    Child.super = Parent.prototype;
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
		
		this.setImage = function (img) {
			this._image = new Image();
			this._image.src = IMGS[img].src;
		};
		
		// Update visual elements to match current state
		this.update = function () {
			this._wrapper.style.left = this._x.toString()+'px';
			this._wrapper.style.top = this._y.toString()+'px';
		};
		
		this.moveTo = function (x, y) {
			this._x = x;
			this._y = y;
		};
		
		this.moveRel = function (dx, dy) {
			this.moveTo(this._x+dx, this._y+dy);
		};
		
		// Create necessary visual elements 
		this.show = function () {
			//TODO: move image to background?
			this._wrapper = document.createElement('div');
			this._wrapper.setAttribute('class','obj-wrapper');
			this._wrapper.style.marginLeft = '-' + 
				Math.round(this._image.width / 2).toString() + 'px';
			this._wrapper.style.marginTop = '-' +
				Math.round(this._image.height / 2).toString() + 'px';
			this._wrapper.appendChild(this._image);
			CONTAINER.appendChild(this._wrapper);
			this.update();
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
					this._blocked = true;
				}
				// Update visual
				this.update();
			}
		};
		
		// Initializing
		// Set random rate
		this._rate = Math.floor(Math.random() * 10) + 1; 
		this.setImage('mark' + this.getRate().toString());
		this.show();
		this.release();
	}
	
	inherit(Mark, Obj);
	
	
	// Class for divers - inherited from Obj
	function Diver(x, y){
		// Parent's constructor first
		Obj.call(this, x, y);
	
		this._scubaTank = DWP_SCUBA_TANK_VOLUME; // Remaining volume
		this._state = DS_RECHARGING_SCUBA;
		
		this._leftHand = null;
		this._rightHand = null;
		
		this.die = function () {
			
		};
		
		this.canYouCollect = function (mark) {
			var response = AFFIRMATIVE_SIR; // optimistic, yeah!
			var load = (this._leftHand===null ? 0 : 1) + (this._leftHand===null ? 0 : 2) +
				radio.assignedToMe(this).length;
			if (load >= 2) { response = NEGATIVE_SIR; }
			return response;
		};
		
		// Main function of divers's life cycle
		this.step = function () {
			switch (this._state) {
			case DS_WAITING: break;
			case DS_IMMERSION:
				this.moveRel(0, DWP_DIVER_SPEED);
				if (this._y >= DWP_DEPTH){
					this._y = DWP_DEPTH;
					// Change state
				}
				break;
			case DS_LEFT:
				this.moveRel(-DWP_DIVER_SPEED, 0);
				break;
			case DS_RIGHT:
				this.moveRel(DWP_DIVER_SPEED, 0);
				break;
			case DS_EMERSION:
				this.moveRel(0, -DWP_DIVER_SPEED);
				//TODO: make stops to avoid illness
				break;
			case DS_RECHARGING_SCUBA:
				// Charge
				this._scubaTank += DWP_COMPRESSOR_SPEED;
				if (this._scubaTank >= DWP_SCUBA_TANK_VOLUME ){
					this._scubaTank = DWP_SCUBA_TANK_VOLUME;
					this._state = DS_IMMERSION;
				}
				break;
			}
			
			
			// Reduce scuba tank remaining volume
			
			// Move diver and marks being carried
			
			// Update visual
			this.update();
			// Check if still alive :)
			if (this._scubaTank < 0){ this.die(); }
		};
	}
	
	
	// Class for radio - the mastermind,  collective intelligence of divers
	//TODO: make it a singleton? 
	function Radio()  {
		this._marks = new Array();
		
		this.assignedToMe = function (diver) {
			var response = new Array();
			for(var i=0; i<marks.length; i++){
				if(this._marks[i] !== undefined){
					if(this._marks[i].assignedTo === diver){
						response.push(marks[i]);
					}
				}
			}
			return response;
		};
		
		// Main decision making function - divers' conversation
		this.brief = function () {
			// first of all, gathering info about marks
			// WARNING: we can never delete marks!
			for(var i=0; i<marks.length; i++){
				if(this._marks[i] === undefined){
					// No info about mark yet means divers have not seen it
					this._marks[i] = new Object();
					this._marks[i].seen = false;
					this._marks[i].assigned = false;
				}
				if(!this._marks[i].seen){
					// No need to check marks, that we already know about:
					// if divers saw the mark, or moved and dropped it,
					// they have reported by radio and can definitely
					// predict it's position
				}
				if(!this._marks[i].assigned){//TODO: !!!!!! ONLY IF SEEN
					// Try to assign mark to one of divers
					for(var j=0;  j<divers.length; j++){
						if (divers[j].canYouCollect(marks[i]) === AFFIRMATIVE_SIR) {
							this._marks[i].assigned = true;
							this._marks[i].assignedTo = divers[j];
							break;
						}
					}
				}
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
		var diver = new Diver(DWP_DIVER_START_X, DWP_DIVER_START_Y);
		diver.setImage('diver-tros');
		divers.push(diver);
		diver.show();
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
		bg.show();
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
