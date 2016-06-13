(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var DOM    = Sparky.dom;

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
		// todo: somehow get the remaining ctrls and call child sparkies with
		// them.

		var sparky = this;
		var sparkies = [];
		var clone  = node.cloneNode(true);
		var throttle = Fn.Throttle(update);
		var fns = this.interrupt();
		var placeholder = createPlaceholder(node);
		var collection;

		function update() {
			var n = -1;
			var map = {};
			var node, object, t;

			if (Sparky.debug) { t = window.performance.now(); }

			while(collection[++n] !== undefined) {
				object = collection[n];

				// If a sparky exists, set it's scope (.scope(object) does
				// nothing if object is unchanged).
				if (sparkies[n]) {
					sparkies[n].scope(object);
					continue;
				}

				node = clone.cloneNode(true);
				sparkies[n] = create(sparky, node, object, fns);

				// We are in an animation frame. Go ahead and manipulate the DOM.
				DOM.before(placeholder, node);
			}

			if (sparkies.length > collection.length) {
				sparkies
				.slice(collection.length)
				.forEach(Fn.invoke('destroy'));

				sparkies.length = collection.length;
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
