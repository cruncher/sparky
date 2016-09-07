(function(window) {

	// Import

	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var A      = Array.prototype;

	function negate(fn) {
		return function(a, b) { return -fn(a, b); }
	}


	// Todo: Needs a review. Code belongs in Procsea.
	// This is a hacky bit of crud to give us sorting by values in other
	// objects. Perhaps the best way to do this would be to allow
	// data-sort-by="calibre|find-in-calibres|get:'mass'". Perhaps.
	var fns = {
		calibre: function(name) {
			var calibre = Sparky.data.calibres.find(name);
			return calibre && calibre.mass ? calibre.mass : Infinity ;
		},

		port:    function(pk) {
			if (!Fn.isDefined(pk)) { return 'zzzzzzzz'; }
			var port = Sparky.data.ports.find(pk);
			return port ? Fn.toPlainText(port.name) : 'zzzzzzzz' ;
		},

		seller:  function(pk) {
			var seller = Sparky.data.sellers.find(pk);
			return seller ? Fn.toPlainText(seller.name) : 'zzzzzzzz';
		}
	};
	// ---------------------------------------------------------


	Sparky.fn['sort-on-click'] = function sortOnClick(node, scopes) {
		var property = node.getAttribute('data-sort-by');


		// Todo: Needs a review. Code belongs in Procsea.
		// This is a hacky bit of crud to give us sorting by values in other
		// objects. Perhaps the best way to do this would be to allow
		// data-sort-by="calibre|find-in-calibres|get:'mass'". Perhaps.
		var fn = fns[property] ? fns[property] : Fn.id;
		// ---------------------------------------------------------



		var byAscending  = property ? function(a, b) {
				return Fn.byGreater(fn(a[property]), fn(b[property]));
			} : Fn.byGreater;

		var byDescending = negate(byAscending);
		var click;

		scopes.tap(function(collection) {
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
						this['sort-order'] = property + '-ascending';
						return this.trigger('sort');
					} :
					function descending() {
						A.sort.call(this, byDescending);
						this['sort-order'] = property + '-descending';
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
