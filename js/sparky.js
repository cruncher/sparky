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
		console.log.apply(console, arguments);
	}

	function logVerbose() {
		if (Sparky.debug !== 'verbose') { return; }
		console.log.apply(console, arguments);
	}


	// Functions

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }


	// Sparky

	function getNode(node) {
		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM.
		return typeof node === 'string' ?
			(Sparky.template(node) || document.getElementById(node)) :
			node ;
	}

	function getTemplate(node) {
		// Document fragments do not have a getAttribute method.
		if (!node.getAttribute) { return; }

		var id = node.getAttribute('data-template');

		return isDefined(id) && Sparky.template(id);
	}

	function getScope(node) {
		// Document fragments do not have a getAttribute method.
		if (!node.getAttribute) { return; }

		var path = node.getAttribute('data-scope');

		return isDefined(path) && Sparky.get(Sparky.data, path);
	}

	function getCtrl(node, fn) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeCtrl(ctrl, parent.ctrl) :
			// a function,
			typeof fn === 'function' ? makeDistributeCtrl([ctrl]) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeCtrl(ctrl) :
			// or defined in the data-ctrl attribute
			node.getAttribute && makeCtrl(node.getAttribute('data-ctrl'), parent ? parent.ctrl : Sparky.ctrl) ;
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

	function setup(sparky, node, scope, ctrl, template) {
		var frame;

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
			window.cancelAnimationFrame(frame);
		}

		function observe(property, fn) {
			Sparky.observePath(scope, property, fn);

			//if (templateFragment) {
			//	Sparky.observePathOnce(scope, property, insert);
			//}
		}

		function unobserve(property, fn) {
			Sparky.unobservePath(scope, property, fn);
		}

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope.
		var object = ctrl && ctrl.call(sparky, node, scope);

		// A controller returning false is telling us not to do data binding.
		// TODO: this is in the wrong place. We still need to handle the
		// insert event.
		if (object === false) { return; }

		scope = object || scope || {};

		var inserted = document.body.contains(sparky[0]);

		// Gaurantee that insert handlers are only fired once.
		sparky.on('insert', offInsert);

		// If this template is not already in the DOM, poll it until it is. We
		// schedule the poll before binding in order that child sparkies that
		// result from binding will hear this 'insert' before their own.
		if (!inserted) {
			sparky.on('insert', cancelTimer);
			frame = window.requestAnimationFrame(function poll() {
				// Is this node in the DOM ?
				if (document.body.contains(sparky[0])) {
					//console.log('ASYNC  DOM', sparky.length, sparky[0].nodeType, sparky[0]);
					sparky.trigger('insert');
				}
				else {
					//console.log('NOPE', sparky[0]);
					frame = window.requestAnimationFrame(poll);
				}
			});
		}

		sparky.bind(template || node, observe, unobserve, get, set, create, scope);

		if (template) {
			Sparky.dom.empty(node);
			Sparky.dom.append(node, template);
			sparky.trigger('template', node);
		}

		sparky.trigger('ready');

		// If this sparky is in the DOM, send the insert event right away.
		if (inserted) { sparky.trigger('insert'); }
	}

	function Sparky(node, scope, fn, loopTODO, parent) {
		// Allow the calling the constructor with or without 'new'.
		if (!(this instanceof Sparky)) {
			return new Sparky(node, fn, scope);
		}

		logVerbose('Sparky: Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
			(scope && '{}'), ',',
			(fn && (fn.name || 'anonymous function')), ')');

		// Loop and data are 'hidden' parameter, used internally.
		// Everything needs a clean-up. You should consider using
		// prototypal inheritance to make child sparkies children
		// of ther parents, instead of doing that for the separate
		// data object. But to do that, they can no longer be
		// collections. So the DOM collection bit of it would
		// need to be a property of sparky.
//		var loop = arguments[3] !== false;

		node = getNode(node);

		if (!node) {
			throw new Error("Sparky: Sparky(node) called, node not found: " + node);
		}

		// Where scope is not defined get it from the data-scope attribute.
		if (!isDefined(scope)) {
			scope = getScope(node);

			if (!isDefined(scope)) {
				log('Sparky: data-scope="' + path + '" not found in Sparky.data. Path will be observed.' );
			}
		}

		var ctrl = getCtrl(node, fn);

		// Where model is an array or array-like object with a length property,
		// but not a function (whihc also has length), set up Sparky to clone
		// node for every object in the array.
//		if (loop && scope && typeof scope.length === 'number' && typeof scope !== 'function') {
//			return setupCollection(node, model, ctrl, parent);
//		}

		var template = getTemplate(node);

		// Define data and fn inheritance
		Object.defineProperties(this, {
			data: { value: Object.create(parent ? parent.data : Sparky.data), writable: true },
			ctrl: { value: Object.create(parent ? parent.ctrl : Sparky.ctrl) }
		});

		// Setup this as a Collection of nodes. Where node is a document
		// fragment, assign all it's children to sparky collection.
		Collection.call(this, node.nodeType === 11 ? node.childNodes : [node]);

		// Check if there should be a scope, but it isn't available yet. If so,
		// observe the path to scope until it appears.
		if (scopePath && !scope) {
			Sparky.observePathOnce(Sparky.data, scopePath, function(model) {
				setup(this, node, scope, ctrl, template);
			});
		}
		else {
			setup(this, node, scope, ctrl, template);
		}
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Create a slave Sparky dependent upon this.
		create: function(node, scope, fn) {
			var sparky = this;

			// TODO: Why do we need to pass parent sparky in AND do this setup
			// here? One or the other would be good, no?
			var slave = Sparky(node, scope, fn, undefined, this);

			function destroy() { slave.destroy(); }

			function ready() {
				sparky.off('destroy', destroy);
				sparky.on(slave);
			}

			// Delegate the new sparky to the old.
			this
			.on('destroy', destroy)
			.on('ready', ready);

			return slave;
		},

		// Unbind and destroy Sparky bindings and nodes.
		destroy: function destroy() {
			Sparky.dom.removeAll(this);

			this
			.unbind()
			.trigger('destroy')
			.off();

			return this;
		},

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
