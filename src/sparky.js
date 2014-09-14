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

	var templates   = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };

	var rtag = /\{\{\s*([\w\-\.\[\]]+)\s*\}\}/g,
	    rbracket = /\]$/,
	    rpathsplitter = /\]?\.|\[/g,
	    // Check whether a path begins with '.' or '['
	    rrelativepath = /^\.|^\[/;

	var empty = [];

	var reduce = Array.prototype.reduce,
	    slice = Array.prototype.slice;

	var prototype = extend({
		get: function() {
			
		},

		set: function() {
			
		},

		create: function() {
			
		},

		destroy: function() {
			
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
	
	var changeEvent = new window.CustomEvent('change');

	// Pure functions

	function noop() {}
	function call(fn) { fn(); }
	function isDefined(val) { return val !== undefined && val !== null; }
	function isObject(obj) { return obj instanceof Object; }
	function getProperty(obj, property) { return obj[property]; }

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

	function isConfigurable(obj, prop) {
		return Object.getOwnPropertyDescriptor(obj, prop).configurable;
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
		var children = slice.apply(template.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce.call(children, append, fragment);
	}
	
	function getTemplate(id) {
		var node = document.getElementById(id);
		
		if (!node) { return; }
		
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}
	
	function fetchTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		
		if (Sparky.debug && !template) {
			console.warn('[Sparky] template #' + id + ' not found.');
		}

		return template && template.cloneNode(true);
	}


	// Sparky
	
	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}
	
	function insertNode(node1, node2) {
		node1.parentNode && node1.parentNode.insertBefore(node2, node1);
	}

	function defaultCtrl(node, model) {
		this.on('destroy', function(sparky, node) { removeNode(node) }, node);
		return model;
	}

	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];
		
		//if (val === undefined) {
		//	val = obj[key] = {};
		//}
		
		return isDefined(val) && array.length ?
			objFrom(val, array) :
			val ;
	}

	function objFromPath(obj, path) {
		return objFrom(obj, path.replace(rbracket, '').split(rpathsplitter));
	}

	function objTo(root, array, obj) {
		var key = array[0];
		
		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function objToPath(root, path, obj) {
		return objTo(root, path.replace(rbracket, '').split(rpathsplitter), obj);
	}

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path) || path === '') { return; }
		
		return path === '.' ?
			obj :
			objFromPath(obj, path) ;
	}
	
	function dirtyObserve(obj, prop, fn) {
		var array = obj.slice();
		
		setInterval(function() {
			if (obj.length === array.length) { return; }
			array = obj.slice();
			fn(obj);
		}, 16);
	}

	function setupCollection(node, model, ctrl) {
		var modelName = node.getAttribute('data-model');
		var endNode = document.createComment(' [Sparky] data-model="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];

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
			}

			if (Sparky.debug) {
				console.log('[Sparky] collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		insertNode(node, endNode);

		// Remove the node
		removeNode(node);

		// Remove anything that would make Sparky to bind the node
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

			trigger: function() {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].trigger.apply(sparkies[n], arguments);
				}
			}
		};
	}

	function nodeToText(node) {
		return [
			'<',
			node.tagName.toLowerCase(),
			(node.className ? ' class="' + node.className + '"' : ''),
			(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-model') ? ' data-model="' + node.getAttribute('data-model') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}

	function slaveSparky(sparky1, sparky2) {
		// When sparky is ready, overwrite the trigger method
		// to trigger all events on the slave sparky immediately
		// following the trigger on the master.
		sparky1.on('ready', function() {
			sparky1.on(sparky2);
		});

		return sparky2;
	}

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
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
			return scope[property];
		}

		function set(property, value) {
			scope[property] = value;
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
					throw new Error('[Sparky] No object at relative path \'' + path + '\' of model#' + model.id);
				}

				return slaveSparky(sparky, Sparky(node, data));
			}

			rtag.lastIndex = 0;
			if (rtag.test(path)) {
				
				rtag.lastIndex = 0;
				data = findByPath(scope, rtag.exec(path)[1]);

				if (!data) {
					rtag.lastIndex = 0;
					throw new Error('[Sparky] Property \'' + rtag.exec(path)[1] + '\' not in parent scope. ' + nodeToText(node));
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
			console.log('[Sparky] template:', templateId);
		}

		function observe(property, fn) {
			Sparky.observe(scope, property, fn);

			if (templateFragment) {
				Sparky.observe(scope, property, insert);
			}
		}

		function unobserve(property, fn) {
			Sparky.unobserve(scope, property, fn);
		}

		// The bind function returns an array of unbind functions.
		sparky.detach = unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, set, create);

		sparky.trigger('ready');
	}

	// The Sparky function

	function Sparky(node, model, ctrl, loop) {
		if (Sparky.debug === 'verbose') {
			console.log('Sparky', '\n', 'node', node, '\n', 'model', model, '\n', 'ctrl', ctrl && ctrl.name, '\n', 'loop', loop);
		}

		var sparky, modelPath, ctrlPath, tag, id;

		if (loop !== false) {
			loop = true;
		}

		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM. 
		if (typeof node === 'string') {
			id = node;
			node = Sparky.template(id);

			if (!node) {
				node = document.getElementById(id);
			}
		}

		// Where model is not defined look for the data-model
		// attribute. Docuent fragments do not have a getAttribute
		// method.
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-model');
			
			if (isDefined(modelPath)) {
				model = findByPath(Sparky.data, modelPath);
				
				if (model === undefined) {
					throw new Error('[Sparky] ' + nodeToText(node) + ' model not found in Sparky.data');
				}
			}
		}

		// If ctrl is a string, assume it is the name of a controller
		if (typeof ctrl === 'string') {
			ctrl = Sparky.ctrl[ctrl];
		}

		// Where ctrl is not defined look for the data-ctrl
		// attribute. Docuent fragments do not have a getAttribute
		// method.
		if (!ctrl && node.getAttribute) {
			ctrlPath = node.getAttribute('data-ctrl');
			tag = node.tagName.toLowerCase();
			
			ctrl = isDefined(ctrlPath) ? findByPath(Sparky.ctrl, ctrlPath) :
				defaultCtrl ;
		}

		// Where model is an array or array-like object with a length property,
		// but not a function, set up Sparky to clone node for every object in
		// the array.
		if (loop && model && model.length !== undefined && typeof model !== 'function') {
			return setupCollection(node, model, ctrl);
		}

		if (Sparky.debug === 'verbose') {
			console.groupCollapsed('[Sparky] Sparky(', node, ',',
				(model && model.id && ('model#' + model.id) || 'model'), ',',
				(ctrl && 'ctrl'), ')'
			);
		}

		sparky = Object.create(prototype);
		setupSparky(sparky, node, model, ctrl);

		if (Sparky.debug === 'verbose') { console.groupEnd(); }

		return sparky;
	}

	Sparky.debug       = false;
	Sparky.config      = {};
	Sparky.settings    = {};
	Sparky.data        = {};
	Sparky.ctrl        = {};
	Sparky.mixin       = ns.mixin || (ns.mixin = {});
	Sparky.Collection  = ns.Collection;
	Sparky.templates   = templates;
	Sparky.features    = features;
	Sparky.template    = fetchTemplate;
	Sparky.extend      = extend;
	Sparky.prototype   = prototype;

	ns.Sparky = Sparky;
})(window);



