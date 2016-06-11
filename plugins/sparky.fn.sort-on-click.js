(function(window) {

	// Import

	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var A      = Array.prototype;

	function negate(fn) {
		return function(a, b) { return -fn(a, b); }
	}

	Sparky.fn['sort-on-click'] = function sortOnClick(node) {
		var property = node.getAttribute('data-sort-by');
		var byAscending  = property ? Fn.by(property) : Fn.byGreater;
		var byDescending = negate(byAscending);
		var click;

		this.on('scope', function(sparky, collection) {
			var order = false;

			if (click) {
				node.removeEventListener('click', click);
			}

			if (!collection) {
				click = undefined;
				return;
			}

			click = function click(e) {
				order = !order;

				collection.sort = order ?
					function ascending() {
						A.sort.call(this, byAscending);
						return this.trigger('sort');
					} :
					function descending() {
						A.sort.call(this, byDescending);
						return this.trigger('sort');
					} ;

				collection.sort();

				// Make button lose focus (we gained focus via click so it's
				// unlikely its important to keep it).
				node.blur();
			};

			node.addEventListener('click', click);
		})
		.on('destroy', function() {
			node.removeEventListener('click', click);
		});
	};
})(this);
