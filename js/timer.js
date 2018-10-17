
import { get, invoke, nothing } from '../../fn/fn.js';
import { now } from '../../dom/dom.js';

const DEBUG  = window.DEBUG || false;

// Render queue
const maxFrameDuration = 0.015;

const queue = new Set();

const addons = [];

const getCount = get('count');

let frame;
const errors = [];

function sum(a, b) {
	return a + b;
}

function collate(data, renderer) {
	var key = renderer.render ?
		(renderer.render.name || 'anonymous') + (renderer.token || '') :
		renderer.name ;

	if (data[key]) {
		data[key].count++;
	}
	else {
		data[key] = {
			name:  renderer.render ?
				(renderer.render.name || 'anonymous') :
				renderer.name,
			token: renderer.render && renderer.token,
			count: 1
		};
	}

	return data;
}

function run(time) {
	if (DEBUG) {
		console.groupCollapsed('%cSparky %cframe ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
	}

	addons.length = 0;
	errors.length = 0;
	frame = true;

	const tStart = now();

	let renderer;

	if (DEBUG) {
		for (renderer of queue) {
			try {
					renderer.fire();
			}
			catch(e) {
				console.log('%cError rendering ' + renderer.token + ' with', 'color: #d34515; font-weight: 300;', renderer.scope);
				console.error(e);
				errors.push(renderer.token);
			}
		}
	}
	else {
		for (renderer of queue) {
			renderer.fire();
		}
	}

	const tStop = now();

	if (DEBUG || errors.length || ((tStop - tStart) > maxFrameDuration)) {
		// Pass some information to the frame cuer for debugging
		// Todo: I think ultimately it would be better to pass entire
		// structs to the cuer, instead of trying to recreate unique functions
		// to use as identities...
		const data = Object.values(Array.from(queue).concat(addons).reduce(collate, {}));
		const mutations = data
		.filter((entry) => !!entry.token)
		.map(getCount)
		.reduce(sum, 0);

		console.table(data);

		if (DEBUG) {
			console.log(queue.size + ' cued, ' + addons.length + ' immediate calls, ' + mutations + ' DOM renders, took ' + (tStop - tStart).toFixed(3) + 's');
			console.groupEnd();
		}

		if (errors.length) {
			console.log('       %c' + errors.length + ' Errors rendering ' + errors.join(' '), 'color: #d34515; font-weight: 400;');
		}

		if ((tStop - tStart) > maxFrameDuration) {
			console.log('       %c' + mutations + ' DOM mutations took ' + (tStop - tStart).toFixed(3) + 's', 'color: #d34515; font-weight: 400;');
		}
	}

	queue.clear();
	frame = undefined;
}

export function cue(renderer) {
	if (queue.has(renderer)) {
		//if (DEBUG) { console.warn('frame: Trying to add an existing fn. Dropped', fn.name + '()'); }
		return;
	}

	// Functions cued during frame are run syncronously (to preserve
	// inner-DOM-first order of execution during setup)
	if (frame === true) {
		renderer.fire();
		addons.push(renderer);
		return;
	}

	queue.add(renderer);

	if (frame === undefined) {
		//if (DEBUG) { console.log('(request head frame)'); }
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
