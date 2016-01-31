(function(window) {
	"use strict";

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


	// Utility functions

	function noop() {}

	function returnThis() { return this; }

	function returnArg(arg) { return arg; }

	function isDefined(n) {
		return n !== undefined && n !== null && !Number.isNaN(n);
	}

	function classOf(object) {
		return (/\[object\s(\w+)\]/.exec(Object.prototype.toString.apply(object)) || [])[1];
	}


	// Sparky

	function resolveNode(node) {
		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM.
		return typeof node === 'string' ?
			(Sparky.template(node) || document.getElementById(node)) :
			node ;
	}

	function resolveScope(node, scope, data, observe, update) {
		// No getAttribute method (may be a fragment), use current scope.
		if (!node.getAttribute) {
			return update(scope || {});
		}

		var path = node.getAttribute('data-scope');

		// No data-scope attribute, use current scope.
		if (!isDefined(path)) {
			return update(scope || {});
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

		return scope && path ?
			observe(scope, path) :
			update(scope);
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

	function replaceWithComment(node, i, sparky) {
		// If debug use comments as placeholders, otherwise use text nodes.
		var placeholder = Sparky.debug ?
			Sparky.dom.create('comment', Sparky.dom.tag(node)) :
			Sparky.dom.create('text', '') ;
		Sparky.dom.before(node, placeholder);
		Sparky.dom.remove(node);
		return placeholder;
	}

	function replaceWithNode(node, i, sparky) {
		var placeholder = sparky.placeholders[i];
		Sparky.dom.before(placeholder, node);
		Sparky.dom.remove(placeholder);
	}

	function bind(sparky, scope, bindings) {
		var n = bindings.length;
		var path, fn;

		while (n--) {
			path = bindings[n][0];
			fn = bindings[n][1];
			Sparky.observePath(scope, path, fn);
		}
	}

	function unbind(sparky, scope, bindings) {
		var n = bindings.length;
		var path, fn;

		while (n--) {
			path = bindings[n][0];
			fn = bindings[n][1];
			Sparky.unobservePath(scope, path, fn);
		}
	}

	function setup(sparky, scope, bindings, children) {
		bind(sparky, scope, bindings);
		var n = children.length;
		while (n--) {
			children[n].scope(scope);
		}
	}

	function teardown(sparky, scope, bindings, children) {
		unbind(sparky, scope, bindings);
		var n = children.length;
		while (n--) {
			children[n].scope();
		}
	}

	function addNodes(sparky) {
		if (!sparky.placeholders) { return; }
		//window.requestAnimationFrame(function() {
			sparky.forEach(replaceWithNode);
			sparky.placeholders = false;
			sparky.trigger('dom-add');
		//});
	}

	function removeNodes(sparky) {
		if (sparky.placeholders) { return; }
		sparky.placeholders = sparky.map(replaceWithComment);
		sparky.trigger('dom-remove');
	}

	function Sparky(node, scope, fn, parent) {
		// Allow calling the constructor with or without 'new'.
		if (!(this instanceof Sparky)) {
			return new Sparky(node, scope, fn, parent);
		}

		Sparky.logVerbose('Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
			(scope && '{}'), ',',
			(fn && (fn.name || 'anonymous')), ')');

		var sparky = this;
		var bindings = [];
		var children = [];
		var nodes = [];
		var data = parent ? parent.data : Sparky.data;
		var ctrl = parent ? parent.ctrl : Sparky.ctrl;
		var init = true;
		var unobserveScope = noop;

		function get(path) {
			return scope && Sparky.get(scope, path);
		}

		function set(property, value) {
			scope && Sparky.set(scope, property, value);
		}

		function create(node) {
			nodes.push(node);
		}

		function bind(path, fn) {
			bindings.push([path, fn]);
		}

		function updateScope(object) {
			// If a scope object is returned by the ctrl, we use that.
			var ctrlscope = fn && fn.call(sparky, node, object);

			// A controller returning false is telling us not to do data
			// binding. Uh-oh... we've already done data binding. todo.
			if (ctrlscope === false) { return; }

			var newscope = ctrlscope || object;
			var oldscope = scope;

			if (!init) {
				// If scope is unchanged, do nothing.
				if (newscope === oldscope) { return; }

				// If old scope exists, tear it down
				if (oldscope) { teardown(sparky, oldscope, bindings, children); }
			}

			init = false;
			scope = newscope;

			// Where there is no scope, there should be no nodes in the DOM
			if (!scope) { return removeNodes(sparky); }

			// Assign and set up scope
			setup(sparky, scope, bindings, children);
			addNodes(sparky);
		}

		function observeScope(scope, path) {
			unobserveScope();
			unobserveScope = function() {
				Sparky.unobservePath(scope, path, updateScope);
			};
			Sparky.observePath(scope, path, updateScope);
		}

		node = resolveNode(node);

		if (!node) {
			throw new Error("Sparky: Sparky(node) called, node not found: " + node);
		}

		fn = getCtrl(node, fn, ctrl);

		// Define data and ctrl inheritance
		Object.defineProperties(this, {
			data: { value: Object.create(data), writable: true },
			ctrl: { value: Object.create(ctrl) },
			placeholders: { writable: true }
		});

		// Setup this as a Collection of nodes. Where node is a document
		// fragment, assign all it's children to sparky collection.
		Collection.call(this, node.nodeType === 11 ? node.childNodes : [node]);

		// Parse the DOM nodes for Sparky tags. The parser returns an function
		// that kills it's throttles and so on.
		var unparse = Sparky.parse(sparky, get, set, bind, noop, create);

		if (bindings.length === 0 && children.length === 0) {
			log('No Sparky tags found', sparky);
		}

		this.scope = function(object) {
			resolveScope(node, object, parent ? parent.data : Sparky.data, observeScope, updateScope);
			return this;
		};

		this.on('destroy', function() {
			Sparky.dom.remove(this);
			this.placeholders && Sparky.dom.remove(this.placeholders);
			unparse();
			unobserveScope();
			unbind(sparky, scope, bindings);
		});

		this.scope(scope);

		// Instantiate children AFTER this sparky has been fully wired up.
		children = nodes.map(function(node) {
			return sparky.create(node, scope);
		});
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Create a child Sparky dependent upon this one.
		create: function(node, scope, fn) {
			var boss = this;
			var sparky = Sparky(node, scope, fn, this);

			// Slave new sparky to this. (todo: you may run into trouble with
			// the 'ready' event. See old version, slaveSparky() fn.)
			this.on(sparky);

			return sparky.on('destroy', function() {
				boss.off(sparky);
			});
		},

		// Unbind and destroy Sparky bindings and nodes.
		destroy: function destroy() {
			return this.trigger('destroy').off();
		},

		scope: returnThis,

		// Returns sparky's element nodes wrapped as a jQuery object. If jQuery
		// is not present, returns undefined.
		tojQuery: function() {
			if (!window.jQuery) { return; }
			return jQuery(this.filter(Sparky.dom.isElement));
		}
	});

	// Export

	assign(Sparky, {
		debug: false,
		log: log,
		logVerbose: logVerbose,

		noop:       noop,
		returnThis: returnThis,
		returnArg:  returnArg,
		isDefined:  isDefined,
		classOf:    classOf,

		svgNamespace:   "http://www.w3.org/2000/svg",
		xlinkNamespace: "http://www.w3.org/1999/xlink",
		data: {},
		ctrl: {},

		template: function() {
			return Sparky.dom.fragmentFromTemplate.apply(this, arguments);
		}
	});

	window.Sparky = Sparky;
})(this);
