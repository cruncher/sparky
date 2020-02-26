import { get } from '../../fn/module.js';
import { now } from '../../dom/module.js';

// Debug mode on by default
const DEBUG = window.DEBUG === undefined || window.DEBUG;

// Render queue
const maxFrameDuration = 0.015;

const queue = new Set();

const addons = [];

var renderCount = 0;

var frame;


/** Console logging */

function tokenOrLabel(token) {
	return typeof token === 'string' ? token : token.label;
}

function tabulateRenderer(renderer) {
	return {
		'label':  renderer.label,
		'source': renderer.tokens ?
			renderer.tokens
			.filter((token) => token.label !== 'Listener')
			.map(tokenOrLabel)
			.join('') :
			renderer.path,
		'rendered': renderer.renderedValue,
		'DOM mutations (accumulative)': renderer.renderCount
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


/** The meat and potatoes */

function fireEachDEBUG(queue) {
	var count, renderer;

	for (renderer of queue) {
		count = renderer.renderCount;

		try {
			renderer.fire();
		}
		catch(e) {
			throw new Error('failed to render ' + renderer.tokens.map(get('label')).join(', ') + '. ' + e.message);
		}

		renderCount += (renderer.renderCount - count);
	}
}

function fireEach(queue) {
	var renderer;

	for (renderer of queue) {
		renderer.fire();
	}
}

function run(time) {
	var tStart;

	if (DEBUG) {
		window.console.groupCollapsed('%cSparky %c ' + (window.performance.now() / 1000).toFixed(3) + ' frame ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');

		try {
			renderCount = 0;
			addons.length = 0;

			tStart = now();
			frame = true;
			fireEachDEBUG(queue);
			frame = undefined;
		}
		catch (e) {
			const tStop = now();

			// Closes console group, logs warning for frame overrun even
			// when not in DEBUG mode
			logRenders(tStart, tStop);
			queue.clear();

			throw e;
		}
	}
	else {
		renderCount = 0;
		addons.length = 0;

		tStart = now();
		frame = true;
		fireEach(queue);
		frame = undefined;
	}

	const tStop = now();

    // Closes console group, logs warning for frame overrun even
    // when not in DEBUG mode
    logRenders(tStart, tStop);
	queue.clear();
}

export function cue(renderer) {
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

	// Don't recue cued renderers. This shouldn't happen much.
	if (queue.has(renderer)) { return; }

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
