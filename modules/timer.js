
import { get } from '../../fn/fn.js';
import { now } from '../../dom/dom.js';

// Debug mode on by default
const DEBUG = window.DEBUG === undefined || window.DEBUG;

// Render queue
const maxFrameDuration = 0.015;

const queue = new Set();

const addons = [];

const errors = [];

var mutationCount = 0;

var frame;


function logRenders(tStart, tStop, mutations, errors) {
	if (DEBUG) {
		console.log('%c' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. ' + addons.length + ' added renderer'+ (addons.length === 1 ? '' : 's') + '. ' + mutations + ' DOM mutations %c' + (tStop - tStart).toFixed(3) + 's', 'color: #6894ab; font-weight: 300;', '');
		console.groupEnd();
	}

	if (errors.length) {
		console.log('       %c' + errors.length + ' Errors rendering ' + errors.join(' '), 'color: #d34515; font-weight: 400;');
	}

	if ((tStop - tStart) > maxFrameDuration) {
		console.log('       %c' + mutations + ' DOM mutations took ' + (tStop - tStart).toFixed(3) + 's', 'color: #d34515; font-weight: 400;');
	}
}

function fireEach(queue) {
	var renderer;

	for (renderer of queue) {
		renderer.fire();
		mutationCount += renderer.mutationCount || 0;
	}
}

function run(time) {
	frame = undefined;

	if (DEBUG) {
		console.groupCollapsed('%cSparky %cframe ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
	}

	mutationCount = 0;
	addons.length = 0;
	errors.length = 0;
	frame = true;

	const tStart = now();
	fireEach(queue);
	const tStop  = now();

	if (DEBUG || errors.length || ((tStop - tStart) > maxFrameDuration)) {
		logRenders(tStart, tStop, mutationCount, errors);
	}

	queue.clear();
}

export function cue(renderer) {
	// Don't recue cued renderers
	if (queue.has(renderer)) {
		if (DEBUG) {
			console.trace('Sparky trying to cue renderer that is already cued');
		}

		return;
	}

	// Functions cued during frame are run syncronously (to preserve
	// inner-DOM-first order of execution during setup)
	if (frame === true) {
		renderer.fire();
		mutationCount += renderer.mutationCount || 0;
		addons.push(renderer);
		return;
	}

	queue.add(renderer);

	if (frame === undefined) {
		frame = requestAnimationFrame(run);
	}
}

export function uncue(renderer) {
	queue.delete(renderer);

	if (frame !== undefined && frame !== true && queue.size === 0) {
		//if (DEBUG) { console.log('(cancel master frame)'); }
		cancelAnimationFrame(frame);
		frame = undefined;
	}
}
