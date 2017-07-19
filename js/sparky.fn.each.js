(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var dom        = window.dom;
	var Observable = window.Observable;
	var Sparky     = window.Sparky;

	var noop       = Fn.noop;
	var toArray    = Fn.toArray;
	var before     = dom.before;
	var clone      = dom.clone;
	var observe    = Observable.observe;
	var MarkerNode = Sparky.MarkerNode;

	var $object    = Symbol('object');

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 8000;

	function create(node, object, options) {
		var sparky = new Sparky(node, object, options);
		sparky[$object] = object;
		return sparky;
	}

	Sparky.fn.each = function each(node, scopes, params) {
		var sparky   = this;
		var sparkies = [];

		var template = node.cloneNode(true);
		var options  = this.interrupt();
		var marker   = MarkerNode(node);

		function update(array) {
			var node = marker;
			var n    = -1;
			var sparky, object, i;

			// Reorder sparkies
			while (++n < array.length) {
				object = array[n];
				sparky = sparkies[n];

				if (sparky && object === sparky[$object]) {
					continue;
				}

				i = -1;
				while (sparkies[++i] && sparkies[i][$object] !== object);

				sparky = i === sparkies.length ?
					create(clone(template), object, options) :
					sparkies.splice(i, 1)[0];

				sparkies.splice(n, 0, sparky);
			}

			// Reordering has pushed all removed sparkies to the end of the
			// array: remove them
			n = sparkies.length;

			while (--n >= array.length) {
				// Destroy
				sparkies[n].stop().remove();
			}

			sparkies.length = array.length;

			// Reoder nodes in the DOM
			var next, node;
			n = -1;

			while (++n < array.length) {
				node = node.nextSibling;

				if (sparkies[n][0] !== node) {
					before(node, sparkies[n][0]);
				}
			}
		}

		//var throttle = Fn.throttle(update);
		//var timer;

		//fns.unshift(function() {
		//	this.data = Object.create(data);
		//});

		// Stop Sparky trying to bind the same scope and ctrls again.
		template.removeAttribute('data-scope');
		template.removeAttribute('data-fn');

		// Put the marker in place and remove the node
		dom.before(node, marker);
		dom.remove(node);

		var unobserve = noop;

		scopes.each(function(scope) {
			unobserve();
			unobserve = observe(scope, '', update);
		});

		//this.on('stop', function destroy() {
		//	throttle.cancel();
		//	unobserve();
		//});
	};
})(this);
