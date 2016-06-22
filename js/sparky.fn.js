
// Sparky.fn

(function(window) {
	var Sparky = window.Sparky;

	// Stops Sparky from parsing the node.
	Sparky.fn.ignore = function ignore() {
		this.interrupt();
	};
})(this);

(function(window) {
	var Sparky = window.Sparky;

	// Logs nodes, scopes and data.
	Sparky.fn.log = function(node) {
		var sparky = this;

		function log(sparky, scope) {
			console.group('Sparky: scope', Sparky.nodeToString(node));
			console.log('data', sparky.data);
			console.log('scope', scope);
			console.log('fn', sparky.fn);
			console.groupEnd();
		}

		this.on('scope', log);

		console.group('Sparky: fn', Sparky.nodeToString(node));
		console.log('data ', sparky.data);
		console.groupEnd();
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
	var dom    = Sparky.dom;

	assign(Sparky.fn, {
		"remove-hidden": function onReadyUnhide(node) {
			this.on('scope', function() {
				window.requestAnimationFrame(function() {
					dom.classes(node).remove('hidden');
				});
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		html: function html(node) {
			this.on('scope', function(sparky, html) {
				node.innerHTML = html;
			});
		}
	});
})(this);

(function() {
	"use strict";

	function preventDefault(e) {
		e.preventDefault();
	}

	Sparky.scope = function(node) {
		console.warn('Sparky: Sparky.scope() deprecated in favour of Sparky.getScope()')
		return Sparky.getScope(node);
	};

	Sparky.setScope = function(node, scope) {
		if (!window.jQuery) {
			throw new Error('data-fn="store-scope" requires jQuery.');
		}

		window.jQuery && jQuery.data(node, 'scope', scope);
	};

	Sparky.getScope = function(node) {
		if (!window.jQuery) {
			throw new Error('data-fn="store-scope" requires jQuery.');
		}

		return jQuery.data(node, 'scope');
	};

	Object.assign(Sparky.fn, {
		"prevent-click": function(node) {
			node.addEventListener('click', preventDefault);
			this.on('destroy', function() {
				node.removeEventListener('click', preventDefault);
			});
		},

		"prevent-submit": function(node) {
			node.addEventListener('submit', preventDefault);
			this.on('destroy', function() {
				node.removeEventListener('submit', preventDefault);
			});
		},

		"ajax-on-submit": function(node) {
			var method = node.getAttribute('method') || 'POST';
			var url = node.getAttribute('action');

			if (!Fn.isDefined(url)) {
				throw new Error('Sparky: fn ajax-on-submit requires an action="url" attribute.');
			}

			var submit;

			node.addEventListener('submit', preventDefault);

			this
			.on('scope', function(sparky, scope) {
				if (submit) { node.removeEventListener(submit); }
				submit = function(e) {
					console.log('SUBMIT', scope);
					jQuery.ajax({
						type: method.toLowerCase(),
						url:  url,
						data: JSON.stringify(scope),
						dataType: 'json'
					})
					.then(function(value) {
						console.log(value);
					});
				};
				node.addEventListener('submit', submit);
			})
			.on('destroy', function() {
				node.removeEventListener('submit', submit);
			});
		},

		"scope": function(node) {
			this.on('scope', function(sparky, scope) {
				Sparky.setScope(node, scope);
			});
		}
	});
})();


(function() {
	"use strict";

	var dom = Sparky.dom;

	Sparky.fn['x-scroll-slave'] = function(node) {
		var name = node.getAttribute('data-x-scroll-master');
		var master;

		function update() {
			node.scrollLeft = master.scrollLeft;
		}

		this
		.on('dom-add', function() {
			master = document.getElementById(name);

			if (!master) {
				console.error(node);
				throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
			}

			master.addEventListener('scroll', update);
			update();
		})
		.on('destroy', function() {
			if (!master) { return; }
			master.removeEventListener('scroll', update);
		});
	};

	Sparky.fn['y-scroll-slave'] = function(node) {
		var name = node.getAttribute('data-y-scroll-master');
		var master = document.getElementById(name);

		if (!master) {
			console.error(node);
			throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
		}

		function update() {
			node.scrollTop = master.scrollTop;
		}

		master.addEventListener('scroll', update);
		update();

		this.on('destroy', function() {
			master.removeEventListener('scroll', update);
		});
	};
})();
