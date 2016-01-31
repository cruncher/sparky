(function(undefined) {


	Sparky.ctrl.each = function setupCollection(node, model) {
		// todo: somehow get the remaining ctrls and call child sparkies with
		// them.

		var parent = this;
		var modelName = node.getAttribute('data-scope');
		var endNode = document.createComment(' [Sparky] data-scope="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];
		var inserted;
		// A pseudo-sparky that delegates events to all
		// sparkies in the collection.
		var sparky = Object.create(prototype);

		function updateNodes() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, obj;

			if (Sparky.debug) { var t = +new Date(); }

			while (l--) {
				obj = cache[l];
				i = model.indexOf(obj);

				if (i === -1) {
					Sparky.dom.remove(nodes[l]);
					sparkies[l].destroy();
					sparky.off(sparkies[l]);
				}
				else if (nodes[l] && sparkies[l]) {
					map[i] = [nodes[l], sparkies[l]];
				}
			}

			l = model.length;

			nodes.length = l;
			sparkies.length = l;
			cache.length = l;

			while(++n < l) {
				cache[n] = model[n];

				if (map[n]) {
					nodes[n] = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n] = node.cloneNode(true);
					sparkies[n] = Sparky(nodes[n], model[n], ctrl, false, parent);
					sparky.on(sparkies[n]);
				}

				Sparky.dom.before(endNode, nodes[n]);

				if (document.body.contains(sparkies[n][0])) {
					sparkies[n].trigger('insert');
				}
			}

			if (Sparky.debug) {
				console.log('Sparky: collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		Sparky.dom.before(node, endNode);

		// Remove the node
		Sparky.dom.remove(node);

		// Remove anything that would make Sparky bind the node
		// again. This can happen when a collection is appended
		// by a controller without waiting for it's 'ready' event.
		node.removeAttribute('data-scope');
		node.removeAttribute('data-ctrl');

		var throttle = Sparky.Throttle(updateNodes);

		Sparky.observe(model, 'length', throttle);

		sparky.on('destroy', function destroy() {
			throttle.cancel();
			Sparky.unobserve(model, 'length', throttle);
		});

		// Return false to stop the current sparky from binding.
		return false;
	};
})();
