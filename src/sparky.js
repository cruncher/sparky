
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


(function(ns){
	"use strict";

	var empty = [];
	var templates   = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };

	var rtag = /\{\{\s*([\w\-\.\[\]]+)\s*\}\}/g,
	    // Check whether a path begins with '.' or '['
	    rrelativepath = /^\.|^\[/;

	var prototype = extend({
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
				remove(this[this.length]);
			}

			return this;
		},

		appendTo: function(node) {
			var n = -1;
			while (++n < this.length) {
				node.appendChild(this[n]);
			}
			return this;
		}
	}, ns.mixin.events, ns.mixin.array);


	// Pure functions

	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }

	// Object helpers

	function copy(array1, array2) {
		Array.prototype.push.apply(array2, array1);
	}

	function extend(obj) {
		var i = 0,
		    length = arguments.length,
		    obj2, key;

		while (++i < length) {
			obj2 = arguments[i];

			for (key in obj2) {
				if (obj2.hasOwnProperty(key)) {
					obj[key] = obj2[key];
				}
			}
		}

		return obj;
	}


	// Debug helpers

	function nodeToText(node) {
		return [
			'<',
			node.tagName.toLowerCase(),
			//(node.className ? ' class="' + node.className + '"' : ''),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-scope') ? ' data-scope="' + node.getAttribute('data-scope') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}


	// DOM helpers

	function append(parent, node) {
		parent.appendChild(node);
		return parent;
	}
	
	function fill(parent, child) {
		// Remove all children.
		while (parent.lastChild) {
			parent.removeChild(parent.lastChild);
		}
		
		// Append the template fragment.
		parent.appendChild(child);
		return parent;
	}

	function fragmentFromChildren(template) {
		var children = slice(template.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce(children, append, fragment);
	}

	function getTemplateContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		if (!node) { throw new Error('Sparky: requested template id="' + id + '". That is not in the DOM.') }
		return node && getTemplateContent(node);
	}

	function fetchTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		return template && template.cloneNode(true);
	}

	function tagName(node) {
		return node.tagName.toLowerCase();
	}

	function remove(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function insertBefore(node, target) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function insertAfter(node, target) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}

	// Getting and setting

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path)) { return; }
		
		return path === '.' ?
			obj :
			Sparky.get(obj, path) ;
	}

	// Sparky - the meat and potatoes

	function slaveSparky(sparky1, sparky2) {
		// When sparky is ready, delegate the new sparky to
		// the old.
		sparky1
		.on('destroy', function destroy() {
			sparky2.destroy();
		})
		.on('ready', function ready() {
			sparky1.on(sparky2);
		});

		return sparky2;
	}

	function setupCollection(node, model, ctrl) {
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
					remove(nodes[l]);
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
					sparkies[n] = Sparky(nodes[n], model[n], ctrl, false);
					sparky.on(sparkies[n]);
				}

				insertBefore(nodes[n], endNode);

				if (document.body.contains(sparkies[n][0])) {
					sparkies[n].trigger('insert');
				}
			}

			if (Sparky.debug) {
				console.log('Sparky: collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		insertBefore(endNode, node);

		// Remove the node
		remove(node);

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
			slaveSparky(sparky, Sparky(node, scope, undefined, false));
			return;
		}

		// data-scope="."
		if (path === '.') {
			slaveSparky(sparky, Sparky(node, model));
			return;
		}

		// data-scope="path.to.data"
		if (rrelativepath.test(path)) {
			data = findByPath(model, path.replace(rrelativepath, ''));

			if (!data) {
				throw new Error('Sparky: No object at relative path \'' + path + '\' of model#' + model.id);
			}

			slaveSparky(sparky, Sparky(node, data));
			return;
		}

		// data-scope="{{path.to.data}}"
		rtag.lastIndex = 0;
		if (rtag.test(path)) {
			rtag.lastIndex = 0;
			var path1 = rtag.exec(path)[1];

			data = findByPath(scope, path1);

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

				childSparky = Sparky(node, data);
				insertAfter(node, comment);
				remove(comment);
				slaveSparky(sparky, childSparky);
			};

			var teardown = function() {
				insertBefore(comment, node);
				remove(node);

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
			update();

			sparky.on('destroy', function destroy() {
				Sparky.unobservePath(scope, path1, update);
				teardown();
			});

			return;
		}

		slaveSparky(sparky, Sparky(node, findByPath(Sparky.data, path)));
	}


	function setupSparky(sparky, node, model, ctrl) {
		var templateId = node.getAttribute && node.getAttribute('data-template');
		var templateFragment = templateId && fetchTemplate(templateId);
		var scope, timer;

		function insertTemplate(sparky, node, templateFragment) {
			// Wait until the scope is rendered on the next animation frame
			requestAnimationFrame(function() {
				fill(node, templateFragment);
				sparky.trigger('template', node);
			});
		}

		function insert() {
			insertTemplate(sparky, node, templateFragment);
			insertTemplate = noop;
		}

		function get(path) {
			return path === '.' ?
				scope :
				Sparky.get(scope, path) ;
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

		if (Sparky.debug && templateId) { console.log('Sparky: template:', templateId); }

		function observe(property, fn) {
			Sparky.observePath(scope, property, fn);

			if (templateFragment) {
				Sparky.observePath(scope, property, insert);
			}
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

		// The bind function returns an unbind function.
		// TODO: Where templateFragment exists, we still want to bind the
		// node - but not it's contents. Becuase we still want, say, the class
		// attribute on the node itself to work.
		sparky.bind(templateFragment || node, observe, unobserve, get, set, create, scope);
		sparky.trigger('ready');

		// If this sparky is in the DOM, send the insert event right away.
		if (inserted) { sparky.trigger('insert'); }
	}

	function offInsert() { this.off('insert'); }

	function makeDistributeCtrl(ctrls) {
		return ctrls.length === 1 ?
			ctrls[0] :
			function distributeCtrl(node, model) {
				// Distributor controller
				var l = ctrls.length;
				var n = -1;
				var scope = model;
				var temp;

				// Call the list of ctrls. Scope is the return value of
				// the last ctrl in the list that does not return undefined
				while (++n < l) {
					temp = ctrls[n].call(this, node, scope);
					if (temp) { scope = temp; }
				}

				return scope;
			} ;
	}

	function makeDistributeCtrlFromPaths(paths) {
		var ctrls = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = findByPath(Sparky.ctrl, paths[n]);
			
			if (!ctrl) {
				throw new Error('Sparky: data-ctrl "' + paths[n] + '" not found in Sparky.ctrl');
			}
			
			ctrls.push(ctrl);
		}

		return makeDistributeCtrl(ctrls);
	}

	function makeCtrl(node) {
		var ctrlPaths = node.getAttribute('data-ctrl');
		var ctrl;

		if (!isDefined(ctrlPaths)) { return; }

		var paths = ctrlPaths.split(/\s+/);

		if (paths.length === 1) {
			ctrl = findByPath(Sparky.ctrl, paths[0]);

			if (!ctrl) {
				throw new Error('Sparky: data-ctrl "' + paths[0] + '" not found in Sparky.ctrl');
			}

			return ctrl;
		}

		return makeDistributeCtrlFromPaths(paths);
	}

	function Sparky(node, model, ctrl, loop) {
		if (Sparky.debug === 'verbose') {
			console.log('Sparky: Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
				(model && '{}'), ',',
				(ctrl && (ctrl.name || 'anonymous function')), ')'
			);
		}

		var modelPath, ctrlPath, tag, id;

		if (loop !== false) { loop = true; }

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
				model = findByPath(Sparky.data, modelPath);

				if (Sparky.debug && !model) {
					console.log('Sparky: data-scope="' + modelPath + '" model not found in Sparky.data. Path will be observed.' );
				}
			}
		}

		// If ctrl is a string, assume it is the name of a controller
		if (typeof ctrl === 'string') {
			ctrl = Sparky.ctrl[ctrl];
		}

		// Where ctrl is not defined look for the data-ctrl
		// attribute. Document fragments do not have a getAttribute
		// method.
		if (!ctrl && node.getAttribute) {
			ctrl = makeCtrl(node);
		}

		// Where model is an array or array-like object with a length property,
		// but not a function, set up Sparky to clone node for every object in
		// the array.
		if (loop && model && model.length !== undefined && typeof model !== 'function') {
			return setupCollection(node, model, ctrl);
		}

		var sparky = Object.create(prototype);

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

	Sparky.debug        = false;
	Sparky.config       = {};
	Sparky.settings     = {};
	Sparky.data         = {};
	Sparky.ctrl         = {};
	Sparky.Collection   = window.Collection;
	Sparky.templates    = templates;
	Sparky.features     = features;
	Sparky.template     = fetchTemplate;
	Sparky.content      = getTemplateContent;
	Sparky.extend       = extend;
	Sparky.svgNamespace = "http://www.w3.org/2000/svg";
	Sparky.xlink        = 'http://www.w3.org/1999/xlink';
	Sparky.prototype    = prototype;
 
	ns.Sparky = Sparky;
})(window);
