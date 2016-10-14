
// Number.isNaN(n) polyfill

if (!Number.isNaN) {
	if (window.console) { console.log('Polyfill: Number.isNaN()'); }

	(function(globalIsNaN) {
		"use strict";
	
		Object.defineProperty(Number, 'isNaN', {
			value: function isNaN(value) {
				return typeof value === 'number' && globalIsNaN(value);
			},
			configurable: true,
			enumerable: false,
			writable: true
		});
	})(isNaN);
}

if (!Math.log10) {
	if (window.console) { console.log('Polyfill: Math.log10()'); }

	Math.log10 = function log10(n) {
		return Math.log(n) / Math.LN10;
	};
}


// window.CustomEvent polyfill

(function(window, undefined) {
	if (window.CustomEvent && typeof window.CustomEvent === 'function') { return; }
	if (window.console) { console.log('Polyfill: CustomEvent'); }

	window.CustomEvent = function CustomEvent(event, params) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		
		var e = document.createEvent('CustomEvent');
		e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		
		return e;
	};
	
	window.CustomEvent.prototype = window.Event.prototype;
})(window);

// window.requestAnimationFrame polyfill

(function(window) {
	var frameDuration = 40;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	var n = vendors.length;

	while (n-- && !window.requestAnimationFrame) {
		window.requestAnimationFrame = window[vendors[n]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[n]+'CancelAnimationFrame'] || window[vendors[n]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame) {
		if (window.console) { console.log('Polyfill: requestAnimationFrame()'); }

		window.requestAnimationFrame = function(callback, element) {
			var currTime = +new Date();
			var nextTime = frameDuration - (currTime % frameDuration);
			var id = window.setTimeout(function() { callback(nextTime); }, nextTime);
			return id;
		};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
	}
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Sparky');
	console.log('https://labs.cruncher.ch/sparky');
	console.log('_______________________________');
})(this);


(function(window) {
	"use strict";


	// Imports

	var Fn     = window.Fn;
	var assign = Object.assign;


	// Variables

	var rurljson = /\/\S*\.json$/;


	// Utilities

	var noop      = Fn.noop;
	var isDefined = Fn.isDefined;

	function call(fn) { fn(); }

	function returnThis() { return this; }

	// Debug

	function nodeToString(node) {
		return [
			'<',
			Sparky.dom.tag(node),
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

		if (!node) {
			console.warn('Sparky: node cannot be found on Sparky(node) setup: ' + selector);
			return;
			//throw new Error('Sparky: node cannot be found on Sparky(node) setup: ' + selector);
		}

		// If node is a template use a copy of it's content.
		var tag = Sparky.dom.tag(node);
		if (tag === 'template' || tag === 'script') {
			node = Sparky.template(node.id);
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
				throw new Error('Sparky: data-fn "' + paths[n] + '" not found in sparky.ctrl');
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

		var instream = Fn.ValueStream().dedup();

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
		Collection.call(this, node.nodeType === 11 ? node.childNodes : [node]);

		// If fn is to be called and a stream is returned, we use that.
		var outstream = fn ? fn.call(sparky, node, instream) : instream ;

		// A controller returning false is telling us not to do data
		// binding. We can skip the heavy work.
		if (outstream === false) {
			this.on('destroy', function() {
				Sparky.dom.remove(this);
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
			Sparky.dom.remove(this);
			this.placeholders && Sparky.dom.remove(this.placeholders);
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
			return jQuery(this.filter(Sparky.dom.isElementNode));
		}
	});

	// Export

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

		template: function(id, node) {
			return Sparky.dom.template.apply(this, arguments);
		}
	});

	window.Sparky = Sparky;
})(this);

(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var Sparky = window.Sparky;

	var assign = Object.assign;
	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var dom = {};

	// Selection, traversal and mutation

	// TokenList constructor to emulate classList property. The get fn should
	// take the arguments (node), and return a string of tokens. The set fn
	// should take the arguments (node, string).

	function TokenList(node, get, set) {
		this.node = node;
		this.get = get;
		this.set = set;
	}

	TokenList.prototype = {
		add: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(Sparky.rspaces) : [] ;

			while (n--) {
				if (array.indexOf(arguments[n]) === -1) {
					array.push(arguments[n]);
				}
			}

			this.set(this.node, array.join(' '));
		},

		remove: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(Sparky.rspaces) : [] ;
			var i;

			while (n--) {
				i = array.indexOf(arguments[n]);
				if (i !== -1) { array.splice(i, 1); }
			}

			this.set(this.node, array.join(' '));
		}
	};

	function getClass(node) {
		// node.className is an object in SVG. getAttribute
		// is more consistent, if a tad slower.
		return node.getAttribute('class');
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function getClassList(node) {
		return node.classList || new TokenList(node, getClass, setClass);
	}

	function getStyle(node, name) {
		return window.getComputedStyle ?
			window
			.getComputedStyle(node, null)
			.getPropertyValue(name) :
			0 ;
	}

	function matches(node, selector) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			node.tagName.toLowerCase() === selector ;
	}

	function closest(node, selector, root) {
		if (!node || node === root || node === document || node.nodeType === 11) { return; }

		if (node.correspondingUseElement) {
			// SVG <use> elements store their DOM reference in
			// .correspondingUseElement.
			node = node.correspondingUseElement;
		}

		return matches(node, selector) ?
			 node :
			 closest(node.parentNode, selector, root) ;
	}

	function tagName(node) {
		return node.tagName.toLowerCase();
	}

	function createNode(name) {
		// create('comment', 'Text');
		if (name === 'comment' || name === '!') {
			return document.createComment(arguments[1]);
		}

		// create('text', 'Text')
		if (name === 'text') {
			return document.createTextNode(arguments[1]);
		}

		// create('fragment')
		if (name === 'fragment') {
			return document.createDocumentFragment();
		}

		// create('div', 'HTML')
		var node = document.createElement(name);
		node.innerHTML = arguments[1];
		return node;
	}

	function append(node1, node2) {
		node1.appendChild(node2);
		return node1;
	}

	function empty(node) {
		while (node.lastChild) { node.removeChild(node.lastChild); }
	}

	function remove(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function insertBefore(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function insertAfter(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}

	function query(node, selector) {
		if (arguments.length === 1 && typeof node === 'string') {
			selector = node;
			node = document;
		}

		return slice(node.querySelectorAll(selector));
	}

	function isElementNode(node) {
		return node.nodeType === 1;
	}

	function isTextNode(node) {
		return node.nodeType === 3;
	}

	function isCommentNode(node) {
		return node.nodeType === 8;
	}

	function isFragmentNode(node) {
		return node.nodeType === 11;
	}

	assign(dom, {
		query:     query,
		tag:       tagName,
		create:    createNode,

		append: Fn.curry(function(node1, node2) {
			if (Node.prototype.isPrototypeOf(node2)) {
				append(node1, node2);
			}
			else {
				Array.prototype.forEach.call(node2, function(node) {
					append(node1, node);
				});
			}
		}),

		after:     insertAfter,
		before:    insertBefore,
		empty:     empty,
		remove:    function(node) {
			if (Node.prototype.isPrototypeOf(node)) {
				remove(node);
				return;
			}

			Array.prototype.forEach.call(node, remove);
		},
		closest:   closest,
		matches:   matches,
		classes:   getClassList,
		style:     getStyle,
		getClass:  getClass,
		setClass:  setClass,
		isElementNode:  isElementNode,
		isTextNode:     isTextNode,
		isCommentNode:  isCommentNode,
		isFragmentNode: isFragmentNode
	});


	// Templates

	var templates = {};
	var rcomment = /\{\s*\/\*\s*([\s\S]*)\s*\*\/\s*\}$/;

	function fragmentFromChildren(node) {
		var fragment = document.createDocumentFragment();
		Fn(node.childNodes).each(dom.append(fragment));
		return fragment;
	}

	function fragmentFromHTML(html, tag) {
		var fragment = document.createDocumentFragment();
		var node     = document.createElement(tag || 'div');
		node.innerHTML = html;

		if (node.innerHTML !== html) {
			console.warn('Sparky: HTML has been transformed by innerHTML parsing while creating fragment.');
			console.groupCollapsed('Sparky: Compare before and after');
				console.log('This transform may be completely harmless: SVG content or unusual whitespace in tags is transformed without changing DOM structure.');
				console.log(html);
				console.log(node.innerHTML);
			console.groupEnd();
		}

		Fn(node.childNodes).each(dom.append(fragment));
		return fragment;
	}

	function fragmentFromContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		if (!node) { throw new Error('dom: element id="' + id + '" is not in the DOM.') }

		if (node.content) {
			return node.content;
		}

		var tag = dom.tag(node);

		if (tag === 'script') {
			// Data parent is a workaround for browsers that don't support inert
			// templates. Allows the author to specify a context inside which
			// the template is parsed. Where a template has top level <td>s, for
			// example, it should have data-parent="tr", or the <td>s will be
			// removed by the browser.
			return fragmentFromHTML(node.innerHTML, node.getAttribute('data-parent'));
		}
		else if (tag === 'template') {
			// In browsers where templates are not inert, ids used inside them
			// conflict with ids in any rendered result. To go some way to
			// tackling this, remove the node from the DOM.
			remove(node);
		}

		return fragmentFromChildren(node);
	}

	function cloneTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		return template && template.cloneNode(true);
	}

	function multiline(fn) {
		if (typeof fn !== 'function') { throw new TypeError('multiline(fn) expects a function.'); }
		var match = rcomment.exec(fn.toString());
		if (!match) { throw new TypeError('Multiline comment missing.'); }
		return match[1];
	}

	function registerTemplate(id, node) {
		var template;

		if (typeof node === 'function') {
			template = dom.create('template');
			template.innerHTML = multiline(node);
			node = fragmentFromContent(template);
		}

		templates[id] = node;
	}

	assign(dom, {
		template: function(id, node) {
			if (node) { registerTemplate(id, node); }
			else { return cloneTemplate(id); }
		},

		fragmentFromTemplate: cloneTemplate,
		fragmentFromContent: fragmentFromContent
	});


	// Events

	var eventOptions = { bubbles: true };

	function createEvent(type) {
		return new CustomEvent(type, eventOptions);
	}

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(e.target, selector, e.currentTarget);

			if (!node) { return; }

			e.delegateTarget = node;
			return fn(e);
		};
	}

	function isPrimaryButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey);
	}

	function trigger(node, type) {
		// Don't cache events. It prevents you from triggering an an event of a
		// type given type from inside the handler of another event of that type.
		node.dispatchEvent(createEvent(type));
	}

	function on(node, type, fn) {
		node.addEventListener(type, fn);
	}

	function off(node, type, fn) {
		node.removeEventListener(type, fn);
	}

	assign(dom, {
		on:       on,
		off:      off,
		trigger:  trigger,
		delegate: delegate,
		isPrimaryButton: isPrimaryButton
	});


	// Feature tests

	var testEvent = new CustomEvent('featuretest', { bubbles: true });

	function testTemplate() {
		// Older browsers don't know about the content property of templates.
		return 'content' in document.createElement('template');
	}

	function testEventDispatchOnDisabled() {
		// FireFox won't dispatch any events on disabled inputs:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

		var input = document.createElement('input');
		var result = false;

		append(document.body, input);
		input.disabled = true;
		input.addEventListener('featuretest', function(e) { result = true; });
		input.dispatchEvent(testEvent);
		dom.remove(input);

		return result;
	}

	dom.features = {
		template: testTemplate(),
		inputEventsOnDisabled: testEventDispatchOnDisabled()
	};


	// Export
	Sparky.dom = dom;
})(this);


