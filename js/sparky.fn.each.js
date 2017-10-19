(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var dom        = window.dom;
	var Observable = window.Observable;
	var Sparky     = window.Sparky;
	var A          = Array.prototype;

	var noop       = Fn.noop;
	var clone      = dom.clone;
	var tag        = dom.tag;
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

			i = -1;
			while (sparkies[++i] && sparkies[i][$object] !== object);

			sparky = i === sparkies.length ?
				create(clone(template), object, options) :
				sparkies.splice(i, 1)[0];

			sparkies.splice(n, 0, sparky);
		}
	}

	function reorderNodes(node, array, sparkies) {
		// Reordering has pushed all removed sparkies to the end of the
		// sparkies. Remove them.
		while (sparkies.length > array.length) {
			A.forEach.call(sparkies.pop().stop(), dom.remove);
		}

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

			reorderCache(template, options, array, sparkies);
			reorderNodes(marker, array, sparkies);

			// A fudgy workaround because observe() callbacks (like this update
			// function) are not batched to ticks.
			// TODO: batch observe callbacks to ticks.
			if (isSelect && value !== undefined) {
				marker.parentNode.value = value;
			}
		}

		var throttle = Fn.throttle(update, requestAnimationFrame, noop);
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
		var initial = scopes.latest().shift();

		if (initial) {
			observe(initial, '', update);
		}

		scopes.each(function(scope) {
			unobserve();
			unobserve = observe(scope, '', throttle);
		});

		//this.on('stop', function destroy() {
		//	throttle.cancel();
		//	unobserve();
		//});
	};
})(this);
