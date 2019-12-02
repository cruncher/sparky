/*

*/


import { last, noop, observe } from '../../fn/module.js';
import { before, remove, tag, isFragmentNode } from '../../dom/module.js';
import { cue, uncue } from './timer.js';
import Marker from './marker.js';
import Sparky from './sparky.js';
import { register } from './functions.js';

const A       = Array.prototype;

const isArray = Array.isArray;
const assign  = Object.assign;

const $scope = Symbol('scope');


/* Renderers */

function EachChild(scope, args) {
	this.label    = 'EachChild';
	this.scope    = scope;
	this.node     = args[1];
	this.marker   = args[2];
	this.sparkies = args[3];
	this.isOption = args[4];
	this.options  = args[5];
	this.renderCount = 0;
}

assign(EachChild.prototype, {
	fire: function render(time) {
		this.render(this.scope);
		this.value = this.scope;
	},

	render: function render(array) {
		const node     = this.node;
		const marker   = this.marker;
		const sparkies = this.sparkies;
//		const isOption = this.isOption;
		const options  = this.options;

		// Selects will lose their value if the selected option is removed
		// from the DOM, even if there is another <option> of same value
		// already in place. (Interestingly, value is not lost if the
		// selected <option> is simply moved). Make an effort to have
		// selects retain their value across scope changes.
		//
		// There is also code for something siimilar in render-token.js
		// maybe have a look and decide on what's right
//var value = isOption ? marker.parentNode.value : undefined ;

		if (!isArray(array)) {
			array = Object.entries(array).map(entryToKeyValue);
		}

		this.renderCount += reorderCache(node, array, sparkies, options);
		this.renderCount += reorderNodes(marker, array, sparkies);

		// A fudgy workaround because observe() callbacks (like this update
		// function) are not batched to ticks.
		// TODO: batch observe callbacks to ticks.
//		if (isOption && value !== undefined) {
//			marker.parentNode.value = value;
//		}
	},

	renderCount: 0
});

function EachParent(input, node, marker, sparkies, isOption, options) {
	this.label = 'EachParent';
	this.input = input;
	this.args  = arguments;
}

assign(EachParent.prototype, {
	fire: function render(time) {
		var scope = this.input.shift();
		if (!scope) { return; }

		const renderer = new EachChild(scope, this.args);

		this.stop();
		this.stop = observe('.', () => cue(renderer), scope);
	},

	stop: noop,

	renderCount: 0
});


/* Logic */

function createEntry(master, options) {
	const node = master.cloneNode(true);
	const fragment = document.createDocumentFragment();
	fragment.appendChild(node);

	// We treat the sparky object as a store for carrying internal data
	// like fragment and nodes, because we can
	const sparky = new Sparky(node, options);
	sparky.fragment = fragment;
	return sparky;
}

function reorderCache(master, array, sparkies, options) {
	// Reorder sparkies
	var n = -1;
	var renderCount = 0;

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
			createEntry(master, options) :
			sparkies.splice(i, 1)[0];

		// Splice it into place
		sparkies.splice(n, 0, sparky);
	}

	// Reordering has pushed unused sparkies to the end of
	// sparkies collection. Go ahead and remove them.
	while (sparkies.length > array.length) {
		const sparky = sparkies.pop().stop();

		// If sparky nodes are not yet in the DOM, sparky does not have a
		// .nodes property and we may ignore it, otherwise go ahead
		// and get rid of the nodes
		if (sparky.nodes) {
			A.forEach.call(sparky.nodes, (node) => node.remove());
			renderCount += sparky.nodes.length;
		}
	}

	return renderCount;
}

function reorderNodes(node, array, sparkies) {
	// Reorder nodes in the DOM
	const l = sparkies.length;
	const parent = node.parentNode;

	var renderCount = 0;
	var n = -1;

	while (n < l) {
		// Note that node is null where nextSibling does not exist.
		// Passing null to insertBefore appends to the end
		node = node ? node.nextSibling : null ;

		while (++n < l && (!sparkies[n].nodes || sparkies[n].nodes[0] !== node)) {
			if (!sparkies[n][$scope]) {
				sparkies[n].push(array[n]);
				sparkies[n][$scope] = array[n];
			}

			if (sparkies[n].fragment) {
				// Cache nodes in the fragment
				sparkies[n].nodes = Array.from(sparkies[n].fragment.childNodes);

				// Stick fragment in the DOM
				parent.insertBefore(sparkies[n].fragment, node);
				sparkies[n].fragment = undefined;

				// Increment renderCount for logging
				++renderCount;
			}
			else {
				// Reorder exising nodes
				let i = -1;
				while (sparkies[n].nodes[++i]) {
					parent.insertBefore(sparkies[n].nodes[i], node);

					// Increment renderCount for logging
					++renderCount;
				}
			}
		}

		if (!sparkies[n]) { break; }
		node = last(sparkies[n].nodes);
	}

	return renderCount;
}

function eachFrame(stream, node, marker, sparkies, isOption, options) {
	const renderer = new EachParent(stream, node, marker, sparkies, isOption, options);

	function push() {
		cue(renderer);
	}

	// Support functors
	if (!stream.on) {
		push();

		return function stop() {
			renderer.stop();
			uncue(renderer);
		};
	}

	// Support streams
	stream.on(push);

	return function stop() {
		stream.off('push', push);
		renderer.stop();
		uncue(renderer);
	};
}

function entryToKeyValue(entry) {
	return {
		key:   entry[0],
		value: entry[1]
	};
}

register('each', function(node, params, options) {
	if (isFragmentNode(node)) {
		throw new Error('Sparky.fn.each cannot be used on fragments.');
	}

	const sparkies = [];
	const marker   = Marker(node);
	const isOption = tag(node) === 'option';

	// Put the marker in place and remove the node
	before(node, marker);

	// The master node has it's fn attribute truncated to avoid setup
	// functions being run again. Todo: This is a bit clunky - can we avoid
	// doing this by passing in the fn string in options to the child instead
	// of reparsing the fn attribute?
	if (options.fn) { node.setAttribute(options.attributeFn, options.fn); }
	else { node.removeAttribute(options.attributeFn); }

	node.remove();

	// Prevent further functions being run on current node
	options.fn = '';

	// Get the value of scopes in frames after it has changed
	var unEachFrame = eachFrame(this.latest().dedup(), node, marker, sparkies, isOption, options);

	this.done(() => {
		remove(marker);
		unEachFrame();
		sparkies.forEach(function(sparky) {
			sparky.stop();
		});
	});

	// Return false to prevent further processing of this Sparky
	return false;
});
