
import { invoke } from '../../fn/fn.js';
import { now } from '../../dom/dom.js';

const DEBUG  = false;

// Render queue

const queue = new Set();
const data  = [];
const maxFrameDuration = 0.015;

var point = {};
var frame;

function run(time) {
	if (DEBUG) {
		point.tStart      = 0;
		point.tStop       = 0;
		point.frameTime   = time / 1000;
		point.queuedFns   = queue.size;
		point.insertedFns = 0;
		console.groupCollapsed('frame', point.frameTime.toFixed(3));
	}

	frame = true;
	point.tStart = now();
	queue.forEach(invoke('call', [null, time]));
	point.tStop = now();

	if (point.tStop - point.tStart > maxFrameDuration) {
		console.warn('Sparky: animation frame took ' + (point.tStop - point.tStart).toFixed(3) + 's to render ' + queue.size + ' DOM mutations.');
	}

	queue.clear();
	frame = undefined;

	if (DEBUG) {
		point.duration = point.tStop - point.tStart;
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

export { cue, uncue, data };
