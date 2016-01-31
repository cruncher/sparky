(function(window) {
	"use strict";

	var assing = Object.assign;
	var Sparky = window.Sparky;
	var dom = Sparky.dom;

	function call(fn) { fn(); }

	Sparky.ctrl.each = function setupCollection(node, collection) {
		// todo: somehow get the remaining ctrls and call child sparkies with
		// them.

		var sparky = this;
		var nodes  = [];
		var sparkies = [];
		var cache  = [];
		var tasks  = [];
		var clone  = node.cloneNode(true);
		var placeholder = Sparky.debug ?
			dom.create('comment', 'each') :
			dom.create('text', '') ;

		function update() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, obj;

			if (Sparky.debug) { var t = window.performance.now(); }

			while (l--) {
				obj = cache[l];
				i = collection.indexOf(obj);

				if (i === -1) {
					sparkies[l].destroy();
				}
				else if (nodes[l] && sparkies[l]) {
					map[i] = [nodes[l], sparkies[l]];
				}
			}

			l = collection.length;

			nodes.length    = l;
			sparkies.length = l;
			cache.length    = l;

			while(++n < l) {
				cache[n] = collection[n];

				if (map[n]) {
					nodes[n] = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n] = clone.cloneNode(true);
					sparkies[n] = sparky.create(nodes[n], collection[n]);
				}

				tasks.push(dom.before.bind(dom, placeholder, nodes[n]));
				taskThrottle();
			}

			Sparky.log('collection rendered (length: ' + collection.length + ', time: ' + (window.performance.now() - t) + 'ms)');
		}

		function run() {
			tasks.forEach(call);
			tasks.length = 0;
		}

		clone.removeAttribute('data-scope');
		clone.removeAttribute('data-ctrl');

		// Put the marker node in place and remove the node
		dom.before(node, placeholder);
		dom.remove(node);

		var taskThrottle = Sparky.Throttle(run);

		// Remove anything that would make Sparky bind the node
		// again. This can happen when a collection is appended
		// by a controller without waiting for it's 'ready' event.
		//node.removeAttribute('data-scope');
		//node.removeAttribute('data-ctrl');

		var throttle = Sparky.Throttle(update);

		if (collection.on) {
			collection.on('add remove', throttle);
			throttle();
		}
		else {
			Sparky.observe(collection, 'length', throttle);
		}

		this.on('destroy', function destroy() {
			throttle.cancel();

			if (collection.on) {
				collection.off('add remove', throttle);
			}
			else {
				Sparky.unobserve(collection, 'length', throttle);
			}
		});

		// Return false to stop the current sparky from binding.
		// ??????? Do we? Dont we? Whazzappnin?
		return false;
	};
})(this);
