(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var DOM = Sparky.dom;

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 12000;

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

	function createPlaceholder(node) {
		if (!Sparky.debug) { return DOM.create('text', ''); }

		var attrScope = node.getAttribute('data-scope');
		var attrCtrl = node.getAttribute('data-fn');

		return DOM.create('comment',
			(attrScope ? ' data-scope="' + attrScope + '"' : '') +
			(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
	}

	Sparky.fn.each = function setupCollection(node) {
		var sparky   = this;
		var sparkies = [];
		var cache    = [];

		// We cannot use a WeakMap here: WeakMaps do not accept primitives as
		// keys, and a Sparky scope may be a number or a string.
		var rejects  = new Map();
		var scheduled = [];
		var clone    = node.cloneNode(true);
		var fns      = this.interrupt();
		var placeholder = createPlaceholder(node);
		var collection;

		var throttle = Sparky.Throttle(function update() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, object, t;

			if (Sparky.debug) { t = window.performance.now(); }

			// Compare the cached version of the collection against the
			// collection and construct a map of found object positions.
			while (l--) {
				object = cache[l];
				i = collection.indexOf(object);

				if (i === -1) {
					DOM.remove(sparkies[l][0]);
					rejects.set(object, sparkies[l]);
					scheduled.push(object);
				}
				else {
					map[i] = sparkies[l];
				}
			}

			l = sparkies.length = cache.length = collection.length;

			// Ignore any objects at the start of the collection that have
			// not changed position. Optimises for case where we're pushing
			// things on the end.
			while(cache[++n] && cache[n] === collection[n]);
			--n;

			// Loop through the collection, recaching objects and creating
			// sparkies where needed.
			while(++n < l) {
				object = cache[n] = collection[n];
				removeScheduled(object);
				sparkies[n] = map[n] || rejects.get(object) || create(sparky, clone.cloneNode(true), object, fns);

				// We are in an animation frame. Go ahead and manipulate the DOM.
				DOM.before(placeholder, sparkies[n][0]);
			}

			Sparky.log(
				'collection rendered (length: ' + collection.length +
				', time: ' + (window.performance.now() - t) + 'ms)'
			);

			reschedule();
		});

		var timer;

		function reschedule() {
			clearTimeout(timer);
			timer = setTimeout(function() {
				scheduled.forEach(function(object) {
					rejects.get(object).destroy();
					rejects.delete(object);
				});
			}, destroyDelay);
		}

		function removeScheduled(object) {
			var i = scheduled.indexOf(object);
			if (i === -1) { return; }
			scheduled.splice(i, 1);
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
