(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var dom        = window.dom;
	var Observable = window.Observable;
	var Sparky     = window.Sparky;
	var frame      = window.frame;
	var A          = Array.prototype;

	var noop       = Fn.noop;
	var before     = dom.before;
	var clone      = dom.clone;
	var remove     = dom.remove;
	var tag        = dom.tag;
	var cue        = frame.cue;
	var uncue      = frame.uncue;
	var observe    = Observable.observe;
	var MarkerNode = Sparky.MarkerNode;

	var $object    = Symbol('object');

	function create(node, object, options) {
console.group('CREATE');
		var sparky = new Sparky(node, object, options);
console.groupEnd();
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
				parent.insertBefore(sparkies[n][0], node);
			}
		}
	}

	function eachFrame(stream, fn) {
		var unobserve = noop;

		function update(time) {
console.log('UPDATE')
			var scope = stream.shift();
			// Todo: shouldnt need this line - observe(undefined) shouldnt call fn
			if (scope === undefined) { return; }

			function render(time) {
				fn(scope);
			}

			unobserve();
			unobserve = observe(scope, '', function() {
				cue(render);
			});
		}

//		cue(update);
console.log('----')
		if (stream.on) {
			stream.on('push', function() {
console.log('PUSH')
				cue(update);
			});
		}
		else {
			cue(update)
		}
	}

	Sparky.fn.each = function each(node, scopes, params) {
		var sparkies = [];
		var template = node.cloneNode(true);
		var options  = this.interrupt();
		var marker   = MarkerNode(node);
		var isSelect = tag(node) === 'option';
console.log('EACH')
		function update(array) {
			// Selects will lose their value if the selected option is removed
			// from the DOM, even if there is another <option> of same value
			// already in place. (Interestingly, value is not lost if the
			// selected <option> is simply moved). Make an effort to have
			// selects retain their value.
			var value = isSelect ? marker.parentNode.value : undefined ;

			reorderCache(template, options, array, sparkies);
			reorderNodes(marker, array, sparkies);
			console.log('render: each ' + JSON.stringify(array));

			// A fudgy workaround because observe() callbacks (like this update
			// function) are not batched to ticks.
			// TODO: batch observe callbacks to ticks.
			if (isSelect && value !== undefined) {
				marker.parentNode.value = value;
			}
		}

		// Stop Sparky trying to bind the same scope and ctrls again.
		//template.removeAttribute('data-scope');
		template.removeAttribute(Sparky.attributeFn);

		// Put the marker in place and remove the node
		before(node, marker);
		remove(node);

		// Get the value of scopes in frames after it has changed
		eachFrame(scopes.latest().dedup(), update);

		this.then(function() {
			remove(marker);
		});
	};
})(window);
