
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

		function log(node, scope) {
			console.group('scope change');
			console.log('node ', node);
			console.log('scope', scope);
			console.log('data', sparky.data);
			console.log('fn', sparky.fn);
			console.groupEnd();
		}

		this.on('scope', log);

		console.group('initialisation');
		console.log('node ', node);
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
