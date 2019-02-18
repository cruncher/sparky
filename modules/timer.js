
import { get } from '../../fn/fn.js';
import { now } from '../../dom/dom.js';

const DEBUG  = window.DEBUG || false;

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

function fire(queue) {
	var count = 0;
	var renderer;

	//if (DEBUG) {
	//	for (renderer of queue) {
	//		try {
	//			count += (renderer.fire ? renderer.fire() : renderer.render()) || 0;
	//		}
	//		catch(e) {
	//			console.log('%cError rendering ' + renderer.label + ' with', 'color: #d34515; font-weight: 300;', renderer.scope);
	//			console.error(e);
	//			errors.push(renderer.token);
	//		}
	//	}
	//}
	//else {
		for (renderer of queue) {
			count += (renderer.fire ? renderer.fire() : renderer.render()) || 0;
		}
	//}

	return count;
}

function run(time) {
	if (DEBUG) {
		console.groupCollapsed('%cSparky %cframe ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
	}

	addons.length = 0;
	errors.length = 0;
	mutationCount = 0;
	frame = true;

	const tStart = now();
	const count  = fire(queue);
	const tStop  = now();

	mutationCount += count;

	if (DEBUG || errors.length || ((tStop - tStart) > maxFrameDuration)) {
		logRenders(tStart, tStop, mutationCount, errors);
	}

	queue.clear();
	frame = undefined;
}

export function cue(renderer) {
	if (queue.has(renderer)) {
		return;
	}

	// Functions cued during frame are run syncronously (to preserve
	// inner-DOM-first order of execution during setup)
	if (frame === true) {
		const count = (renderer.fire ? renderer.fire() : renderer.render()) || 0;
		mutationCount += count;
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
