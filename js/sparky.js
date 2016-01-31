(function(window) {
	var assign = Object.assign;

	var errors = {
		"node-not-found": "Sparky: Sparky(node) called, node not found: #{{$0}}"
	}

	// Debug

	function nodeToText(node) {
		return [
			'<',
			Sparky.dom.tag(node),
			//(node.className ? ' class="' + node.className + '"' : ''),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-scope') ? ' data-scope="' + node.getAttribute('data-scope') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}

	function log() {
		if (!Sparky.debug) { return; }
		var array = ['Sparky:'];
		Array.prototype.push.apply(array, arguments);
		console.log.apply(console, array);
	}

	function logVerbose() {
		if (Sparky.debug !== 'verbose') { return; }
		var array = ['Sparky:'];
		Array.prototype.push.apply(array, arguments);
		console.log.apply(console, array);
	}


	// Functions

	function noop() {}

	function returnThis() { return this; }

	function isDefined(val) { return val !== undefined && val !== null; }

	// Sparky

	function resolveNode(node) {
		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM.
		return typeof node === 'string' ?
			(Sparky.template(node) || document.getElementById(node)) :
			node ;
	}

	function resolveScope(sparky, node, scope, data, setup, teardown) {
		function update(scope) {
			return scope ? setup(sparky, scope) : teardown(sparky) ;
		}

		// No getAttribute method (may be a fragment), use current scope.
		if (!node.getAttribute) {
			return setup(sparky, scope || {});
		}

		var path = node.getAttribute('data-scope');

		// No data-scope attribute, use current scope.
		if (!isDefined(path)) {
			return setup(sparky, scope || {});
		}

		// data-scope="{{path.to.data}}", find new scope in current scope.
		Sparky.rtags.lastIndex = 0;
		var parsedPath = Sparky.rtags.exec(path);
		if (parsedPath) {
			path = parsedPath[2];
		}

		// data-scope="path.to.data", find new scope in data.
		else {
			scope = data;
		}

		// Observe changes to scope path
		Sparky.observePath(scope, path, update);
		sparky.on('destroy', function() {
			Sparky.unobservePath(scope, path, update);
		});
	}

	function getCtrl(node, fn, ctrl) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeCtrl(fn, ctrl) :
			// a function,
			typeof fn === 'function' ? makeDistributeCtrl([fn]) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeCtrl(fn) :
			// or defined in the data-ctrl attribute
			node.getAttribute && makeCtrl(node.getAttribute('data-ctrl'), ctrl) ;
	}

	function makeDistributeCtrl(list) {
		return function distributeCtrl(node, model) {
			// Distributor controller
			var l = list.length;
			var n = -1;
			var scope = model;
			var result;

			// TODO: This is exposes solely so that ctrl
			// 'observe-selected' can function in sound.io.
			// Really naff. Find a better way.
			this.ctrls = list;

			while (++n < l) {
				// Call the list of ctrls, in order.
				result = list[n].call(this, node, scope);

				// Returning false interrupts the ctrl calls.
				if (result === false) { return; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) { scope = result; }
			}

			return scope;
		};
	}

	function makeDistributeCtrlFromPaths(paths, ctrls) {
		var list = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = Sparky.get(ctrls, paths[n]);

			if (!ctrl) {
				throw new Error('Sparky: data-ctrl "' + paths[n] + '" not found in sparky.ctrl');
			}

			list.push(ctrl);
		}

		return makeDistributeCtrl(list);
	}

	function makeCtrl(string, ctrls) {
		if (!isDefined(string)) { return; }
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeCtrlFromPaths(paths, ctrls);
	}

	function setupSparky(sparky, node, scope, ctrl) {
		var frame;
		var children = [];
		var bindings = [];
		var parentScope = scope;

		function get(path) {
			return Sparky.get(scope, path);
		}

		function set(property, value) {
			Sparky.set(scope, property, value);
		}

		function create(node) {
			var child = sparky.create(node, scope);
			children.push(child);
			return child;
		}

		function cancelTimer() {
			window.cancelAnimationFrame(frame);
		}

		function observe(path, fn) {
			bindings.push([path, fn]);
			//Sparky.observePath(scope, path, fn);
		}

		function unobserve(path, fn) {
			var n = bindings.length;

			while (n--) {
				if (bindings[n][0] === path && bindings[n][1] === fn) {
					bindings.splice(n, 1);
				}
			}

			//Sparky.unobservePath(scope, path, fn);
		}
var existingScope;
		function bind1(_scope) {
			if (_scope === existingScope) { return this; }

			existingScope = _scope;

			// If a scope object is returned by the ctrl, we use that.
			var object = ctrl && ctrl.call(sparky, node, _scope);

			// A controller returning false is telling us not to do data binding.
			if (object === false) { return; }

			scope = object || scope;
			var n = bindings.length;

			while (n--) {
				path = bindings[n][0];
				fn = bindings[n][1];
				Sparky.observePath(scope, path, fn);
			}

			n = children.length;

			while (n--) {
				children[n].scope(scope);
			}

			this.bind = bind2;
			this.unbind = unbind;
			return this;
		}

		function bind2(scope) {
			return this.unbind().bind(scope);
		}

		function unbind() {
			var n = bindings.length;
			while (n--) {
				path = bindings[n][0];
				fn = bindings[n][1];
				Sparky.unobservePath(scope, path, fn);
			}
			this.bind = bind1;
			this.unbind = returnThis;
			return this;
		}

//		var inserted = document.body.contains(sparky[0]);
//
//		// If this template is not already in the DOM, poll it until it is. We
//		// schedule the poll before binding in order that child sparkies that
//		// result from binding will hear this 'insert' before their own.
//		if (!inserted) {
//			sparky.on('insert', cancelTimer);
//			frame = window.requestAnimationFrame(function poll() {
//				// Is this node in the DOM ?
//				if (document.body.contains(sparky[0])) {
//					//console.log('ASYNC  DOM', sparky.length, sparky[0].nodeType, sparky[0]);
//					sparky.trigger('insert');
//				}
//				else {
//					//console.log('NOPE', sparky[0]);
//					frame = window.requestAnimationFrame(poll);
//				}
//			});
//		}

		// If a scope object is returned by the ctrl, we use that.
		var object = ctrl && ctrl.call(sparky, node, scope);

		// A controller returning false is telling us not to do data binding.
		if (object === false) { return; }

		scope = object || scope;

		Sparky.bind(sparky, observe, unobserve, get, set, create);

		if (bindings.length === 0 && children.length === 0) {
			log('Sparky: No Sparky tags found to bind to in', sparky);
		}

		sparky.bind = bind1;
		sparky.unbind = returnThis;

		sparky.trigger('ready');

		// If this sparky is in the DOM, send the insert event right away.
		//if (inserted) { sparky.trigger('insert'); }
	}

	function replaceWithComment(node, i, sparky) {
		// If debug is on, use comments as placeholders, otherwise use empty
		// text nodes.
		var placeholder = Sparky.debug ?
			Sparky.dom.create('comment', Sparky.dom.tag(node)) :
			Sparky.dom.create('text', '') ;
		Sparky.dom.before(node, placeholder);
		Sparky.dom.remove(node);
		return placeholder;
	}

	function replaceWithNode(node, i, sparky) {
		var placeholder = sparky.comments[i];
		Sparky.dom.before(placeholder, node);
		Sparky.dom.remove(placeholder);
	}

	function setup(sparky, scope) {
		sparky.bind(scope);

		if (sparky.comments) {
//			window.requestAnimationFrame(function() {
				sparky.forEach(replaceWithNode);
				delete sparky.comments;
//			});
		}
	}

	function teardown(sparky) {
		var comments = sparky.map(replaceWithComment);
		sparky.comments = comments;
		sparky.unbind();
	}

	function destroy(sparky) {
		Sparky.dom.remove(sparky);
		sparky.unbind().off();
	}

	function Sparky(node, scope, fn) {
		// Allow calling the constructor with or without 'new'.
		if (!(this instanceof Sparky)) {
			return new Sparky(node, scope, fn, arguments[3]);
		}

		// 'secret' argument parent
		var parent = arguments[3];

		logVerbose('Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
			(scope && '{}'), ',',
			(fn && (fn.name || 'anonymous function')), ')');

		node = resolveNode(node);

		if (!node) {
			throw new Error("Sparky: Sparky(node) called, node not found: " + node);
		}

		var data = parent ? parent.data : Sparky.data;
		var ctrl = parent ? parent.ctrl : Sparky.ctrl;

		fn = getCtrl(node, fn, ctrl);

		// Define data and ctrl inheritance
		Object.defineProperties(this, {
			data: { value: Object.create(data), writable: true },
			ctrl: { value: Object.create(ctrl) }
		});

		// Setup this as a Collection of nodes. Where node is a document
		// fragment, assign all it's children to sparky collection.
		Collection.call(this, node.nodeType === 11 ? node.childNodes : [node]);

		// If parent exists, slave this sparky to it. todo: you may run into
		// trouble with the 'ready' event. See old version, slaveSparky() fn.
		if (parent) {
			parent.on(this);
		}

		this.on('destroy', destroy);

		var flag = false;

		this.scope = function(scope) {
			resolveScope(this, node, scope, data, function(sparky, scope) {
console.log('RESOLVED', node, scope);
				// Scope has become available
				if (!flag) {
					setupSparky(sparky, node, scope, fn);
					flag = true;
				}

				setup(sparky, scope);
			}, function(sparky) {
console.log('UNRESOLVED', node);

				teardown(sparky);
			});
		};

		this.scope(scope);
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Create a slave Sparky dependent upon this.
		create: function(node, scope, fn) {
			return Sparky(node, scope, fn, this);
		},

		// Unbind and destroy Sparky bindings and nodes.
		destroy: function destroy() {
			return this.trigger('destroy');
		},

		bind: returnThis,
		unbind: returnThis,

		// Returns sparky's element nodes wrapped as a jQuery object. If jQuery
		// is not present, returns undefined.
		tojQuery: function() {
			if (!window.jQuery) { return; }
			return jQuery(this.filter(Sparky.dom.isElement));
		}
	});

	// Expose

	assign(Sparky, {
		debug: false,
		log: log,
		logVerbose: logVerbose,
		svgNamespace:   "http://www.w3.org/2000/svg",
		xlinkNamespace: "http://www.w3.org/1999/xlink",

		data:  {},
		ctrl:  {},

		template: function() {
			return Sparky.dom.fragmentFromTemplate.apply(this, arguments);
		}
	});

	window.Sparky = Sparky;
})(this);
