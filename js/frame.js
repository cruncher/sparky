
import { invoke } from '../../fn/fn.js';

const DEBUG  = false;

const dom    = window.dom;
const now    = dom.now;

// Render queue

const queue = new Set();
const data  = [];

var point;
var frame;

function run(time) {
	if (DEBUG) {
		point = {};
		point.frameTime   = time / 1000;
		point.runTime     = now();
		point.queuedFns   = queue.size;
		point.insertedFns = 0;
		console.groupCollapsed('frame', point.frameTime.toFixed(3));
	}

	frame = true;

	// Use a .forEach() to support IE11, which doesnt have for..of
	queue.forEach(invoke('call', [null, time]));

	//var fn;
	//for (fn of queue) {
	//	fn(time);
	//}

	queue.clear();
	frame = undefined;

	if (DEBUG) {
		point.duration = now() - point.runTime;
		data.push(point);
		//console.log('Render duration ' + (point.duration).toFixed(3) + 's');
		console.groupEnd();
	}
}

function cue(fn) {
	if (queue.has(fn)) {
		//if (DEBUG) { console.warn('frame: Trying to add an existing fn. Dropped', fn.name + '()'); }
		return;
	}

	// Functions cued during frame are run syncronously (to preserve
	// inner-DOM-first order of execution during setup)
	if (frame === true) {
		if (DEBUG) { ++point.insertedFns; }
		fn();
		return;
	}

	queue.add(fn);

	if (frame === undefined) {
		//if (DEBUG) { console.log('(request master frame)'); }
		frame = requestAnimationFrame(run);
	}
}

function uncue(fn) {
	queue.delete(fn);

	if (frame !== undefined && frame !== true && queue.size === 0) {
		//if (DEBUG) { console.log('(cancel master frame)'); }
		cancelAnimationFrame(frame);
		frame = undefined;
	}
}

window.frame = {
	cue: cue,
	uncue: uncue,
	data: data
};
