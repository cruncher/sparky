
import { get, invoke } from '../../fn/fn.js';
import { now } from '../../dom/dom.js';

const DEBUG  = window.DEBUG || false;

// Render queue

const queue = new Set();
const maxFrameDuration = 0.015;

var point = { data: {} };

var frame;

function totup(point, string) {
	if (point.data[string]) {
		++point.data[string];
	}
	else {
		point.data[string] = 1;
	}

	// Crude, rubbish way of totting up mutation fns
	if (!/children/.test(string)) {
		++point.mutations;
	}

	return point;
}

function run(time) {
	if (DEBUG) {
		console.groupCollapsed('Sparky: frame ' + (time / 1000).toFixed(3));
		point.tStart      = 0;
		point.tStop       = 0;
		point.frameTime   = time / 1000;
		point.queuedFns   = queue.size;
		point.insertedFns = 0;
	}

	frame = true;

	let key;
	for (key in point.data) {
		delete point.data[key];
	}

	point.mutations = 0;
	point.tStart = now();
	queue.forEach(invoke('call', [null, time]));
	point.tStop = now();
	point.duration = point.tStop - point.tStart;

	if (DEBUG || (point.duration > maxFrameDuration)) {
		Array.from(queue).map(get('type')).reduce(totup, point);
		console.table(point.data);

		if (DEBUG) {
			console.groupEnd();
		}

		if (point.duration > maxFrameDuration) {
			console.warn('Sparky: ' + point.mutations + ' DOM mutations took '+ point.duration.toFixed(3) + 's');
		}
	}

	queue.clear();
	frame = undefined;
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
		totup(point, '• ' + fn.type);
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

export { cue, uncue };
