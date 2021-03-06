(function(window) {

	// Import

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var A         = Array.prototype;
	var id        = Fn.id;
	var is        = Fn.is;
	var isNot     = Fn.isNot;
	var byGreater = Fn.byGreater;
	var rspaces   = /\s+/;

	function negate(fn) {
		return function(a, b) { return -fn(a, b); }
	}


	// Todo: Needs a review. Code belongs in Procsea.
	// This is a hacky bit of crud to give us sorting by values in other
	// objects. Perhaps the best way to do this would be to allow
	// data-sort-by="calibre|find-in-calibres|get:'mass'". Perhaps.
	var sortFns = {
		calibre: function(name) {
			var calibre = Sparky.data.calibres.find(name);
			return calibre && calibre.mass ? calibre.mass : Infinity ;
		},

		port:    function(pk) {
			// Nasty way of putting it at the end of the list: 'zzzzzzzz'
			if (!Fn.isDefined(pk)) { return 'zzzzzzzz'; }
			var port = Sparky.data.ports.find(pk);
			return port ? Fn.toPlainText(port.name) : 'zzzzzzzz' ;
		},

		seller:  function(pk) {
			var seller = Sparky.data.sellers.find(pk);
			return seller ? Fn.toPlainText(seller.name) : 'zzzzzzzz';
		},

		quality: function(name) {
			var i = procsea.data.qualities.indexOf(name);
			return i === -1 ? Infinity : i;
		},

		offer: function(value) {
			return !value;
		}
	};
	// ---------------------------------------------------------


	Sparky.fn['sort-on-click'] = function sortOnClick(node, scopes) {
		// Create a chain of functions from the sort-by attribute that represent
		// a hierarchical sort of multiple properties.
		var property = node.getAttribute('data-sort-by');
		var props    = property.split(rspaces);

		var fns = props.map(function(property) {
			var fn = sortFns[property] ? sortFns[property] : Fn.id;

			return property ? function(a, b) {
				return byGreater(fn(a[property]), fn(b[property]));
			} : byGreater;
		});

		var byAscending = function(a, b) {
			return a.offer !== b.offer ?
				// Keep the special offers at the top, in both ascending
				// and descending.
				a.offer === true ? -1 : 1 :
			Fn.from(fns)
			.map(function(fn) { return fn(a, b); })
			.filter(isNot(0))
			.take(1)
			.shift() || 0;
		};

		var byDescending = function(a, b) {
			return a.offer !== b.offer ?
				// Keep the special offers at the top, in both ascending
				// and descending.
				a.offer === true ? -1 : 1 :
			(-1 * (Fn.from(fns)
			.map(function(fn) { return fn(a, b); })
			.filter(isNot(0))
			.take(1)
			.shift() || 0));
		};

		var click;

		function ascending() {
			A.sort.call(this, byAscending);
			this['sort-order'] = props[0] + '-ascending';
			return this.trigger('sort');
		}

		function descending() {
			A.sort.call(this, byDescending);
			this['sort-order'] = props[0] + '-descending';
			return this.trigger('sort');
		}

		scopes.tap(function(collection) {
			if (click) {
				node.removeEventListener('click', click);
			}

			if (!collection) {
				click = undefined;
				return;
			}

			click = function click(e) {
				collection.sort = collection.sort === descending ?
					ascending :
					descending ;

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

	Sparky.fn['sort'] = function sortOnClick(node, scopes) {
		// Create a chain of functions from the sort-by attribute that represent
		// a hierarchical sort of multiple properties.
		var property = node.getAttribute('data-sort-by');
		var props    = property.split(rspaces);

		var fns = props.map(function(property) {
			var fn = sortFns[property] ? sortFns[property] : Fn.id;

			return property ? function(a, b) {
				return byGreater(fn(a[property]), fn(b[property]));
			} : byGreater;
		});

		var byAscending = function(a, b) {
			return a.offer !== b.offer ?
				a.offer === true ? -1 : 1 :
			Fn.from(fns)
			.map(function(fn) { return fn(a, b); })
			.filter(isNot(0))
			.take(1)
			.shift() || 0;
		};

		function ascending() {
			A.sort.call(this, byAscending);
			this['sort-order'] = props[0] + '-ascending';
			return this.trigger('sort');
		}

		scopes.tap(function(collection) {
			if (!collection) { return; }
			collection.sort = ascending;
			collection.sort();
		});
	};
})(window);
