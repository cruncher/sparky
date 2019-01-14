/*
	
*/


import { Fn, noop, observe } from '../../fn/fn.js';
import { before, tag, isFragmentNode } from '../../dom/dom.js';
import { cue, uncue } from './timer.js';
import Marker from './marker.js';
import Sparky from './sparky.js';

const DEBUG   = true;//false;

const A       = Array.prototype;

const isArray = Array.isArray;

const $scope = Symbol('scope');

var i = 0;

function create(master, options) {
	const node = master.cloneNode(true);

	if (DEBUG) {
		node.removeAttribute('master');
		node.setAttribute('count', i++);
	}

	const sparky = new Sparky(node, options);
	sparky.nodes = { 0: node, length: 1 };
	return sparky;
}

function reorderCache(master, array, sparkies, config) {
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
			create(master, object, config) :
			sparkies.splice(i, 1)[0];

		// Splice it into place
		sparkies.splice(n, 0, sparky);
	}

	// Reordering has pushed unused sparkies to the end of
	// sparkies collection. Go ahead and remove them.
	while (sparkies.length > array.length) {
		A.forEach.call(sparkies.pop().stop().nodes, (node) => node.remove());
	}
}

function reorderNodes(node, array, sparkies) {
	// Reorder nodes in the DOM
	var l = sparkies.length;
	var n = -1;
	var parent = node.parentNode;

	while (n < l) {
		// Note that node is null where nextSibling does not exist
		node = node ? node.nextSibling : null ;

		while (++n < l && sparkies[n].nodes[0] !== node) {
			if (!sparkies[n][$scope]) {
				sparkies[n].render(array[n]);
				sparkies[n][$scope] = array[n];
			}

			// Passing null to insertBefore appends to the end I think
			parent.insertBefore(sparkies[n].nodes[0], node);
		}
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
			name: 'each mutation',
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

		reorderCache(node, array, sparkies, config);
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

	if (DEBUG) { node.setAttribute('master', ''); }

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