// Sparky onload
//
// If jQuery is present and when the DOM is ready, traverse it looking for
// data-model and data-ctrl attributes and use them to instantiate Sparky.

(function(jQuery, Sparky) {
	if (!jQuery) { return; }

	var doc = jQuery(document);

	function isInTemplate(node) {
		if (node.tagName.toLowerCase() === 'template') { return true; }
		if (node === document.documentElement) { return false; }
		return isInTemplate(node.parentNode);
	}

	doc.ready(function(){
		var start;
		
		if (window.console) { start = Date.now(); }
		
		var nodes = document.querySelectorAll('[data-ctrl], [data-model]');
		var n = -1;
		var l = nodes.length;
		var node;
		var array = [];
		var modelPath;
		
		// Remove child sparkies
		while (++n < l) {
			node = nodes[n];
			array.push(node);
			while (++n < l && node.contains(nodes[n])) {
				// But do add children that have absolute model paths.

				modelPath = nodes[n].getAttribute('data-model');

				if (modelPath !== undefined && !/\{\{/.test(modelPath)) {
					//array.push(nodes[n]);
				}
			};
			--n;
		}
		
		// Normally <template>s are inert, but if they are not a supported
		// feature their content is part of the DOM so we have to remove those,
		// too. 
		if (!Sparky.features.template) {
			n = array.length;
			
			while (n--) {
				if (isInTemplate(array[n])) {
					array.splice(n, 1);
				}
			}
		}

		if (Sparky.debug) { console.log('[Sparky] DOM nodes to initialise:', array); }

		array.forEach(function(node) {
			Sparky(node);
		});
		
		window.requestAnimationFrame(function sparkyready() {
			doc.trigger('sparkyready');
		});
		
		if (window.console) { console.log('[Sparky] DOM initialised in ' + (Date.now() - start) + 'ms'); }
	});
})(jQuery, Sparky);