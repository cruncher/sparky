
// Sparky
// 
// Reads data attributes in the DOM to bind dynamic data to
// controllers.
// 
// Views
// 
// <div data-ctrl="name" data-model="path.to.data">
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

		destroy: function() {},

		remove: function() {
			while (this.length--) {
				removeNode(this[this.length]);
			}
		},

		observe: function(object, property, fn) {
			Sparky.observe(object, property, fn);
			this.on('destroy', function() {
				Sparky.unobserve(object, property, fn);
			});
		},

		appendTo: function(node) {
			var n = -1;
			while (++n < this.length) {
				node.appendChild(this[n]);
			}
			return this;
		},

		removeFrom: function(node) {
			var n = -1;
			while (++n < this.length) {
				node.removeChild(this[n]);
			}
			return this;
		}
	}, ns.mixin.events);


	// Pure functions

	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }

	// Object helpers

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

	function copy(array1, array2) {
		Array.prototype.push.apply(array2, array1);
	}


	// Debug helpers

	function nodeToText(node) {
		return [
			'<',
			node.tagName.toLowerCase(),
			//(node.className ? ' class="' + node.className + '"' : ''),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-model') ? ' data-model="' + node.getAttribute('data-model') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}


	// DOM helpers

	function append(parent, child) {
		parent.appendChild(child);
		return parent;
	}
	
	function replace(parent, child) {
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
		return node && getTemplateContent(node);
	}

	function fetchTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		
		if (Sparky.debug && !template) {
			console.warn('Sparky: template #' + id + ' not found.');
		}

		return template && template.cloneNode(true);
	}

	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function insertNode(node1, node2) {
		node1.parentNode && node1.parentNode.insertBefore(node2, node1);
	}

	// Getting and setting

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path)) { return; }
		
		return path === '.' ?
			obj :
			Sparky.getPath(obj, path) ;
	}

	// Sparky - the meat and potatoes

	function slaveSparky(sparky1, sparky2) {
		// When sparky is ready, overwrite the trigger method
		// to trigger all events on the slave sparky immediately
		// following the trigger on the master.
		sparky1.on('ready', function() {
			sparky1.on(sparky2);
		});

		return sparky2;
	}

	function setupCollection(node, model, ctrl) {
		var modelName = node.getAttribute('data-model');
		var endNode = document.createComment(' [Sparky] data-model="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];
		var inserted;

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
					removeNode(nodes[l]);
					sparkies[l].destroy();
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
				}

				insertNode(endNode, nodes[n]);
				sparkies[n].trigger('insert');
			}

			if (Sparky.debug) {
				console.log('Sparky: collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		insertNode(node, endNode);

		// Remove the node
		removeNode(node);

		// Remove anything that would make Sparky bind the node
		// again. This can happen when a collection is appended
		// by a controller without waiting for it's 'ready' event.
		node.removeAttribute('data-model');
		node.removeAttribute('data-ctrl');

		var throttle = Sparky.Throttle(updateNodes);

		Sparky.observe(model, 'length', throttle);

		// Return a pseudo-sparky that delegates events to all
		// sparkies in the collection.
		return {
			destroy: function() {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].destroy();
				}

				throttle.cancel();
				Sparky.unobserve(model, 'length', throttle);
			},

			trigger: function(string) {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].trigger.apply(sparkies[n], arguments);
				}
			}
		};
	}

	function setupSparky(sparky, node, model, ctrl) {
		var templateId = node.getAttribute && node.getAttribute('data-template');
		var templateFragment = templateId && fetchTemplate(templateId);
		var scope, unbind;

		function insertTemplate(sparky, node, templateFragment) {
			// Wait until the scope is rendered on the next animation frame
			requestAnimationFrame(function() {
				replace(node, templateFragment);
				sparky.trigger('template', node);
			});
		};

		function insert() {
			insertTemplate(sparky, node, templateFragment);
			insert = noop;
		}

		function get(property) {
			return Sparky.getPath(scope, property);
		}

		function set(property, value) {
			Sparky.setPath(scope, property, value);
		}

		function create(node) {
			var path = node.getAttribute('data-model');
			var data;

			if (!isDefined(path)) {
				// We know that model is not defined, and we don't want child
				// sparkies to loop unless explicitly told to do so, so stop
				// it from looping. TODO: I really must clean up Sparky's
				// looping behaviour.
				return slaveSparky(sparky, Sparky(node, scope, undefined, false));
			}

			if (path === '.') {
				return slaveSparky(sparky, Sparky(node, model));
			}

			if (rrelativepath.test(path)) {
				data = findByPath(model, path.replace(rrelativepath, ''));

				if (!data) {
					throw new Error('Sparky: No object at relative path \'' + path + '\' of model#' + model.id);
				}

				return slaveSparky(sparky, Sparky(node, data));
			}

			rtag.lastIndex = 0;
			if (rtag.test(path)) {
				
				rtag.lastIndex = 0;
				data = findByPath(scope, rtag.exec(path)[1]);

				if (!data) {
					rtag.lastIndex = 0;
					throw new Error('Sparky: Property \'' + rtag.exec(path)[1] + '\' not in parent scope. ' + nodeToText(node));
				}

				return Sparky(node, data);
			}

			return slaveSparky(sparky, Sparky(node, findByPath(Sparky.data, path)));
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

		sparky.destroy = function destroy() {
			this.detach();
			this.detach = noop;
			this.remove();

			return this
				.trigger('destroy')
				.off();
		};

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope, and if that doesn't exist use an
		// empty object. This means we can launch sparky on a node where a
		// model is not defined and it will nonetheless pick up and spark
		// child nodes.
		scope = ctrl && ctrl.call(sparky, node, model);

		// A controller returning false is telling us not to use data binding.
		if (scope === false) { return; }

		scope = scope || model || {};

		if (Sparky.debug && templateId) {
			console.log('Sparky: template:', templateId);
		}

		function observe(property, fn) {
			Sparky.observePath(scope, property, fn);

			if (templateFragment) {
				Sparky.observePath(scope, property, insert);
			}
		}

		function unobserve(property, fn) {
			Sparky.unobservePath(scope, property, fn);
		}

		// The bind function returns an array of unbind functions.
		sparky.detach = unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, set, create, scope);
		sparky.trigger('ready');
	}

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

		// Where model is not defined look for the data-model
		// attribute. Document fragments do not have a getAttribute
		// method.
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-model');
			
			if (isDefined(modelPath)) {
				model = findByPath(Sparky.data, modelPath);

				if (Sparky.debug && !model) {
					console.log('Sparky: data-model="' + modelPath + '" model not found in Sparky.data. Path will be observed.' );
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
 
	ns.Sparky = Sparky;
})(window);
