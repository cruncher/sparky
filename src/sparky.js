(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Sparky');
	console.log('http://github.com/cruncher/sparky');
	//console.log('Live data binding templates for the DOM');
})(this);

// Sparky
//
// Reads data attributes in the DOM to bind dynamic data to
// controllers.
//
// Views
//
// <div data-ctrl="name" data-scope="path.to.data">
//     <h1>Hello world</h1>
// </div>
//
// Where 'name' is the key of a view function in
// Sparky.ctrl and path.to.data points to an object
// in Sparky.data.


(function(window){
	"use strict";

	var empty = [];

	//var rtag = /\{\{\s*([\w\-\.\[\]]+)\s*\}\}/g;

	// Check whether a path begins with '.' or '[', but not '..' or '[[', now
	// that we are able to redefine tag delimiters. Todo: when you sort out tag
	// delimiters clean this crap up.
	var rrelativepath = /^\.[^\.]|^\[[^\[]/;

	var prototype = Object.assign({
		create: function() {},

		reset: function() {},

		unbind: noop,

		destroy: function destroy() {
			return this
				.unbind()
				.remove()
				.trigger('destroy')
				.off();
		},

		remove: function() {
			while (this.length-- > 0) {
				Sparky.dom.remove(this[this.length]);
			}

			return this;
		},

		appendTo: function(node) {
			Sparky.dom.appendAll(node, this);
			return this;
		},

		slave: function(node, scope, ctrl) {
			return Sparky(node, scope, ctrl, undefined, this);
		}
	}, window.mixin.events);


	// Pure functions

	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }


	// Object helpers

	function copy(array1, array2) {
		Array.prototype.push.apply(array2, array1);
	}


	// Debug helpers

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


	// Sparky - the meat and potatoes

	function slaveSparky(sparky1, sparky2) {
		function destroy() { sparky2.destroy(); }

		function ready() {
			sparky1.off('destroy', destroy);
			sparky1.on(sparky2);
		}

		// Delegate the new sparky to the old.
		sparky1
		.on('destroy', destroy)
		.on('ready', ready);

		return sparky2;
	}

	function setupCollection(node, model, ctrl, parent) {
		var modelName = node.getAttribute('data-scope');
		var endNode = document.createComment(' [Sparky] data-scope="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];
		var inserted;
		// A pseudo-sparky that delegates events to all
		// sparkies in the collection.
		var sparky = Object.create(prototype);

		function updateNodes() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, obj;

			if (Sparky.debug) { var t = +new Date(); }

			while (l--) {
				obj = cache[l];
				i = model.indexOf(obj);

				if (i === -1) {
					Sparky.dom.remove(nodes[l]);
					sparkies[l].destroy();
					sparky.off(sparkies[l]);
				}
				else if (nodes[l] && sparkies[l]) {
					map[i] = [nodes[l], sparkies[l]];
				}
			}

			l = model.length;

			nodes.length = l;
			sparkies.length = l;
			cache.length = l;

			while(++n < l) {
				cache[n] = model[n];

				if (map[n]) {
					nodes[n] = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n] = node.cloneNode(true);
					sparkies[n] = Sparky(nodes[n], model[n], ctrl, false, parent);
					sparky.on(sparkies[n]);
				}

				Sparky.dom.before(endNode, nodes[n]);

				if (document.body.contains(sparkies[n][0])) {
					sparkies[n].trigger('insert');
				}
			}

			if (Sparky.debug) {
				console.log('Sparky: collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		Sparky.dom.before(node, endNode);

		// Remove the node
		Sparky.dom.remove(node);

		// Remove anything that would make Sparky bind the node
		// again. This can happen when a collection is appended
		// by a controller without waiting for it's 'ready' event.
		node.removeAttribute('data-scope');
		node.removeAttribute('data-ctrl');

		var throttle = Sparky.Throttle(updateNodes);

		Sparky.observe(model, 'length', throttle);

		sparky.on('destroy', function destroy() {
			throttle.cancel();
			Sparky.unobserve(model, 'length', throttle);
		});

		return sparky;
	}

	function createChild(sparky, node, scope, model, path) {
		var data;

		// no data-scope
		if (!isDefined(path)) {
			// We know that model is not defined, and we don't want child
			// sparkies to loop unless explicitly told to do so, so stop
			// it from looping. TODO: clean up Sparky's looping behaviour.
			return slaveSparky(sparky, Sparky(node, scope, undefined, false, sparky));
		}

		// data-scope="."
		if (path === '.') {
			return slaveSparky(sparky, Sparky(node, model, undefined, undefined, sparky));
		}

		// data-scope=".path.to.data"
		if (rrelativepath.test(path)) {
			data = Sparky.get(model, path.replace(rrelativepath, ''));

			if (!data) {
				throw new Error('Sparky: No object at relative path \'' + path + '\' of model#' + model.id);
			}

			return slaveSparky(sparky, Sparky(node, data, undefined, undefined, sparky));
		}

		// data-scope="{{path.to.data}}"
		Sparky.rtags.lastIndex = 0;
		if (Sparky.rtags.test(path)) {
			Sparky.rtags.lastIndex = 0;
			var path1 = Sparky.rtags.exec(path)[2];

			data = Sparky.get(scope, path1);

			var comment = document.createComment(' [Sparky] data-scope="' + path + '" ');
			var master = node.cloneNode(true);
			var childSparky;

			var setup = function(data) {
				if (childSparky) {
					childSparky.destroy();
				}

				if (!node) {
					node = master.cloneNode(true);
				}

				childSparky = Sparky(node, data, undefined, undefined, sparky);
				Sparky.dom.after(comment, node);
				Sparky.dom.remove(comment);
				slaveSparky(sparky, childSparky);
			};

			var teardown = function() {
				Sparky.dom.before(node, comment);
				Sparky.dom.remove(node);

				if (childSparky) {
					childSparky.destroy();
					childSparky = undefined;
					node = undefined;
				}
			};

			var update = function(data) {
				return data ? setup(data) : teardown() ;
			};

			Sparky.observePath(scope, path1, update);
			update(data);

			sparky.on('destroy', function destroy() {
				Sparky.unobservePath(scope, path1, update);
				teardown();
			});

			return childSparky;
		}

		return slaveSparky(sparky, Sparky(node, Sparky.get(sparky.data, path), undefined, undefined, sparky));
	}

	function setupSparky(sparky, node, model, ctrl) {
		var templateId = node.getAttribute && node.getAttribute('data-template');
		var templateFragment = templateId && Sparky.template(templateId);
		var scope, timer;

		function insertTemplate(sparky, node, templateFragment) {
			// Wait until the scope is rendered on the next animation frame
			requestAnimationFrame(function() {
				Sparky.dom.empty(node);
				Sparky.dom.append(node, templateFragment);
				sparky.trigger('template', node);
			});
		}

		function insert() {
			insertTemplate(sparky, node, templateFragment);
			insertTemplate = noop;
		}

		function get(path) {
			return Sparky.get(scope, path);
		}

		function set(property, value) {
			Sparky.set(scope, property, value);
		}

		function create(node) {
			var path = node.getAttribute('data-scope');
			return createChild(sparky, node, scope, model, path);
		}

		function cancelTimer() {
			window.cancelAnimationFrame(timer);
		}

		if (node.nodeType === 11) {
			// node is a document fragment. Copy all it's children
			// onto sparky.
			copy(node.childNodes, sparky);
		}
		else {
			sparky[0] = node;
			sparky.length = 1;
		}

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope.
		scope = ctrl && ctrl.call(sparky, node, model);

		// A controller returning false is telling us not to do data binding.
		// TODO: this is in the wrong place. We still need to handle the
		// insert event.
		if (scope === false) { return; }

		scope = scope || model || {};

		function observe(property, fn) {
			Sparky.observePath(scope, property, fn);

			//if (templateFragment) {
			//	Sparky.observePathOnce(scope, property, insert);
			//}
		}

		function unobserve(property, fn) {
			Sparky.unobservePath(scope, property, fn);
		}

		var inserted = document.body.contains(sparky[0]);

		// Gaurantee that insert handlers are only fired once.
		sparky.on('insert', offInsert);

		function poll() {
			// Is this node in the DOM ?
			if (document.body.contains(sparky[0])) {
				//console.log('ASYNC  DOM', sparky.length, sparky[0].nodeType, sparky[0]);
				sparky.trigger('insert');
			}
			else {
				//console.log('NOPE', sparky[0]);
				timer = window.requestAnimationFrame(poll);
			}
		}

		// If this template is not already in the DOM, poll it until it is. We
		// schedule the poll before binding in order that child sparkies that
		// result from binding will hear this 'insert' before their own.
		if (!inserted) {
			sparky.on('insert', cancelTimer);
			timer = window.requestAnimationFrame(poll);
		}

		sparky.bind(templateFragment || node, observe, unobserve, get, set, create, scope);

		if (templateFragment) {
			Sparky.dom.empty(node);
			Sparky.dom.append(node, templateFragment);
			sparky.trigger('template', node);
		}

		sparky.trigger('ready');

		// If this sparky is in the DOM, send the insert event right away.
		if (inserted) { sparky.trigger('insert'); }
	}

	function offInsert() { this.off('insert'); }

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

	function Sparky(node, model, ctrl) {
		if (Sparky.debug === 'verbose') {
			console.log('Sparky: Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
				(model && '{}'), ',',
				(ctrl && (ctrl.name || 'anonymous function')), ')'
			);
		}

		// Loop and data are 'hidden' parameter, used internally.
		// Everything needs a clean-up. You should consider using
		// prototypal inheritance to make child sparkies children
		// of ther parents, instead of doing that for the separate
		// data object. But to do that, they can no longer be
		// collections. So the DOM collection bit of it would
		// need to be a property of sparky.
		var loop = arguments[3] !== false;
		var parent = arguments[4];
		var modelPath, ctrlPath, tag, id;

		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM.
		if (typeof node === 'string') {
			id = node;
			node = Sparky.template(id);

			if (!node) {
				node = document.getElementById(id);
			}

			if (!node) {
				throw new Error('Sparky: Sparky() called but id of node not found: #' + id);
			}
		}

		if (!node) {
			throw new Error('Sparky: Sparky() called without node: ' + node);
		}

		// Where model is not defined look for the data-scope
		// attribute. Document fragments do not have a getAttribute
		// method.
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-scope');

			if (isDefined(modelPath)) {
				model = Sparky.get(Sparky.data, modelPath);

				if (Sparky.debug && !model) {
					console.log('Sparky: data-scope="' + modelPath + '" model not found in sparky.data. Path will be observed.' );
				}
			}
		}

		// The ctrl list can be...
		ctrl =
			// a space-separated string of ctrl paths
			typeof ctrl === 'string' ? makeCtrl(ctrl, parent.ctrl) :
			// a function
			typeof ctrl === 'function' ? makeDistributeCtrl([ctrl]) :
			// an array of functions
			typeof ctrl === 'object' ? makeDistributeCtrl(ctrl) :
			// defined in the data-ctrl attribute
			node.getAttribute && makeCtrl(node.getAttribute('data-ctrl'), parent ? parent.ctrl : Sparky.ctrl) ;

		// Where model is an array or array-like object with a length property,
		// but not a function (whihc also has length), set up Sparky to clone
		// node for every object in the array.
		if (loop && model && typeof model.length === 'number' && typeof model !== 'function') {
			return setupCollection(node, model, ctrl, parent);
		}

		var sparky = Object.create(prototype);

		Object.defineProperties(sparky, {
			data: { value: Object.create(parent ? parent.data : Sparky.data), writable: true },
			ctrl: { value: Object.create(parent ? parent.ctrl : Sparky.ctrl) }
		});

		// Check if there should be a model, but it isn't available yet. If so,
		// observe the path to the model until it appears.
		if (modelPath && !model) {
			Sparky.observePathOnce(Sparky.data, modelPath, function(model) {
				setupSparky(sparky, node, model, ctrl);
			});
		}
		else {
			setupSparky(sparky, node, model, ctrl);
		}

		return sparky;
	}


	// Expose

	Sparky.debug    = false;
	Sparky.settings = {};
	Sparky.data     = {};
	Sparky.ctrl     = {};

	Sparky.template = function() {
		return Sparky.dom.fragmentFromTemplate.apply(this, arguments);
	};

	Sparky.extend = function() {
		console.warn('Sparky.extend() is deprecated. Use Object.assign().');
		console.warn('Object.assign polyfill: https://github.com/cruncher/object.assign');
		console.trace();
		return Object.assign.apply(this, arguments);
	};

	Sparky.svgNamespace = "http://www.w3.org/2000/svg";
	Sparky.xlink        = "http://www.w3.org/1999/xlink";
	Sparky.prototype    = prototype;

	window.Sparky = Sparky;
})(window);
