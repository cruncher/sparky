(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Sparky - https://github.com/cruncher/sparky');
})(this);

(function(window) {
	"use strict";


	// Imports

	var assign     = Object.assign;
	var Collection = window.Collection;
	var Fn         = window.Fn;
	var dom        = window.dom;
	var Stream     = window.Stream;


	// Variables

	var rurljson = /\/\S*\.json$/;


	// Functions

	var noop       = Fn.noop;
	var isDefined  = Fn.isDefined;
	var returnThis = Fn.returnThis;

	function call(fn) { fn(); }


	// Debug

	function nodeToString(node) {
		return [
			'<',
			dom.tag(node),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-scope') ? ' data-scope="' + node.getAttribute('data-scope') + '"' : ''),
			(node.getAttribute('data-fn') ? ' data-fn="' + node.getAttribute('data-fn') + '"' : ''),
			(node.getAttribute('data-template') ? ' data-template="' + node.getAttribute('data-template') + '"' : ''),
			(node.className ? ' class="' + node.className + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}

	function log() {
		if (!Sparky.debug) { return; }
		if (Sparky.debug === 'errors') { return; }
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


	// Sparky

	function resolveNode(selector) {
		// If node is a string assume it is a selector. Sparky does not yet
		// support node collections, so we just use querySelector to get
		// one node.
		var node = typeof selector === 'string' ?
			document.querySelector(selector) :
			selector ;

		var tag;

		if (node) {
			tag = dom.tag(node);

			// If node is a template use a fragment copy of it's content
			return (tag === 'template' || tag === 'script') ?
				Sparky.template(node.id) :
				node ;
		}

		if (/^#/.test(selector)) {
			// Get template from id '#id'
			node = Sparky.template(selector.slice(1));
		}

		if (!node) {
			console.warn('Sparky: node cannot be found during setup: ' + selector);
			return;
			//throw new Error('Sparky: node cannot be found during setup: ' + selector);
		}

		return node;
	}

	function resolveScope(node, scope, data, observe, update) {
		// No getAttribute method (may be a fragment), use current scope.
		if (!node.getAttribute) {
			return update(scope);
		}

		var path = node.getAttribute('data-scope');

		// No data-scope attribute, use current scope.
		if (!isDefined(path)) {
			return update(scope);
		}

		// data-scope="/path/to/data.json"
		rurljson.lastIndex = 0;
		var isURL = rurljson.test(path);

		if (isURL) {
			jQuery.get(path)
			.then(function(res) {
				update(res);
			});

			return;
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

	function resolveFn(node, fn, ctrl, instream) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeFn(fn, ctrl, instream) :
			// a function,
			typeof fn === 'function' ? makeDistributeFn([fn], instream) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeFn(fn, instream) :
			// or defined in the data-fn attribute
			node.getAttribute && makeFn(node.getAttribute('data-fn'), ctrl, instream) ;
	}

	function makeDistributeFn(list, instream) {
		return function distributeFn(node) {
			// Distributor controller
			var l = list.length;
			var n = -1;
			var result;
			var flag = false;

			// TODO: This is exposes solely so that ctrl
			// 'observe-selected' can function in sound.io.
			// Really naff. Find a better way.
			this.ctrls = list;

			this.interrupt = function interrupt() {
				flag = true;
				return list.slice(n + 1);
			};

			while (++n < l) {
				// Call the list of ctrls, in order.
				result = list[n].call(this, node, instream);

				// Returning false interrupts the fn calls.
				if (flag) { return false; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) { instream = result.each ? result : Fn.of(result) ; }
			}

			return instream;
		};
	}

	function makeDistributeFnFromPaths(paths, ctrls, instream) {
		var list = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = Fn.getPath(paths[n], ctrls);
			if (!ctrl) {
				throw new Error('Sparky: data-fn "' + paths[n] + '" not found in sparky.fn');
			}

			list.push(ctrl);
		}

		return makeDistributeFn(list, instream);
	}

	function makeFn(string, ctrls, instream) {
		if (!isDefined(string)) { return; }
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeFnFromPaths(paths, ctrls, instream);
	}

	function replaceWithComment(node, i, sparky) {
		// If debug use comments as placeholders, otherwise use text nodes.
		var placeholder = Sparky.debug ?
			dom.create('comment', dom.tag(node)) :
			dom.create('text', '') ;
		dom.before(node, placeholder);
		dom.remove(node);
		return placeholder;
	}

	function replaceWithNode(node, i, sparky) {
		var placeholder = sparky.placeholders[i];
		dom.before(placeholder, node);
		dom.remove(placeholder);
	}

	function initialise(inits, init) {
		// On initial run we populate the DOM immediately, unthrottled.
		if (init) { inits.forEach(call); }

		// Otherwise we wait for the next frame.
		else { inits.forEach(window.requestAnimationFrame); }

		inits.length = 0;
	}

	function setup(scope, bindings, init) {
		var n = bindings.length;
		var path, fn, throttle;

		while (n--) {
			path = bindings[n][0];
			fn = bindings[n][1];
			throttle = bindings[n][2];
			Sparky.observePath(scope, path, throttle, !init);
			if (init) {
				fn(Fn.getPath(path, scope));
			}
		}
	}

	function teardown(scope, bindings) {
		var n = bindings.length;
		var path, throttle;

		while (n--) {
			path = bindings[n][0];
			throttle = bindings[n][2];
			Sparky.unobservePath(scope, path, throttle);
		}
	}

	function render(scope, bindings, paths) {
		var n = bindings.length;
		var path, throttle;

		// If paths are given, only render those paths
		if (paths && paths.length) {
			bindings = bindings.filter(function(binding) {
				return paths.indexOf(binding[0]) > -1;
			});
		}

		while (n--) {
			path = bindings[n][0];
			throttle = bindings[n][2];
			if (path) { throttle(Fn.getPath(path, scope)); }
			else { throttle(); }
		}
	}

	function destroy(parsed) {
		parsed.setups.length = 0;
		parsed.teardowns.forEach(call);
		parsed.teardowns.length = 0;

		var bindings = parsed.bindings;
		var n = bindings.length;
		var throttle;

		while (n--) {
			throttle = bindings[n][2];
			throttle.cancel();
		}

		parsed.bindings.length = 0;
	}

	function addNodes(sparky) {
		if (!sparky.placeholders) {
			// If nodes are already in the DOM trigger the event.
			// Can't use document.contains - doesn't exist in IE9.
			if (document.body.contains(sparky[0])) {
				sparky.trigger('dom-add');
			}

			return;
		}
		sparky.forEach(replaceWithNode);
		sparky.placeholders = false;
		sparky.trigger('dom-add');
	}

	function removeNodes(sparky) {
		if (sparky.placeholders) { return; }
		sparky.placeholders = sparky.map(replaceWithComment);
		sparky.trigger('dom-remove');
	}

	function updateNodes(sparky, scope, addNodes, addThrottle, removeNodes, removeThrottle, init) {
		// Where there is scope, the nodes should be added to the DOM, if not,
		// they should be removed.
		if (scope) {
			if (init) { addNodes(sparky, init); }
			else { addThrottle(sparky); }
		}
		else {
			if (init) { removeNodes(sparky); }
			else { removeThrottle(sparky); }
		}
	}

	function Sparky(node, rootscope, fn, parent) {
		// Allow calling the constructor with or without 'new'.
		if (!(this instanceof Sparky)) {
			return new Sparky(node, rootscope, fn, parent);
		}

		var sparky = this;
		var init = true;
		var scope;
		var parsed;

		var value;
		var instream = new Stream(function setup(notify) {
			return {
				shift: function shift() {
					var v = value;
					value = undefined;
					return v;
				},
				
				push: function push() {
					value = arguments[arguments.length - 1];
					notify('push');
				}				
			};
		}).dedup();

		var data = parent ? parent.data : Sparky.data;
		var ctrl = parent ? parent.fn : Sparky.fn;
		var unobserveScope = noop;
		var addThrottle = Fn.Throttle(addNodes);
		var removeThrottle = Fn.Throttle(removeNodes);

		function updateScope(object) {
			instream.push(object);
		}

		function observeScope(scope, path) {
			unobserveScope();
			unobserveScope = function() {
				Sparky.unobservePath(scope, path, updateScope);
			};
			Sparky.observePath(scope, path, updateScope, true);
		}

		node = resolveNode(node);

		if (!node) {
			console.warn("Sparky: Sparky(node) – node not found: " + node);
			return;
			//throw new Error("Sparky: Sparky(node) – node not found: " + node);
		}

		Sparky.logVerbose('Sparky(', node, rootscope, fn && (fn.call ? fn.name : fn), ')');

		fn = resolveFn(node, fn, ctrl, instream);

		// Define data and ctrl inheritance
		Object.defineProperties(this, {
			data: { value: Object.create(data), writable: true },
			fn:   { value: Object.create(ctrl) },
			placeholders: { writable: true }
		});

		this.scope = function(object) {
			// If we are already using this object as rootscope, bye bye.
			if (object === rootscope) { return; }
			rootscope = object;
			resolveScope(node, object, parent ? parent.data : Sparky.data, observeScope, updateScope);
			return this;
		};

		// Setup this as a Collection of nodes. Where node is a document
		// fragment, assign all it's children to sparky collection.
		Collection.call(this, [node]);

		// If fn is to be called and a stream is returned, we use that.
		var outstream = fn ? fn.call(sparky, node, instream) : instream ;

		// A controller returning false is telling us not to do data
		// binding. We can skip the heavy work.
		if (outstream === false) {
			this.on('destroy', function() {
				dom.remove(this);
			});

			this.scope(rootscope);
			init = false;
			return;
		}

		var children = [];

		this.create = function(node, scope1, fn) {
			var sparky = Sparky.prototype.create.apply(this, arguments);

			// If scope is already set, apply it immediately, handling the
			// case where a sparky instance is created after a parent sparky
			// has been initialised.
			if (isDefined(scope)) { sparky.scope(scope); }

			// We can't .tap() the outstream here. If a sparky instance is
			// created after a parent sparky is instantiated outstream.tap()
			// will follow the outstream's .each() and it will never receive
			// anything. So push child scope() calls into an array and deal
			// with that inside outstream.each();
			children.push(sparky.scope);

			return sparky.on('destroy', function() {
				var i = children.indexOf(sparky.scope);
				if (i > -1) { children.splice(i, 1); }
			});
		};

		// Define .render() for forcing tags to update.
		this.render = function() {
			render(scope, parsed.bindings, arguments);
			this.trigger.apply(this, ['render'].concat(arguments));
		};

		// Register destroy on this sparky before creating child nodes, so that
		// this gets destroyed before child sparkies do.
		this.on('destroy', function() {
			dom.remove(this);
			this.placeholders && dom.remove(this.placeholders);
			unobserveScope();
			teardown(scope, parsed.bindings);
			destroy(parsed);
		});

		// Parse the DOM nodes for Sparky tags.
		parsed = Sparky.parse(sparky, function get(path) {
			return scope && Fn.getPath(path, scope);
		}, function set(property, value) {
			scope && Fn.setPath(property, value, scope);
		});

		// Instantiate children AFTER this sparky has been fully wired up. Not
		// sure why. Don't think it's important.
		parsed.nodes.forEach(function(node) {
			return sparky.create(node, scope);
		});

		// Don't keep nodes hanging around in memory
		parsed.nodes.length = 0;

		outstream
		.dedup()
		.map(function(object) {
			// If old scope exists, tear it down
			if (scope && parsed) { teardown(scope, parsed.bindings); }

			scope = object;

			if (scope && parsed) {
				// Run initialiser fns, if any
				if (parsed.setups.length) { initialise(parsed.setups, init); }

				// Assign and set up scope
				setup(scope, parsed.bindings, init);
			}

			Sparky.log('Sparky: scope change', node, scope);

			// Trigger children
			//sparky.trigger('scope', scope);

			// Update DOM insertion of this sparky's nodes
			updateNodes(sparky, scope, addNodes, addThrottle, removeNodes, removeThrottle, init);

			// Then update this node
			init = false;

			return scope;
		})
		.each(function(scope) {
			children.forEach(function(fn) {
				fn(scope);
			});
		});

		// If there is scope, set it up now
		resolveScope(node, rootscope, parent ? parent.data : Sparky.data, observeScope, updateScope);

		init = false;
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Create dependent Sparky
		create: function create(node, scope, fn) {
			var boss   = this;
			var sparky = Sparky(node, scope, fn, this);

			function delegateDestroy() { sparky.destroy(); }
			function delegateRender(self) { sparky.render(); }

			// Bind events...
			this
			.on('destroy', delegateDestroy)
			.on('render', delegateRender);

			return sparky.on('destroy', function() {
				boss
				.off('destroy', delegateDestroy)
				.off('render', delegateRender);
			});
		},

		// Unbind and destroy Sparky bindings and nodes.
		destroy: function destroy() {
			return this.trigger('destroy').off();
		},

		scope: returnThis,
		render: returnThis,

		interrupt: function interrupt() { return []; },

		// Returns sparky's element nodes wrapped as a jQuery object. If jQuery
		// is not present, returns undefined.
		tojQuery: function() {
			if (!window.jQuery) { return; }
			return jQuery(this.filter(dom.isElementNode));
		}
	});

	// Export

	var fragments = {};

	assign(Sparky, {
		debug: false,
		log: log,
		logVerbose: logVerbose,
		nodeToString: nodeToString,

		try: function(fn, createMessage) {
			return function catchError() {
				// If Sparky is in debug mode call fn inside a try-catch
				if (Sparky.debug) {
					try { return fn.apply(this, arguments); }
					catch(e) { throw new Error(createMessage.apply(this, arguments)); }
				}

				// Otherwise just call fn
				return fn.apply(this, arguments);
			};
		},

		svgNamespace:   "http://www.w3.org/2000/svg",
		xlinkNamespace: "http://www.w3.org/1999/xlink",
		data: {},
		fn:   {},

		template: function(id) {
			var fragment = fragments[id] || (fragments[id] = dom.fragmentFromId(id));
			return fragment.cloneNode(true);
		}
	});

	window.Sparky = Sparky;
})(this);
