(function(window) {
	var Sparky = window.Sparky;
	var Fn = window.Fn;

	function byGreater(a, b) {
		return a === b ? 0 : a > b ? 1 : -1 ;
	}

	Sparky.fn['sort-on-click'] = function sortOnClick(node) {
		var property = node.getAttribute('data-sort-by');
		var byProperty = property ? Fn.by(property) : byGreater;
		var click;

		this.on('scope', function(sparky, collection) {
			if (click) {
				node.removeEventListener('click', click);
			}

			click = function click(e) {
				collection.sort(byProperty);
			};

			node.addEventListener('click', click);
		})
		.on('destroy', function() {
			node.removeEventListener('click', click);
		});
	};
})(this);
