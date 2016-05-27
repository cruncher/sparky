(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
	var DOM = Sparky.dom;

	function call(fn) { fn(); }

	function create(boss, node, scope, fn) {
		// Create a dependent sparky without delegating scope
		var sparky = Sparky(node, scope, fn, this);

		function delegateDestroy() { sparky.destroy(); }
		function delegateRender(self) { sparky.render(); }

		// Bind events
		boss
		.on('destroy', delegateDestroy)
		.on('render', delegateRender);

		return sparky.on('destroy', function() {
			boss
			.off('destroy', delegateDestroy)
			.off('render', delegateRender);
		});
	}

	Sparky.fn.each = function setupCollection(node) {
		// todo: somehow get the remaining ctrls and call child sparkies with
		// them.

		var sparky = this;
		var nodes  = [];
		var sparkies = [];
		var cache  = [];
		var tasks  = [];
		var clone  = node.cloneNode(true);
		var throttle = Sparky.Throttle(update);
		var fns = this.interrupt();
		var collection, placeholder, attrScope, attrCtrl;

		if (Sparky.debug) {
			attrScope = node.getAttribute('data-scope');
			attrCtrl = node.getAttribute('data-fn');
			placeholder = DOM.create('comment',
				(attrScope ? ' data-scope="' + attrScope + '"' : '') +
				(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
		}
		else {
			placeholder = DOM.create('text', '');
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
			// Todo: Instead of creating new instances, keep existing sparkies
			// and swap their scopes. This would require a bit of scope
			// management, but less DOM management.
			while(++n < l) {
				cache[n] = collection[n];

				if (map[n]) {
					nodes[n]    = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n]    = clone.cloneNode(true);
					sparkies[n] = create(sparky, nodes[n], collection[n], fns);
				}

				// We are in an animation frame. Go ahead and manipulate the DOM.
				DOM.before(placeholder, nodes[n]);
			}

			Sparky.log(
				'collection rendered (length: ' + collection.length +
				', time: ' + (window.performance.now() - t) + 'ms)'
			);
		}

		function observeCollection() {
			if (collection.on) {
				collection.on('add remove sort', throttle);
				throttle();
			}
			else {
				Sparky.observe(collection, 'length', throttle);
			}
		}

		function unobserveCollection() {
			if (collection.on) {
				collection.off('add remove sort', throttle);
			}
			else {
				Sparky.unobserve(collection, 'length', throttle);
			}
		}

		// Stop Sparky trying to bind the same scope and ctrls again.
		clone.removeAttribute('data-scope');
		clone.removeAttribute('data-fn');

		// Put the placeholder in place and remove the node
		DOM.before(node, placeholder);
		DOM.remove(node);

		this
		.on('scope', function(source, scope) {
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
	};
})(this);
