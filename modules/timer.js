
import { get } from '../../fn/fn.js';
import { now } from '../../dom/dom.js';

// Debug mode on by default
const DEBUG = window.DEBUG === undefined || window.DEBUG;

// Render queue
const maxFrameDuration = 0.015;

const queue = new Set();

const addons = [];

var mutationCount = 0;

var frame;



/* Console logging */

function tabulateRenderer(renderer) {
	return {
		'Label':  renderer.label,
		'Source': renderer.tokens ?
			renderer.tokens
			.filter((token) => token.label !== 'Listener')
			.map((token) => {
				return typeof token === 'string' ? token : token.label;
			})
			.join('') :

			renderer.path,
		'Rendered': renderer.renderedValue,
		'Total renders': renderer.mutationCount
	};
}

function filterListener(renderer) {
	return renderer.constructor.name !== 'Listener';
}

function logRenders(tStart, tStop) {
	if (DEBUG) {
		console.table(
			Array.from(queue)
			.concat(addons)
			.filter(filterListener)
			.map(tabulateRenderer)
		);

		console.log('%c' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
		+ addons.length + ' frame renderer' + (addons.length === 1 ? '' : 's') + '. '
		+ mutationCount + ' DOM mutation' + (mutationCount === 1 ? '' : 's') + '. %c'
		+ (tStop - tStart).toFixed(3) + 's', 'color: #6894ab; font-weight: 300;', '');

		console.groupEnd();
	}

	if ((tStop - tStart) > maxFrameDuration) {
		console.log('%c  ' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
		+ addons.length + ' frame renderer' + (addons.length === 1 ? '' : 's') + '. '
		+ mutationCount + ' DOM mutation' + (mutationCount === 1 ? '' : 's') + '. %c'
		+ (tStop - tStart).toFixed(3) + 's', 'color: #d34515; font-weight: 300;', '');
	}
}



/* The meat and potatoes */

function fireEach(queue) {
	var renderer;

	for (renderer of queue) {
		renderer.fire();
		mutationCount += renderer.mutationCount || 0;
	}
}

function run(time) {
	if (DEBUG) {
		console.groupCollapsed('%cSparky %cframe ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
	}

	mutationCount = 0;
	addons.length = 0;

	const tStart = now();
	frame = true;
	fireEach(queue);
	frame = undefined;
	const tStop  = now();

	logRenders(tStart, tStop);
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

	// Run functions cued during frame syncronously (to preserve
	// inner-DOM-first order of execution during setup)
	if (frame === true) {
		renderer.fire();
		mutationCount += renderer.mutationCount || 0;
		if (DEBUG) { addons.push(renderer); }
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