// Sparky.observe()
// Sparky.unobserve()

(function(window) {
	"use strict";

	// Import

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var observe   = window.observe;
	var unobserve = window.unobserve;

	// Utility functions

	var noop = Fn.noop;
	var isDefined = Fn.isDefined;

	// Handle paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(\w+)/;
	var map = [];

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function findByProperty(array, name, value) {
		// Find first matching object in array
		var n = -1;

		while (++n < array.length) {
			if (array[n] && array[n][name] === value) {
				return array[n];
			}
		}
	}

	function observePath3(root, prop, array, fn, notify) {
		function update() {
			Sparky.logVerbose('path resolved to value:', root[prop]);
			fn(root[prop]);
		}

		Sparky.observe(root, prop, update, notify);

		return function() {
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath2(root, prop, array, fn, notify) {
		var destroy = noop;
		var object;

		function update() {
			destroy();

			if (typeof object !== 'object' && typeof object !== 'function') {
				destroy = noop;
				if (notify) { fn(); }
			}
			else {
				destroy = observePath1(object, array.slice(), fn, notify) ;
			}
		}

		function updateSelection() {
			var obj = findByProperty(root, selection[1], JSON.parse(selection[2]));
			// Check that object has changed
			if (obj === object) { return; }
			object = obj;
			update();
		}

		function updateProperty() {
			object = root[prop];
			update();
		}

		var selection = rpropselector.exec(prop);

		if (selection) {
			if (!root.on) {
				throw new Error('Sparky: Sparky.observe trying to observe with property selector on a non-collection.')
			}

			root.on('add remove sort', updateSelection);
			updateSelection();
			notify = true;
			return function() {
				destroy();
				root.off('add remove sort', updateSelection);
			};
		}
			
		Sparky.observe(root, prop, updateProperty, true);
		notify = true;
		return function() {
			destroy();
			Sparky.unobserve(root, prop, updateProperty);
		};
	}

	function observePath1(root, array, fn, notify) {
		if (array.length === 0) { return noop; }

		var prop = array.shift();

		return array.length === 0 ?
			observePath3(root, prop, array, fn, notify) :
			observePath2(root, prop, array, fn, notify) ;
	}

	function observePath(root, path, fn, immediate) {
		// If path refers to root object no observation is possible, but where
		// immediate is defined we should call fn with root.
		if (path === '.') {
			if (immediate) { fn(root); }
			return;
		}

		var array = splitPath(path);

		// Observe path without logs.
		var destroy = observePath1(root, array, fn, immediate || false) ;

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function observePathOnce(root, path, fn) {
		var value = Fn.getPath(path, root);

		if (isDefined(value)) {
			fn(value);
			return;
		}

		var array   = splitPath(path);
		var destroy = observePath1(root, array, update, false);

		// Hack around the fact that the first call to destroy()
		// is not ready yet, becuase at the point update has been
		// called by the observe recursers, the destroy fn has
		// not been returned yet. TODO: Perhaps make direct returns
		// async to get around this (they would be async if they were
		// using Object.observe).
		var hasRun = false;

		function update(value) {
			if (hasRun) { return; }
			if (isDefined(value)) {
				hasRun = true;
				fn(value);
				setTimeout(function() {
					unobservePath(root, path, fn);
				}, 0);
			}
		}

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function unobservePath(root, path, fn) {
		var n = map.length;
		var record;

		// Allow for the call signatures (root) and (root, fn)
		if (typeof path !== 'string') {
			fn = path;
			path = undefined;
		}

		while (n--) {
			record = map[n];
			if ((root === record[0]) &&
				(!path || path === record[1]) &&
				(!fn || fn === record[2])) {
				record[3]();
				map.splice(n, 1);
			}
		}
	}

	Sparky.observePath = Sparky.try(observePath, function message(root, path) {
		return 'Sparky: failed to observe path "' + path + '" in object ' + JSON.stringify(root);
	});

	Sparky.unobservePath = unobservePath;
	Sparky.observePathOnce = observePathOnce;

	// Binding

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
	}

	function Poll(object, property, fn) {
		var v1 = object[property];
		var active = true;

		function frame() {
			var v2 = object[property];

			if (v1 !== v2) {
				v1 = v2;
				fn();
			}

			if (!active) { return; }

			window.requestAnimationFrame(frame);
		}

		function cancel() {
			active = false;
		}

		window.requestAnimationFrame(frame);
		return cancel;
	}

	var unpollers = [];

	function poll(object, property, fn) {
		unpollers.push([object, property, fn, Poll(object, property, fn)]);
		return object;
	}

	function unpoll(object, property, fn) {
		var n = unpollers.length;
		var unpoller;

		while (n--) {
			unpoller = unpollers[n];

			if (object === unpoller[0] && property === unpoller[1] && fn === unpoller[2]) {
				unpoller[3]();
				unpollers.splice(n, 1);
				return object;
			}
		}

		return object;
	}

	Sparky.observe = function(object, property, fn, immediate) {
		if (!object) {
			throw new Error('Sparky: Sparky.observe requires an object!', object, property);
		}

		// AudioParams objects must be polled, as they cannot be reconfigured
		// to getters/setters, nor can they be Object.observed. And they fail
		// to do both of those completely silently. So we test the scope to see
		// if it is an AudioParam and set the observe and unobserve functions
		// to poll.
		if (isAudioParam(object)) {
			return poll(object, property, fn);
		}

		var descriptor;

		if (property === 'length') {
			// Observe length and update the DOM on next
			// animation frame if it changes.
			descriptor = Object.getOwnPropertyDescriptor(object, property);

			if (!descriptor.get && !descriptor.configurable) {
				console.warn && console.warn('Sparky: Are you trying to observe an array?. Sparky is going to observe it by polling. You may want to use a Collection() to avoid this.', object, object instanceof Array);
				console.trace && console.trace();
				return poll(object, property, fn);
			}
		}

		observe(object, property, fn);
		if (immediate) { fn(object); }
	};

	Sparky.unobserve = function(object, property, fn) {
		if (isAudioParam(object)) {
			return unpoll(object, property, fn);
		}

		var descriptor;

		if (property === 'length') {
			descriptor = Object.getOwnPropertyDescriptor(object, property);
			if (!descriptor.get && !descriptor.configurable) {
				return unpoll(object, property, fn);
			}
		}

		return unobserve(object, property, fn);
	};
})(this);

(function(window) {

	var Sparky = window.Sparky;

	function multiline(fn) {
		return fn.toString()
			.replace(/^function.+\{\s*\/\*\s*/, '')
			.replace(/\s*\*\/\s*\}$/, '');
	}

	function replaceStringFn(obj) {
		return function($0, $1) {
			// $1 is the template key. Don't render falsy values like undefined.
			var value = obj[$1];

			return value instanceof Array ?
				value.join(', ') :
				value === undefined || value === null ? '' :
				value ;
		};
	}

	function replaceRegexFn(obj) {
		return function($0, $1, $2) {
			// $1 is the template key in {{key}}, while $2 exists where
			// the template tag is followed by a repetition operator.
			var r = obj[$1];

			if (r === undefined || r === null) { throw new Error("Exception: attempting to build RegExp but obj['"+$1+"'] is undefined."); }

			// Strip out beginning and end matchers
			r = r.source.replace(/^\^|\$$/g, '');

			// Return a non-capturing group when $2 exists, or just the source.
			return $2 ? ['(?:', r, ')', $2].join('') : r ;
		};
	}

	Sparky.render = function render(template, obj) {
		return typeof template === 'function' ?
			multiline(template).replace(Sparky.rsimpletags, replaceStringFn(obj)) :

		template instanceof RegExp ?
			RegExp(template.source
				.replace(/\{\{\s*(\w+)\s*\}\}(\{\d|\?|\*|\+)?/g, replaceRegexFn(obj)),
				(template.global ? 'g' : '') +
				(template.ignoreCase ? 'i' : '') +
				(template.multiline ? 'm' : '')
			) :

			template.replace(Sparky.rsimpletags, replaceStringFn(obj));
	};
})(this);


// Sparky.parse()
//
// Sparky.parse(nodes, get, set, bind, unbind, create);
//
// Parses a collection of DOM nodes and all their descendants looking for
// Sparky tags. For each tag found in the DOM, the bind callback is called
// with the params (path, fn), where path is of the form 'path.to.data' and
// fn is a function to be called when the data at that path changes.

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var dom    = Sparky.dom;

	var attributes = ['href', 'title', 'id', 'style', 'src', 'alt'];

	var aliases = {
		"viewbox": "viewBox"
	};

	// Matches a sparky template tag, capturing (path, filter)
	var rtagstemplate = /({{0}})\s*([\w\-\.]+)\s*(?:\|([^\}]+))?\s*{{1}}/g;
	var rtags;

	// Matches a simple sparky template tag, capturing (path)
	var rsimpletagstemplate = /{{0}}\s*([\w\-\.\[\]]+)\s*{{1}}/g;
	var rsimpletags;

	// Matches tags plus any directly adjacent text
	var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var filterCache = {};


	// Utility functions

	var identity  = Fn.id;
	var isDefined = Fn.isDefined;
	var toClass   = Fn.toClass;

	var slice = Function.prototype.call.bind(Array.prototype.slice);


	// DOM

	function setAttributeSVG(node, attribute, value) {
		if (attribute === 'd' || attribute === "transform" || attribute === "viewBox") {
			node.setAttribute(attribute, value);
		}
		else if (attribute === "href") {
			node.setAttributeNS(Sparky.xlinkNamespace, attribute, value);
		}
		else {
			node.setAttributeNS(Sparky.svgNamespace, attribute, value);
		}
	}

	function setAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function toggleAttributeSVG(node, attribute, value) {
		if (attribute in node) { node[attribute] = !!value; }
		else if (value) { setAttributeSVG(node, attribute, value); }
		else { node.removeAttribute(attribute); }
	}

	function toggleAttributeHTML(node, attribute, value) {
		if (attribute in node) { node[attribute] = !!value; }
		else if (value) { node.setAttribute(attribute, attribute); }
		else { node.removeAttribute(attribute); }
	}

	function addClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}


	// Binding system

	var tags = {
		label: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'for', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		button: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		input: function(node, bind, unbind, get, set, setup, create, unobservers) {
			var type = node.type;

			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindAttribute(node, 'min', bind, unbind, get, unobservers);
			bindAttribute(node, 'max', bind, unbind, get, unobservers);
			bindAttribute(node, 'step', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);

			var unbindName = type === 'number' || type === 'range' ?
			    	// Only let numbers set the value of number and range inputs
			    	parseName(node, get, set, bind, unbind, floatToString, stringToFloat) :
			    // Checkboxes default to value "on" when the value attribute
			    // is not given. Make them behave as booleans.
			    (type === 'checkbox' || type === 'radio') && !isDefined(node.getAttribute('value')) ?
			    	parseName(node, get, set, bind, unbind, boolToStringOn, stringOnToBool) :
			    	// Only let strings set the value of other inputs
			    	parseName(node, get, set, bind, unbind, identity, identity) ;

			if (unbindName) { unobservers.push(unbindName); }

			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		select: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			// Only let strings set the value of selects
			var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			if (unbindName) { unobservers.push(unbindName); }

			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		option: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		textarea: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);

			// Only let strings set the value of a textarea
			var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			if (unbindName) { unobservers.push(unbindName); }
			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		time: function(node, bind, unbind, get, set, setup, create, unobservers)  {
			bindAttributes(node, bind, unbind, get, unobservers, ['datetime']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		svg: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['viewbox']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		g: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['transform']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		path: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['d', 'transform']);
		},

		line: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x1', 'x2', 'y1', 'y2', 'transform']);
		},

		rect: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform']);
		},

		text: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x', 'y', 'dx', 'dy', 'text-anchor']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		use: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['href', 'transform']);
		},

		template: Sparky.noop,
		script: Sparky.noop
	};

	var parsers = {
		1: function domNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];
			var tag = node.tagName.toLowerCase();

			if (Sparky.debug === 'verbose') { console.group('Sparky: dom node: ', node); }
			bindClasses(node, bind, unbind, get, unobservers);
			bindAttributes(node, bind, unbind, get, unobservers, attributes);

			// Set up special bindings for certain tags, like form inputs
			if (tags[tag]) {
				tags[tag](node, bind, unbind, get, set, setup, create, unobservers);
			}

			// Or sparkify the child nodes
			else {
				bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
			}

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		},

		3: function textNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];

			if (Sparky.debug === 'verbose') { console.group('Sparky: text node:', node); }
			observeProperties(node.nodeValue, bind, unbind, get, function(text) {
				node.nodeValue = text;
			}, unobservers);

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		},

		11: function fragmentNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];

			if (Sparky.debug === 'verbose') { console.group('Sparky: fragment: ', node); }
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		}
	};

	function bindNodes(node, bind, unbind, get, set, setup, create, unobservers) {
		// Document fragments do not have a getAttribute method.
		var id = node.getAttribute && node.getAttribute('data-template');
		var template, nodes;

		if (isDefined(id)) {
			// Node has a data-template attribute
			template = Sparky.template(id);

			// If the template does not exist, do nothing
			if (!template) {
				Sparky.log('template "' + id + '" not found in DOM.');
				return;
			}

			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM
			nodes = slice(template.childNodes);

			// Wait for scope to become available with a self-unbinding function
			// before appending the template to the DOM. BE AWARE, here, that
			// this could throw a bug in the works: we're currently looping over
			// bindings outside of the call to bind, and inside we call unbind,
			// which modifies bindings... see? It won't bug just now, becuase
			// reverse loops, but if you change anything...
			setup(function domify() {
				Sparky.dom.empty(node);
				Sparky.dom.append(node, template);
			});
		}
		else {
			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM.
			nodes = slice(node.childNodes);
		}

		var n = -1;
		var l = nodes.length;
		var child;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute && (
				isDefined(child.getAttribute('data-fn')) ||
				isDefined(child.getAttribute('data-scope'))
			)) {
				create(child);
				//unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (parsers[child.nodeType]) {
				unobservers.push.apply(unobservers, parsers[child.nodeType](child, bind, unbind, get, set, setup, create));
			}
		}
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var classes = dom.getClass(node);

		// If there are no classes, go no further
		if (!classes) { return; }

		// Remove tags and store them
		rclasstags.lastIndex = 0;
		var tags = [];
		var text = classes.replace(rclasstags, function($0) {
			tags.push($0);
			return '';
		});

		// Where no tags have been found, go no further
		if (!tags.length) { return; }

		// Now that we extracted the tags, overwrite the class with remaining text
		dom.setClass(node, text);

		// Create an update function for keeping sparky's classes up-to-date
		var classList = dom.classes(node);
		var update = function update(newText, oldText) {
		    	if (oldText && rtext.test(oldText)) { removeClasses(classList, oldText); }
		    	if (newText && rtext.test(newText)) { addClasses(classList, newText); }
		    };

		if (Sparky.debug === 'verbose') { console.log('Sparky: bind class="' + classes + ' ' + tags.join(' ') + '"'); }

		observeProperties(tags.join(' '), bind, unbind, get, update, unobservers);
	}

	function bindAttributes(node, bind, unbind, get, unobservers, attributes) {
		var a = attributes.length;

		while (a--) {
			bindAttribute(node, attributes[a], bind, unbind, get, unobservers);
		}
	}

	function bindAttribute(node, attribute, bind, unbind, get, unobservers) {
		// Look for data- aliased attributes before attributes. This is
		// particularly important for the style attribute in IE, as it does not
		// return invalid CSS text content, so Sparky can't read tags in it.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = aliases[attribute] || attribute ;
		var value = alias ? alias :
		//    	isSVG ? node.getAttributeNS(Sparky.xlinkNamespace, attr) || node.getAttribute(attr) :
		    	node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = setAttributeHTML.bind(null, node, attr) ;

		observeProperties(value, bind, unbind, get, update, unobservers);
	}

	function bindBooleanAttribute(node, attribute, bind, unbind, get, unobservers) {
		// Look for data- aliased attributes before attributes. This is
		// particularly important for the style attribute in IE, as it does not
		// return invalid CSS text content, so Sparky can't read tags in it.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = attribute ;
		var value = alias ? alias : node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = toggleAttributeHTML.bind(null, node, attr) ;
		observeBoolean(value.trim(), bind, unbind, get, update, unobservers);
	}

	function observeBoolean(text, bind, unbind, get, fn, unobservers) {
		Sparky.rtags.lastIndex = 0;
		var tokens = Sparky.rtags.exec(text);

		if (!tokens) { return; }
		var replace = makeReplaceText(get);

		function update() {
			Sparky.rtags.lastIndex = 0;
			var value = replace.apply(null, tokens);
			fn(value);
		}

		// Live tag
		if (tokens[1].length === 2) {
			unobservers.push(observeProperties2(bind, unbind, update, [tokens[2]]));
		}
		// Dead tag
		else {
			// Scope is not available yet. We need to wait for it. Todo: This
			// should be done inside the Sparky constructor.
			window.requestAnimationFrame(update);
		}
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filter[parts[1]],

			// Leave the first arg empty. It will be populated with the value to
			// be filtered when the filter fn is called.
			args: parts[2] && JSON.parse('["",' + parts[2].replace(/'/g, '"') + ']') || []
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
		    	filterCache[filterString] = filterString.split('|').map(toFilter)
		    );
		var l = filters.length;
		var n = -1;
		var args;

		// Todo: replace this mechanism with a functor.

		while (++n < l) {
			if (!isDefined(word)) { break; }

			if (!filters[n].fn) {
				throw new Error('Sparky: filter \'' + filters[n].name + '\' does not exist in Sparky.filter');
			}

			if (Sparky.debug === 'verbose') {
				console.log('Sparky: filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}

			args = filters[n].args;
			args[0] = word;
			word = filters[n].fn.apply(null, args);
		}

		return word;
	}

	function extractProperties(str, live, dead) {
		Sparky.rtags.lastIndex = 0;
		str.replace(Sparky.rtags, function($0, $1, $2){
			// Sort the live properties from the dead properties.
			var i;

			// If it's already in live, our work here is done
			if (live.indexOf($2) !== -1) { return; }

			// It's a live tag, so put it in live, and if it's already
			// in dead remove it from there.
			if ($1.length === 2) {
				live.push($2);
				i = dead.indexOf($2);
				if (i !== -1) { dead.splice(i, 1); }
			}

			// It's a dead tag, check if it's in dead and if not stick
			// it in there.
			else if (dead.indexOf($2) === -1) {
				dead.push($2);
			}
		});
	}

	function makeReplaceText(get) {
		return function replaceText($0, $1, $2, $3) {
			var value = $3 ? applyFilters(get($2), $3) : get($2) ;
			var type = typeof value;

			return !isDefined(value) ? '' :
				type === 'string' ? value :
				type === 'number' ? value :
				type === 'boolean' ? value :
				// Beautify the .toString() result of functions
				type === 'function' ? (value.name || 'function') + (rarguments.exec(value.toString()) || [])[1] :
				// Use just the Class string in '[object Class]'
				toClass(value) ;
		}
	}

	function makeUpdateText(text, get, fn) {
		var replaceText = makeReplaceText(get);
		var oldText;

		return function updateText() {
			Sparky.rtags.lastIndex = 0;
			var newText = text.replace(Sparky.rtags, replaceText);
			fn(newText, oldText);
			oldText = newText;
		}
	}

	function observeProperties(text, bind, unbind, get, fn, unobservers) {
		var live = [];
		var dead = [];

		// Populate live and dead property lists
		extractProperties(text, live, dead);

		if (live.length === 0 && dead.length === 0) { return; }

		var update = makeUpdateText(text, get, fn);

		if (live.length) {
			unobservers.push(observeProperties2(bind, unbind, update, live));
		}
		else {
			// Scope is not available yet. We need to wait for it. Todo: This
			// should be done inside the Sparky constructor.
			window.requestAnimationFrame(update);
		}
	}

	function observeProperties2(bind, unbind, update, properties) {
		// Observe properties that are to be live updated
		properties.forEach(function(property) {
			bind(property, update);
		});

		// Return a function that destroys live bindings
		return function destroyBinding() {
			properties.forEach(function(property) {
				// Unobserve properties
				unbind(property, update);
			});
		};
	}


	// Forms elements
	//
	// 2-way binding for form elements. HTML form elements are hard. They do
	// all sorts of strange things such as having a default value of string
	// 'on' where a value attribute is not given. This set of functions handles
	// 2-way binding between a node and an object. They are deliberately strict.

	function stringToFloat(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			n ;
	}

	function stringToInt(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			Math.round(n) ;
	}

	function stringToBool(value) {
		return value === 'false' ? false :
			value === '0' ? false :
			value === '' ? false :
			!!value ;
	}

	function stringOnToBool(value) {
		return value === 'on' ;
	}

	function definedToString(value) {
		return isDefined(value) ? value + '' :
			undefined ;
	}

	function floatToString(value) {
		return typeof value === 'number' ? value + '' :
			undefined ;
	}

	function intToString(value) {
		return typeof value === 'number' && value % 1 === 0 ? value + '' :
			undefined ;
	}

	function boolToString(value) {
		return typeof value === 'boolean' ? value + '' :
			typeof value === 'number' ? !!value + '' :
			undefined ;
	}

	function boolToStringOn(value) {
		return typeof value === 'boolean' || typeof value === 'number' ?
			value ? 'on' : '' :
			undefined ;
	}

	function dispatchInputChangeEvent(node) {
		// FireFox won't dispatch any events on disabled inputs so we need to do
		// a little dance, enabling it quickly, sending the event and disabling
		// it again.
		if (!dom.features.inputEventsOnDisabled && node.disabled) {
			node.disabled = false;

			// We have to wait, though. It's not clear why. This makes it async,
			// but let's not worry too much about that.
			Fn.requestTick(function() {
				Sparky.dom.trigger(node, 'valuechange');
				node.disabled = true;
			});
		}
		else {
			Sparky.dom.trigger(node, 'valuechange');
		}
	}

	function makeUpdateInput(node, get, set, path, fn) {
		var type = node.type;
		var init = true;

		return type === 'radio' || type === 'checkbox' ?
			function updateChecked() {
				var value = fn(get(path));
				var checked;

				if (init) {
					init = false;
					if (!isDefined(value) && node.checked) {
						// Avoid setting the value from the scope on initial run
						// where there is no scope value. The change event will
						// be called and the scope updated from the default value.
						dispatchInputChangeEvent(node);
						return;
					}
				}

				checked = node.value === value;

				// Don't set checked state if it already has that state, and
				// certainly don't simulate a change event.
				if (node.checked === checked) { return; }

				node.checked = checked;
				dispatchInputChangeEvent(node);
			} :
			function updateValue() {
				var value = fn(get(path));

				if (init) {
					init = false;
					if (!isDefined(value)) {
						// Avoid setting the value from the scope on initial run
						// where there is no scope value. The change event will be
						// called and the scope updated from the default value.
						
						// Avoid sending to selects, as we do not rely on Bolt
						// for setting state on select labels anymore...
						if (Sparky.dom.tag(node) !== "select") { dispatchInputChangeEvent(node); }
						return;
					}
				}

				if (typeof value === 'string') {
					// Check against the current value - resetting the same
					// string causes the cursor to jump in inputs, and we dont
					// want to send a change event where nothing changed.
					if (node.value === value) { return; }
					node.value = value;
				}
				else {
					// Be strict about setting strings on inputs
					node.value = '';
				}

				// Avoid sending to selects, as we do not rely on Bolt
				// for setting state on select labels anymore...
				if (Sparky.dom.tag(node) !== "select") { dispatchInputChangeEvent(node); }
			} ;
	}

	function makeChangeListener(node, set, path, fn) {
		var type = node.type;

		return type === 'radio' ? function radioChange(e) {
				if (node.checked) {
					set(path, fn(node.value));
				}
			} :
			type === 'checkbox' ? function checkboxChange(e) {
				set(path, fn(node.checked ? node.value : undefined));
			} :
			function valueChange(e) {
				set(path, fn(node.value));
			} ;
	}

	function bindValue(node, get, set, bind, unbind, path, to, from) {
		var update = makeUpdateInput(node, get, set, path, to);
		var change = makeChangeListener(node, set, path, from);

		node.addEventListener('change', change);
		node.addEventListener('input', change);

		// Wait for animation frame to let Sparky fill in tags in value, min
		// and max before controlling.
		var request = window.requestAnimationFrame(function() {
			request = false;

			// Where the model does not have value, set it from the node value.
			if (!isDefined(get(path))) {
				change();
			}
		});

		bind(path, update);

		return function() {
			node.removeEventListener('change', change);
			node.removeEventListener('input', change);

			if (request) {
				window.cancelAnimationFrame(request);
			}

			unbind(path, update);
		};
	}

	function parse(nodes, get, set) {
		var results = {
			setups: [],
			bindings: [],
			nodes: []
		};

		// Todo: This is convoluted legacy crap. Sort it out.

		results.teardowns = Array.prototype.concat.apply([], nodes.map(function(node) {
			return parsers[node.nodeType](
				node,
				function bind(path, fn) {
					results.bindings.push([path, fn, Fn.Throttle(fn)]);
				},
				function unbind(fn) {
					var bindings = results.bindings;
					var n = bindings.length;
					while (n--) {
						if (bindings[n][1] === fn) {
							bindings.splice(n, 1);
							return;
						}
					}
				},
				get,
				set,
				function setup(fn) {
					results.setups.push(fn);
				},
				function create(node) {
					results.nodes.push(node);
				}
			);
		}));

		return results;
	}

	function parseName(node, get, set, bind, unbind, to, from) {
		if (Sparky.debug === "verbose" && !node.name) {
			console.warn('Sparky: Cannot bind value of node with empty name.', node);
			return;
		}

		// Search name for tags. Data bind the first live tag and remove the tag
		// parentheses to prevent this node from being name-value bound by other
		// controllers.
		// Todo: This is weird semantics: {{prop}} changes value, {{{prop}}}
		// changes name. Think about this. Hard.
		var tag, fn;

		Sparky.rtags.lastIndex = 0;
		while ((tag = Sparky.rtags.exec(node.name))) {
			if (tag[1].length === 2) {
				fn = bindValue(node, get, set, bind, unbind, tag[2], to, from);
				node.name = node.name.replace(tag[0], tag[2]);
				break;
			}
		}

		return fn;
	}


	// Set up Sparky.tags(), Sparky.rtags, Sparky.rsimpletags

	function changeTags(ropen, rclose) {
		rtags = Sparky.render(rtagstemplate, arguments);
		rsimpletags = Sparky.render(rsimpletagstemplate, arguments);
		rclasstags = Sparky.render(rclasstagstemplate, arguments);
	}

	Object.defineProperties(Sparky, {
		rtags: {
			get: function() { return rtags; },
			enumerable: true
		},

		rsimpletags: {
			get: function() { return rsimpletags; },
			enumerable: true
		}
	});

	changeTags(/\{{2,3}/, /\}{2,3}/);


	// Export

	assign(Sparky, {
		parse: parse,
		parseName: parseName,
		bindValue: bindValue,
		attributes: attributes,

		stringToInt:     stringToInt,
		stringToFloat:   stringToFloat,
		stringToBool:    stringToBool,
		stringOnToBool:  stringOnToBool,
		definedToString: definedToString,
		intToString:     intToString,
		floatToString:   floatToString,
		boolToString:    boolToString,
		boolToStringOn:  boolToStringOn,

		tags:            changeTags,
		rspaces:         rspaces
	});
})(this);


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

	// Detect IE
	var isIE = !!(document.all && document.compatMode || window.navigator.msPointerEnabled);

	// Logs nodes, scopes and data.
	Sparky.fn.log = function(node, scopes) {
		var sparky = this;

		// In IE11 and probably below, and possibly Edge, who knows,
		// console.groups can arrive in really weird orders. They are not at all
		// useful for debugging as a result. Rely on console.log.

		function log(scope) {
			console[isIE ? 'log' : 'group']('Sparky: scope ' + Sparky.nodeToString(node));
			console.log('data ', sparky.data);
			console.log('scope', scope);
			console.log('fn   ', sparky.fn);
			console[isIE ? 'log' : 'groupEnd']('---');
		}

		console[isIE ? 'log' : 'group']('Sparky: run   ' + Sparky.nodeToString(node));
		console.log('data ', sparky.data);
		console[isIE ? 'log' : 'groupEnd']('---');

		return scopes.tap(log);
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
	var dom    = Sparky.dom;

	assign(Sparky.fn, {
		"remove-hidden": function(node, scopes) {
			scopes.tap(function() {
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
		html: function(node, scopes) {
			scopes.tap(function(html) {
				node.innerHTML = html;
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var Fn = window.Fn;

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

		"ajax-on-submit": function(node, scopes) {
			var method = node.getAttribute('method') || 'POST';
			var url = node.getAttribute('action');

			if (!Fn.isDefined(url)) {
				throw new Error('Sparky: fn ajax-on-submit requires an action="url" attribute.');
			}

			var submit;

			node.addEventListener('submit', preventDefault);

			scopes.tap(function(scope) {
				if (submit) { node.removeEventListener(submit); }
				submit = function(e) {
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

			this
			.on('destroy', function() {
				node.removeEventListener('submit', submit);
			});
		},

		"scope": function(node, scopes) {
			scopes.tap(function(scope) {
				Sparky.setScope(node, scope);
			});
		}
	});
})(this);


(function() {
	"use strict";

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

(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var DOM    = Sparky.dom;

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 8000;

	//function create(boss, node, scope, fn) {
	//	// Create a dependent sparky without delegating scope
	//	var sparky = Sparky(node, scope, fn, this);
	//
	//	function delegateDestroy() { sparky.destroy(); }
	//	function delegateRender(self) { sparky.render(); }
	//
	//	// Bind events
	//	boss
	//	.on('destroy', delegateDestroy)
	//	.on('render', delegateRender);
	//
	//	return sparky.on('destroy', function() {
	//		boss
	//		.off('destroy', delegateDestroy)
	//		.off('render', delegateRender);
	//	});
	//}

	function createPlaceholder(node) {
		if (!Sparky.debug) { return DOM.create('text', ''); }

		var attrScope = node.getAttribute('data-scope');
		var attrCtrl = node.getAttribute('data-fn');

		return DOM.create('comment',
			(attrScope ? ' data-scope="' + attrScope + '"' : '') +
			(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
	}

	Sparky.fn.each = function setupCollection(node, scopes) {
		var sparky   = this;
		var data     = this.data;
		var sparkies = [];
		var cache    = [];

		// We cannot use a WeakMap here: WeakMaps do not accept primitives as
		// keys, and a Sparky scope may be a number or a string, although that
		// is unusual and perhaps we should ban it.
		var rejects  = new Map();
		var scheduled = [];
		var clone    = node.cloneNode(true);
		var fns      = this.interrupt();
		var placeholder = createPlaceholder(node);
		var collection;

		fns.unshift(function() {
			this.data = Object.create(data);
		});

		var throttle = Fn.Throttle(function update() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, object, t;

			if (Sparky.debug) { t = window.performance.now(); }

			// Compare the cached version of the collection against the
			// collection and construct a map of found object positions.
			while (l--) {
				object = cache[l];
				i = collection.indexOf(object);

				if (i === -1) {
					DOM.remove(sparkies[l][0]);
					rejects.set(object, sparkies[l]);
					scheduled.push(object);
				}
				else {
					map[i] = sparkies[l];
				}
			}

			l = sparkies.length = cache.length = collection.length;

			// Ignore any objects at the start of the collection that have
			// not changed position. Optimises for case where we're pushing
			// things on the end.
			while(cache[++n] && cache[n] === collection[n]);
			--n;

			// Loop through the collection, recaching objects and creating
			// sparkies where needed.
			while(++n < l) {
				object = cache[n] = collection[n];
				removeScheduled(object);

				// KEEP AN EYE ON THIS!!!
				// It used to be that we created a standalone sparky, not a child
				// sparky. As in:
				//
				// create(sparky, clone.cloneNode(true), object, fns);
				//
				// This seems to have changed when we converted to streams.
				// I'm no longer clear why...

				sparkies[n] = map[n] || rejects.get(object) || sparky.create(clone.cloneNode(true), object, fns);


				// We are in an animation frame. Go ahead and manipulate the DOM.
				DOM.before(placeholder, sparkies[n][0]);
			}

			Sparky.log(
				'collection rendered (length: ' + collection.length +
				', time: ' + (window.performance.now() - t) + 'ms)'
			);

			reschedule();
		});

		var timer;

		function reschedule() {
			clearTimeout(timer);
			timer = setTimeout(function() {
				scheduled.forEach(function(object) {
					rejects.get(object).destroy();
					rejects.delete(object);
				});
				scheduled.length = 0;
			}, destroyDelay);
		}

		function removeScheduled(object) {
			var i = scheduled.indexOf(object);
			if (i === -1) { return; }
			scheduled.splice(i, 1);
		}

		function observeCollection() {
			if (collection.on) {
				collection.on('add remove sort', throttle);
				throttle();
			}
			else {
				Sparky.observe(collection, 'length', throttle);
			}
		}

		function unobserveCollection() {
			if (collection.on) {
				collection.off('add remove sort', throttle);
			}
			else {
				Sparky.unobserve(collection, 'length', throttle);
			}
		}

		// Stop Sparky trying to bind the same scope and ctrls again.
		clone.removeAttribute('data-scope');
		clone.removeAttribute('data-fn');

		// Put the placeholder in place and remove the node
		DOM.before(node, placeholder);
		DOM.remove(node);

		scopes
		.dedup()
		.each(function(scope) {
			if (collection) { unobserveCollection(); }
			collection = scope;
			if (collection) { observeCollection(); }
		});

		this
		.on('destroy', function destroy() {
			throttle.cancel();
			unobserveCollection();
		});
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var noop   = Fn.noop;
	var stringToInt = Sparky.stringToInt;
	var stringToFloat = Sparky.stringToFloat;
	var stringToBool = Sparky.stringToBool ;
	var stringOnToBool = Sparky.stringOnToBool;
	var definedToString = Sparky.definedToString;
	var floatToString = Sparky.floatToString;
	var boolToString = Sparky.boolToString;
	var boolToStringOn = Sparky.boolToStringOn;

	// Controllers

	function setup(sparky, node, scopes, to, from) {
		var scope, path, fn;
		var unbind = Sparky.parseName(node, function get(name) {
			return Fn.getPath(name, scope);
		}, function set(name, value) {
			return scope && Fn.setPath(name, value, scope);
		}, function bind(p, f) {
			path = p;
			fn = f;
		}, noop, to, from);

		sparky
		.on('destroy', function() {
			unbind();
			if (scope) { Sparky.unobservePath(scope, path, fn); }
		});

		return scopes.tap(function update(object) {
			if (scope) { Sparky.unobservePath(scope, path, fn); }
			scope = object;
			if (scope) { Sparky.observePath(scope, path, fn, true); }
		});
	}

	function valueAny(node, scopes) {
		// Coerce any defined value to string so that any values pass the type checker
		setup(this, node, scopes, definedToString, Fn.id);
	}

	function valueString(node, scopes) {
		// Don't coerce so that only strings pass the type checker
		setup(this, node, scopes, Fn.id, Fn.id);
	}

	function valueNumber(node, scopes) {
		setup(this, node, scopes, floatToString, stringToFloat);
	}

	function valueInteger(node, scopes) {
		setup(this, node, scopes, floatToString, stringToInt);
	}

	function valueBoolean(node, scopes) {
		if (node.type === 'checkbox' && !Fn.isDefined(node.getAttribute('value'))) {
			setup(this, node, scopes, boolToStringOn, stringOnToBool);
		}
		else {
			setup(this, node, scopes, boolToString, stringToBool);
		}
	}

	function valueInArray(node, scopes) {
		var array;

		function to(arr) {
			if (arr === undefined) { return ''; }

			array = arr;
			var i = array.indexOf(node.value);

			return i > -1 ? node.value : '' ;
		}

		function from(value) {
			if (array === undefined) { array = Collection(); }

			var i;

			if (value === undefined) {
				i = array.indexOf(node.value);
				if (i !== -1) { array.splice(i, 1); }
			}
			else if (array.indexOf(value) === -1) {
				array.push(value);
			}

			return array;
		}

		setup(this, node, scopes, to, from);
	}

	function valueIntInArray(node, scopes) {
		var array;

		function to(arr) {
			if (arr === undefined) { return ''; }

			var value = stringToInt(node.value);
			array = arr;
			var i = array.indexOf(value);

			return i > -1 ? floatToString(value) : '' ;
		}

		function from(value) {
			if (array === undefined) { array = Collection(); }

			var i;

			if (value === undefined) {
				i = array.indexOf(stringToInt(node.value));
				if (i !== -1) { array.splice(i, 1); }
			}
			else if (array.indexOf(value) === -1) {
				array.push(value);
			}

			return array;
		}

		setup(this, node, scopes, to, Fn.compose(from, stringToInt));
	}

	function valueFloatPow2(node, scopes) {
		var normalise, denormalise;

		function updateMinMax() {
			var min = node.min ? parseFloat(node.min) : 0 ;
			var max = node.max ? parseFloat(node.max) : 1 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.pow(normalise(value), 1/2)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return denormalise(Math.pow(normalise(n), 2));
		}

		setup(this, node, scopes, to, from);
	}

	function valueFloatPow3(node, scopes) {
		var normalise, denormalise;

		function updateMinMax() {
			var min = node.min ? parseFloat(node.min) : 0 ;
			var max = node.max ? parseFloat(node.max) : 1 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.pow(normalise(value), 1/3)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return denormalise(Math.pow(normalise(n), 3));
		}

		setup(this, node, scopes, to, from);
	}

	function valueFloatLog(node, scopes) {
		var min, max, normalise, denormalise;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 1 ;
			max = node.max ? parseFloat(node.max) : 10 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);

			if (min <= 0) {
				console.warn('Sparky.fn["value-float-log"] cannot accept a min attribute of 0 or lower.', node);
				return;
			}
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.log(value / min) / Math.log(max / min)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return min * Math.pow(max / min, normalise(n));
		}

		setup(this, node, scopes, to, from);
	}

	function valueIntLog(node, scopes) {
		var min, max, normalise, denormalise;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 1 ;
			max = node.max ? parseFloat(node.max) : 10 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);

			if (min <= 0) {
				console.warn('Sparky.fn["value-int-log"] cannot accept a min attribute of 0 or lower.', node);
				return;
			}
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.log(Math.round(value) / min) / Math.log(max / min)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return Math.round(min * Math.pow(max / min, normalise(n)));
		}

		setup(this, node, scopes, to, from);
	}

	assign(Sparky.fn, {
		'value-any':            valueAny,
		'value-string':         valueString,
		'value-int':            valueInteger,
		'value-float':          valueNumber,
		'value-boolean':        valueBoolean,
		'value-int-log':        valueIntLog,
		'value-float-log':      valueFloatLog,
		'value-float-pow-2':    valueFloatPow2,
		'value-float-pow-3':    valueFloatPow3,
		'value-in-array':       valueInArray,
		'value-int-in-array':   valueIntInArray
	});
})(this);


// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var isDefined = Fn.isDefined;
	var settings  = (Sparky.settings = Sparky.settings || {});

	function createList(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	// Language settings
	settings.en = {
		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
		months:   ('January February March April May June July August September October November December').split(' '),
		ordinals: createList({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
	};

	settings.fr = {
		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
		ordinals: createList({ n: "ième", 1: "er" })
	};

	settings.de = {
		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
		ordinals: createList({ n: "er" })
	};

	settings.it = {
		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
		ordinals: createList({ n: "o" })
	};

	// Document language
	var lang = document.documentElement.lang;
	settings.lang = lang && settings[lang] ? lang : 'en';

	function spaces(n) {
		var s = '';
		while (n--) { s += ' '; }
		return s;
	}

	var rletter = /([YMDdHhms]{2,4}|[a-zA-Z])/g;
	//var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
	var rnonzeronumbers = /[1-9]/;

	function createDate(value) {
		// Test the Date constructor to see if it is parsing date
		// strings as local dates, as per the ES6 spec, or as GMT, as
		// per pre ES6 engines.
		// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#ECMAScript_5_ISO-8601_format_support
		var date = new Date(value);
		var json = date.toJSON();
		var gmt =
			// It's GMT if the first characters of the json match
			// the value...
			json.slice(0, value.length) === value &&

			// ...and if all remaining numbers in the json are 0.
			!json.slice(value.length).match(rnonzeronumbers) ;

		return typeof value !== 'string' ? new Date(value) :
			// If the Date constructor parses to gmt offset the date by
			// adding the date's offset in milliseconds to get a local
			// date. getTimezoneOffset returns the offset in minutes.
			gmt ? new Date(+date + date.getTimezoneOffset() * 60000) :

			// Otherwise use the local date.
			date ;
	}

	Sparky.filter = {
		add: function(value, n) {
			var result = parseFloat(value) + n ;
			if (Number.isNaN(result)) { return; }
			return result;
		},

		capfirst: function(value) {
			return value.charAt(0).toUpperCase() + value.substring(1);
		},

		cut: function(value, string) {
			return Sparky.filter.replace(value, string, '');
		},

		formatdate: (function(settings) {
			var formatters = {
				YYYY: function(date) { return ('000' + date.getFullYear()).slice(-4); },
				YY:   function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				MM:   function(date) { return ('0' + (date.getMonth() + 1)).slice(-2); },
				MMM:  function(date) { return this.MMMM(date).slice(0,3); },
				MMMM: function(date) { return settings[lang].months[date.getMonth()]; },
				DD:   function(date) { return ('0' + date.getDate()).slice(-2); },
				d:    function(date) { return '' + date.getDay(); },
				dd:   function(date) { return ('0' + date.getDay()).slice(-2); },
				ddd:  function(date) { return this.dddd(date).slice(0,3); },
				dddd: function(date) { return settings[lang].days[date.getDay()]; },
				HH:   function(date) { return ('0' + date.getHours()).slice(-2); },
				mm:   function(date) { return ('0' + date.getMinutes()).slice(-2); },
				ss:   function(date) { return ('0' + date.getSeconds()).slice(-2); },
				sss:  function(date) { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
			};
			
			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			};
		})(settings),

		date: (function(settings) {
			var formatters = {
				a: function(date) { return date.getHours() < 12 ? 'a.m.' : 'p.m.'; },
				A: function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; },
				b: function(date, lang) { return settings[lang].months[date.getMonth()].toLowerCase().slice(0,3); },
				c: function(date) { return date.toISOString(); },
				d: function(date) { return date.getDate(); },
				D: function(date, lang) { return settings[lang].days[date.getDay()].slice(0,3); },
				//e: function(date) { return ; },
				//E: function(date) { return ; },
				//f: function(date) { return ; },
				F: function(date, lang) { return settings[lang].months[date.getMonth()]; },
				g: function(date) { return date.getHours() % 12; },
				G: function(date) { return date.getHours(); },
				h: function(date) { return ('0' + date.getHours() % 12).slice(-2); },
				H: function(date) { return ('0' + date.getHours()).slice(-2); },
				i: function(date) { return ('0' + date.getMinutes()).slice(-2); },
				//I: function(date) { return ; },
				j: function(date) { return date.getDate(); },
				l: function(date, lang) { return settings[lang].days[date.getDay()]; },
				//L: function(date) { return ; },
				m: function(date) { return ('0' + date.getMonth()).slice(-2); },
				M: function(date, lang) { return settings[lang].months[date.getMonth()].slice(0,3); },
				n: function(date) { return date.getMonth(); },
				//o: function(date) { return ; },
				O: function(date) {
					return (date.getTimezoneOffset() < 0 ? '+' : '-') +
						 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
				},
				r: function(date) { return date.toISOString(); },
				s: function(date) { return ('0' + date.getSeconds()).slice(-2); },
				S: function(date) { return settings.ordinals[date.getDate()]; },
				//t: function(date) { return ; },
				//T: function(date) { return ; },
				U: function(date) { return +date; },
				w: function(date) { return date.getDay(); },
				//W: function(date) { return ; },
				y: function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				Y: function(date) { return date.getFullYear(); },
				//z: function(date) { return ; },
				Z: function(date) { return -date.getTimezoneOffset() * 60; }
			};

			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			};
		})(settings),

		decibels: function(value) {
			if (typeof value !== 'number') { return; }
			return 20 * Math.log10(value);
		},

		decimals: function(value, n) {
			if (typeof value !== 'number') { return; }
			return Number.prototype.toFixed.call(value, n);
		},

		divide: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value / n;
		},

		escape: (function() {
			var pre = document.createElement('pre');
			var text = document.createTextNode('');

			pre.appendChild(text);

			return function(value) {
				text.textContent = value;
				return pre.innerHTML;
			};
		})(),

		'find-in': function(id, path) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		},

		first: function(value) {
			return value[0];
		},

		floatformat: function(value, n) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		},

		floor: function(value) {
			return Math.floor(value);
		},

		get: function(value, name) {
			return isDefined(value) ? Fn.get(name, value) : undefined ;
		},

		"greater-than": function(value1, value2) {
			return value1 > value2;
		},

		contains: function(array, value) {
			return (array && array.indexOf(value) > -1);
		},

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		is: Fn.is,
		equals: Fn.equals,

		join: function(value, string) {
			return Array.prototype.join.call(value, string);
		},

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		length: function(value) {
			return value.length;
		},

		"less-than": function(value1, value2, str1, str2) {
			return value1 < value2 ? str1 : str2 ;
		},

		//length_is
		//linebreaks

		//linebreaksbr: (function() {
		//	var rbreaks = /\n/;
		//
		//	return function(value) {
		//		return value.replace(rbreaks, '<br/>')
		//	};
		//})(),

		localise: function(value, digits) {
			var locale = document.documentElement.lang;
			var options = {};

			if (isDefined(digits)) {
				options.minimumFractionDigits = digits;
				options.maximumFractionDigits = digits;
			}

			// Todo: localise value where toLocaleString not supported
			return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
		},

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: function(array, method, path) {
			return array && array.map(Fn[method](path));
		},

		mod: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value % n;
		},

		multiply: function(value, n) {
			return value * n;
		},

		not: Fn.not,

		parseint: function(value) {
			return parseInt(value, 10);
		},

		percent: function(value) {
			return value * 100;
		},

		pluralise: function(value, str1, str2, lang) {
			if (typeof value !== 'number') { return; }

			str1 = str1 || '';
			str2 = str2 || 's';

			// In French, numbers less than 2 are considered singular, where in
			// English, Italian and elsewhere only 1 is singular.
			return lang === 'fr' ?
				(value < 2 && value >= 0) ? str1 : str2 :
				value === 1 ? str1 : str2 ;
		},

		postpad: function(value, n) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		},

		prepad: function(value, n, char) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var array = [];

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		},

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: function(array, name, initialValue) {
			return array && array.reduce(Fn[name], initialValue || 0);
		},

		replace: function(value, str1, str2) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		},

		round: function(value) {
			if (typeof value !== 'number') { return; }
			return Math.round(value);
		},

		//reverse

		//safe: function(string) {
		//	if (typeof string !== string) { return; }
		//	// Actually, we can't do this here, because we cant return DOM nodes
		//	return;
		//},

		//safeseq

		slice: function(value, i0, i1) {
			return typeof value === 'string' ?
				value.slice(i0, i1) :
				Array.prototype.slice.call(value, i0, i1) ;
		},

		slugify: function(value) {
			if (typeof value !== 'string') { return; }
			return value.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
		},

		//sort
		//stringformat

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

			return function(value) {
				return value.replace(rtag, '');
			};
		})(),

		switch: function(value) {
			if (typeof value === 'string') { value = parseInt(value, 10); }
			if (typeof value !== 'number' || Number.isNaN(value)) { return; }
			return arguments[value + 1];
		},

		symbolise: function(value) {
			// Takes infinity values and convert them to infinity symbol
			var string = value + '';
			var infinity = Infinity + '';

			if (string === infinity) { return '∞'; }
			if (string === ('-' + infinity)) { return '-∞'; }
			return value;
		},

		time: function() {

		},

		//timesince
		//timeuntil
		//title

		trans: function(value) {
			var translations = Sparky.data.translations;

			if (!translations) {
				console.warn('Sparky: You need to provide Sparky.data.translations');
				return value;
			}

			var text = translations[value] ;

			if (!text) {
				console.warn('procsea: You need to provide a translation for "' + value + '"');
				return value;
			}

			return text ;
		},

		truncatechars: function(value, n) {
			return value.length > n ?
				value.slice(0, n) + '…' :
				value ;
		},

		type: function(value) {
			return typeof value;
		},

		//truncatewords
		//truncatewords_html
		//unique

		uppercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toUpperCase.apply(value);
		},

		//urlencode
		//urlize
		//urlizetrunc
		//wordcount
		//wordwrap

		yesno: function(value, truthy, falsy) {
			return value ? truthy : falsy ;
		}
	};
})(this);


// Make the minifier remove debug code paths
Sparky.debug = false;