/*

*/


import { Fn, last, noop, observe } from '../../fn/fn.js';
import { create, before, tag, isFragmentNode } from '../../dom/dom.js';
import { cue, uncue } from './timer.js';
import Marker from './marker.js';
import Sparky from './sparky.js';

const DEBUG   = true;//false;

const A       = Array.prototype;

const isArray = Array.isArray;

const $scope = Symbol('scope');

function createEntry(master, index, config) {
	const node = master.cloneNode(true);
	const fragment = document.createDocumentFragment();
	fragment.appendChild(node);

	if (DEBUG) {
		node.setAttribute('data-index', index);
	}

	// We treat the sparky object as a store for carrying internal data
	// like fragment and nodes, because we can
	const sparky = new Sparky(node, config);
	sparky.fragment = fragment;
	return sparky;
}

function reorderCache(master, array, sparkies, index, config) {
	// Reorder sparkies
	let n = -1;
	while (++n < array.length) {
		const object = array[n];
		let sparky = sparkies[n];

		if (sparky && object === sparky[$scope]) {
			continue;
		}

		// Scan forward through sparkies to find the sparky that
		// corresponds to the scope object
		let i = n - 1;
		while (sparkies[++i] && sparkies[i][$scope] !== object);

		// Create a new one or splice the existing one out
		sparky = i === sparkies.length ?
			createEntry(master, index++, config) :
			sparkies.splice(i, 1)[0];

		// Splice it into place
		sparkies.splice(n, 0, sparky);
	}

	// Reordering has pushed unused sparkies to the end of
	// sparkies collection. Go ahead and remove them.
	while (sparkies.length > array.length) {
		const sparky = sparkies.pop().stop();

		// If sparky nodes are not yet in the DOM, sparky does not have a
		// .nodes property and we may ignore it
		if (sparky.nodes) {
			A.forEach.call(sparky.nodes, (node) => node.remove());
		}
	}

	// Keep index up to date
	return index;
}

function reorderNodes(node, array, sparkies) {
	// Reorder nodes in the DOM
	var l = sparkies.length;
	var n = -1;
	var parent = node.parentNode;

	while (n < l) {
		// Note that node is null where nextSibling does not exist.
		// Passing null to insertBefore appends to the end
		node = node ? node.nextSibling : null ;

		while (++n < l && (!sparkies[n].nodes || sparkies[n].nodes[0] !== node)) {
			if (!sparkies[n][$scope]) {
				sparkies[n].render(array[n]);
				sparkies[n][$scope] = array[n];
			}

			if (sparkies[n].fragment) {
				// Cache nodes in the fragment
				sparkies[n].nodes = Array.from(sparkies[n].fragment.childNodes);

				// Stick fragment in the DOM
				parent.insertBefore(sparkies[n].fragment, node);
				sparkies[n].fragment = undefined;
			}
			else {
				// Reorder exising nodes
				let i = -1;
				while (sparkies[n].nodes[++i]) {
					parent.insertBefore(sparkies[n].nodes[i], node);
				}
			}
		}

		if (!sparkies[n]) { break; }
		node = last(sparkies[n].nodes);
	}
}

function eachFrame(stream, fn) {
	var unobserve = noop;

	stream.name = 'each';
	stream.fire = function update(time) {
		var scope = stream.shift();
		if (!scope) { return; }

		unobserve();

		const renderer = {
			name: 'eachMutate',
			fire: function render(time) {
				fn(scope);
			}
		};

		unobserve = observe('.', () => cue(renderer), scope);
	};

	function push() {
		cue(stream);
	}

	if (stream.on) {
		stream.on('push', push);
	}
	else {
		push();
	}

	return function() {
		if (stream.on) {
			stream.off('push', push);
		}
		unobserve();
		uncue(stream);
	};
}

function entryToKeyValue(entry) {
	return {
		key:   entry[0],
		value: entry[1]
	};
}

export default function each(node, scopes, params, config) {
	if (isFragmentNode(node)) {
		throw new Error('Sparky.fn.each cannot be used on fragments. Yet.');
	}

	const sparkies = [];
	const marker   = Marker(node);
	const isOption = tag(node) === 'option';

	// An internal index for each created node. Used only for debugging.
	let index = 0;

	function update(array) {
		// Selects will lose their value if the selected option is removed
		// from the DOM, even if there is another <option> of same value
		// already in place. (Interestingly, value is not lost if the
		// selected <option> is simply moved). Make an effort to have
		// selects retain their value.
		var value = isOption ? marker.parentNode.value : undefined ;

		if (!isArray(array)) {
			array = Object.entries(array).map(entryToKeyValue);
		}

		index = reorderCache(node, array, sparkies, index, config);
		reorderNodes(marker, array, sparkies);

		// A fudgy workaround because observe() callbacks (like this update
		// function) are not batched to ticks.
		// TODO: batch observe callbacks to ticks.
		if (isOption && value !== undefined) {
			marker.parentNode.value = value;
		}
	}

	// Put the marker in place and remove the node
	before(node, marker);

	// The master node has it's fn attribute truncated to avoid setup
	// functions being run again. Todo: This is a bit clunky - can we avoid
	// doing this by passing in the fn string in config to the child instead
	// of reparsing the fn attribute?
	if (config.fn) { node.setAttribute(config.attributeFn, config.fn); }
	else { node.removeAttribute(config.attributeFn); }

	if (DEBUG) { node.setAttribute('data-index', 'master'); }

	node.remove();

	// Prevent further functions being run on current node
	config.fn = '';

	// Get the value of scopes in frames after it has changed
	var unEachFrame = eachFrame(scopes.latest().dedup(), update);

	//this.then(function() {
	//	remove(marker);
	//	unEachFrame();
	//	sparkies.forEach(function(sparky) {
	//		sparky.stop();
	//	});
	//});

	// Return false to prevent further processing of this Sparky
	return false;
}
