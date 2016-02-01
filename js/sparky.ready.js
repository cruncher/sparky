
// Sparky ready
//
// If jQuery is present and when the DOM is ready, traverse it looking for
// data-scope and data-fn attributes and use them to instantiate Sparky.

(function(jQuery, Sparky) {
	if (!jQuery) { return; }

	var dom = Sparky.dom;
	var doc = jQuery(document);

	function isInTemplate(node) {
		if (node.tagName.toLowerCase() === 'template') { return true; }
		if (node === document.documentElement) { return false; }
		return isInTemplate(node.parentNode);
	}

	doc.ready(function docReady(){
		var start;

		if (window.console) { start = Date.now(); }

		var nodes = document.querySelectorAll('[data-fn], [data-scope]');
		var n = -1;
		var l = nodes.length;
		var node;
		var array = [];
		var modelPath;

		// Remove child sparkies
		while (++n < l) {
			node = nodes[n];
			array.push(node);
			while (++n < l && node.contains(nodes[n])) {
				// But do add children that have absolute model paths.

				modelPath = nodes[n].getAttribute('data-scope');

				if (modelPath !== undefined && !/\{\{/.test(modelPath)) {
					//array.push(nodes[n]);
				}
			}
			--n;
		}

		// Normally <template>s are inert, but if they are not a supported
		// feature their content is part of the DOM so we have to remove those,
		// too.
		if (!dom.features.template) {
			n = array.length;

			while (n--) {
				if (isInTemplate(array[n])) {
					array.splice(n, 1);
				}
			}
		}

		if (Sparky.debug) { console.log('Sparky: DOM nodes to initialise:', array); }

		array.forEach(function(node) {
			Sparky(node);
		});

		window.requestAnimationFrame(function sparkyready() {
			doc.trigger('sparkyready');
		});

		if (window.console) { console.log('Sparky: DOM initialised in ' + (Date.now() - start) + 'ms'); }
	});
})(jQuery, Sparky);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('_________________________________');
})(this);
