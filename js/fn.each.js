import { noop } from '../../fn/fn.js';
import { before, clone, remove, tag } from '../../dom/dom.js';
import Sparky from './sparky.js';
import { cue, uncue } from './frame.js';

var DEBUG      = false;

var Observable = window.Observable;
var A          = Array.prototype;

var isArray    = Array.isArray;
var observe    = Observable.observe;
var MarkerNode = Sparky.MarkerNode;

var $object    = Symbol('object');

function create(node, object, options) {
	if (DEBUG) { console.groupCollapsed('each: create', node, object); }
	var sparky = new Sparky(node, object, options);
	if (DEBUG) { console.groupEnd(); }
	sparky[$object] = object;
	return sparky;
}

function reorderCache(template, options, array, sparkies) {
	var n    = -1;
	var sparky, object, i;

	// Reorder sparkies
	while (++n < array.length) {
		object = array[n];
		sparky = sparkies[n];

		if (sparky && object === sparky[$object]) {
			continue;
		}

		// i = -1
		i = n - 1;
		while (sparkies[++i] && sparkies[i][$object] !== object);

		sparky = i === sparkies.length ?
			create(clone(template), object, options) :
			sparkies.splice(i, 1)[0];

		sparkies.splice(n, 0, sparky);
	}

	// Reordering has pushed all removed sparkies to the end of the
	// sparkies. Remove them.
	while (sparkies.length > array.length) {
		A.forEach.call(sparkies.pop().stop(), remove);
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

		while (++n < l && sparkies[n][0] !== node) {
			// Passing null to insertBefore appends to the end I think
			parent.insertBefore(sparkies[n][0], node);
		}
	}
}

function eachFrame(stream, fn) {
	var unobserve = noop;

	function update(time) {
		var scope = stream.shift();
		// Todo: shouldnt need this line - observe(undefined) shouldnt call fn
		if (scope === undefined) { return; }

		function render(time) {
			fn(scope);
		}

		unobserve();

		var uno = observe(scope, '', function() {
			cue(render);
		});

		unobserve = function() {
			uno();
			uncue(render);
		};
	}

	function push() {
		cue(update);
	}

	if (stream.on) {
		stream.on('push', push);
	}
	else {
		push();
	}

	return function() {
		stream.off('push', push);
		unobserve();
		uncue(update);
	};
}

function entryToKeyValue(entry) {
	return {
		key:   entry[0],
		value: entry[1]
	};
}

Sparky.fn.each = function each(node, scopes, params) {
	var sparkies = [];
	var template = node.cloneNode(true);
	var options  = this.interrupt();
	var marker   = MarkerNode(node);
	var isSelect = tag(node) === 'option';

	function update(array) {
		// Selects will lose their value if the selected option is removed
		// from the DOM, even if there is another <option> of same value
		// already in place. (Interestingly, value is not lost if the
		// selected <option> is simply moved). Make an effort to have
		// selects retain their value.
		var value = isSelect ? marker.parentNode.value : undefined ;

		if (!isArray(array)) {
			array = Object.entries(array).map(entryToKeyValue);
		}

		if (DEBUG) { console.log('render: each ' + JSON.stringify(array)); }

		reorderCache(template, options, array, sparkies);
		reorderNodes(marker, array, sparkies);

		// A fudgy workaround because observe() callbacks (like this update
		// function) are not batched to ticks.
		// TODO: batch observe callbacks to ticks.
		if (isSelect && value !== undefined) {
			marker.parentNode.value = value;
		}
	}

	// Stop Sparky trying to bind the same scope and ctrls again.
	template.removeAttribute(Sparky.attributeFn);

	// Put the marker in place and remove the node
	before(node, marker);
	remove(node);

	// Get the value of scopes in frames after it has changed
	var stream = scopes.latest().dedup();
	var unEachFrame = eachFrame(stream, update);

	this.then(function() {
		remove(marker);
		unEachFrame();
		sparkies.forEach(function(sparky) {
			sparky.stop();
		});
	});
};
