
import { now } from '../../dom/module.js';

// Debug mode on by default
const DEBUG = window.DEBUG === undefined || window.DEBUG;

// Render queue
const maxFrameDuration = 0.015;

const queue = new Set();

const addons = [];

var renderCount = 0;

var frame;


/* Console logging */

function tokenOrLabel(token) {
	return typeof token === 'string' ? token : token.label;
}

function tabulateRenderer(renderer) {
	return {
		'Label':  renderer.label,
		'Source': renderer.tokens ?
			renderer.tokens
			.filter((token) => token.label !== 'Listener')
			.map(tokenOrLabel)
			.join('') :
			renderer.path,
		'Rendered': renderer.renderedValue,
		'Total renders (accumulative)': renderer.renderCount
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
		+ addons.length + ' in-frame renderer' + (addons.length === 1 ? '' : 's') + '. '
		+ renderCount + ' DOM mutation' + (renderCount === 1 ? '' : 's') + '. %c'
		+ (tStop - tStart).toFixed(3) + 's', 'color: #6894ab; font-weight: 300;', '');

		console.groupEnd();
	}

	if ((tStop - tStart) > maxFrameDuration) {
		console.log('%c  ' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
		+ addons.length + ' in-frame renderer' + (addons.length === 1 ? '' : 's') + '. '
		+ renderCount + ' DOM mutation' + (renderCount === 1 ? '' : 's') + '. %c'
		+ (tStop - tStart).toFixed(3) + 's', 'color: #d34515; font-weight: 300;', '');
	}
}


/* The meat and potatoes */

function fireEach(queue) {
	var count, renderer;

	for (renderer of queue) {
		if (DEBUG) {
			count = renderer.renderCount;

			if (typeof count !== 'number') {
				console.log('OIOIO', renderer);
			}
		}

		renderer.fire();

		if (DEBUG) {
			renderCount += (renderer.renderCount - count);
		}
	}
}

function run(time) {
	if (DEBUG) {
		console.groupCollapsed('%cSparky %cframe ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
	}

	renderCount = 0;
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
	// Don't recue cued renderers. This should never happen.
	if (queue.has(renderer)) {
		if (DEBUG) {
			console.trace('Sparky trying to cue renderer that is already cued');
		}

		return;
	}

	var count;

	// Run functions cued during frame synchronously to preserve
	// inner-DOM-first order of execution during setup
	if (frame === true) {
		if (DEBUG) {
			if (typeof renderer.renderCount !== 'number') {
				console.warn('Sparky renderer has no property renderCount', renderer);
			}

			count = renderer.renderCount;
		}

		renderer.fire();

		if (DEBUG) {
			addons.push(renderer);
			renderCount += (renderer.renderCount - count);
		}

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
