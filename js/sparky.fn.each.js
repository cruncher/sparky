(function(window) {
	"use strict";

	var assing = Object.assign;
	var Sparky = window.Sparky;
	var dom = Sparky.dom;

	function call(fn) { fn(); }

	Sparky.fn.each = function setupCollection(node, collection) {
		// todo: somehow get the remaining ctrls and call child sparkies with
		// them.

		var sparky = this;
		var nodes  = [];
		var sparkies = [];
		var cache  = [];
		var tasks  = [];
		var clone  = node.cloneNode(true);
		var throttle = Sparky.Throttle(update);
		var placeholder, attrScope, attrCtrl;

		if (Sparky.debug) {
			attrScope = node.getAttribute('data-scope');
			attrCtrl = node.getAttribute('data-fn');
			placeholder = dom.create('comment',
				(attrScope ? ' data-scope="' + attrScope + '"' : '') +
				(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
		}
		else {
			placeholder = dom.create('text', '');
		}

		function update() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, obj, t;

			if (Sparky.debug) { t = window.performance.now(); }

			// Compare the cached version of the collection against the
			// collection and construct a map of found object positions.
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

			l = nodes.length = sparkies.length = cache.length = collection.length;

			// Loop through the collection, recaching objects and creating
			// sparkies where needed.
			while(++n < l) {
				cache[n] = collection[n];

				if (map[n]) {
					nodes[n]    = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n]    = clone.cloneNode(true);
					sparkies[n] = sparky.create(nodes[n], collection[n]);
				}

				// Push DOM changes to the task list for handling on
				// the next frame.
				dom.before(placeholder, nodes[n]);
			}

			Sparky.log(
				'collection rendered (length: ' + collection.length +
				', time: ' + (window.performance.now() - t) + 'ms)'
			);
		}

		function observeCollection() {
			if (collection.on) {
				collection.on('add remove', throttle);
				throttle();
			}
			else {
				Sparky.observe(collection, 'length', throttle);
			}
		}

		function unobserveCollection() {
			if (collection.on) {
				collection.off('add remove', throttle);
			}
			else {
				Sparky.unobserve(collection, 'length', throttle);
			}
		}

		// Stop Sparky trying to bind the same scope and ctrls again.
		clone.removeAttribute('data-scope');
		clone.removeAttribute('data-fn');

		// Put the placeholder in place and remove the node
		dom.before(node, placeholder);
		dom.remove(node);

		observeCollection();

		this
		.on('scope', function(source, scope){
			if (this !== source) { return; }
			if (scope === collection) { return; }
			if (collection) { unobserveCollection(); }
			collection = scope;
			if (scope === undefined) { return; }
			observeCollection();
		})
		.on('destroy', function destroy() {
			throttle.cancel();
			unobserveCollection();
		});

		// Return false to stop the current sparky from binding.
		// ??????? Do we? Dont we? Whazzappnin?
		return false;
	};
})(this);
