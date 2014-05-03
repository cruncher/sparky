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
// Sparky.controllers and path.to.data points to an object
// in Sparky.data.


(function(ns){
	"use strict";

	var controllers = {};
	var templates   = {};
	var data        = {};
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

	var prototype = extend({}, ns.mixin.events);
	
	var changeEvent = new window.CustomEvent('change');

	// Pure functions

	function noop() {}
	function call(fn) { fn(); }
	function isDefined(val) { return val !== undefined && val !== null; }
	function isObject(obj) { return obj instanceof Object; }
	function getProperty(obj, property) { return obj[property]; }
	function getDestroy(obj) { return obj.destroy; }

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
	
	function defaultCtrl(node, model, sparky) {
		sparky.on('destroy', removeNode, node);
		return model;
	}
	
	function inputCtrl(node, model, sparky) {
		var prop = node.name;
		
		if (!isDefined(prop)) { return; }
		
		var type = node.type;
		
		jQuery(node).on('change', function changeInput(e) {
			var value = type === 'number' || type === 'range' ? parseFloat(e.target.value) :
					type === 'radio' || type === 'checkox' ? e.target.checked && e.target.value :
					e.target.value ;

			model[prop] = value;
		});
	}
	
	function selectCtrl(node, model, sparky) {
		
	}
	
	function textareaCtrl(node, model, sparky) {
		
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
	
	function onFrame(fn) {
		var flag = false;
		var scope, args;
		
		function update() {
			flag = false;
			fn.apply(scope, args);
		}

		return function change() {
			scope = this;
			args = arguments;
			if (flag) { return; }
			flag = true;
			window.requestAnimationFrame(update);
		}
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
		var startNode = document.createComment(' [Sparky] collection start ');
		var endNode = document.createComment(' [Sparky] collection end ');
		var nodes = [];
		var sparkies = [];
		var modelPath = node.getAttribute('data-model');
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
			
			nodes.length = model.length;
			sparkies.length = model.length;
			cache.length = model.length;
			
			while(++n < l) {
				cache[n] = model[n];
				
				if (map[n]) {
					nodes[n] = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n] = node.cloneNode(true);
					
					sparkies[n] = Sparky(nodes[n], model[n], ctrl);
					
					if (isDefined(modelPath)) {
						nodes[n].setAttribute('data-model', modelPath + '[' + n + ']');
					}
				}
				
				insertNode(endNode, nodes[n]);
			}
			
			if (nodes.length && node.tagName.toLowerCase() === 'option') {
				// We have populated a <select>. It's value may have changed.
				// Trigger a change event to make sure we pick up the change.
				nodes[0].parentNode.dispatchEvent(changeEvent);
			}
			
			if (Sparky.debug) {
				console.log('[Sparky] collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}
		
		var updateFn = onFrame(updateNodes);
		
		// Put the marker nodes in place
		insertNode(node, startNode);
		insertNode(node, endNode);
		
		// Remove the node
		removeNode(node);

		// Observe length and update the DOM on next
		// animation frame if it changes.
		try {
			observe(model, 'length', updateFn);
		}
		catch (e) {
			if (Sparky.debug) {
				console.warn('[Sparky] Are you trying to observe an array? You should set ' +
				             'Sparky.config.dirtyObserveArrays = true;\n' +
				             '         Dirty observation is not particularly performant. ' +
				             'Consider using a Sparky.Collection() in place of the array.');
			}
			
			if (Sparky.config.dirtyObserveArrays === true) {
				dirtyObserve(model, 'length', updateFn);
			}
		}

		updateNodes();
		
		return {
			destroy: function() {
				sparkies.map(getDestroy).forEach(call);
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
				sparky.trigger(node, 'templated');
			});
		};

		function insert() {
			insertTemplate(sparky, node, templateFragment);
			insert = noop;
		}

		function observe(property, fn) {
			Sparky.observe(scope, property, onFrame(fn));
			
			// Start off with populated nodes
			fn();
			
			if (templateFragment) {
				Sparky.observe(scope, property, insert);
			}
		}

		function unobserve(property, fn) {
			Sparky.unobserve(scope, property, fn);
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
				return Sparky(node, scope);
			}

			if (path === '.') {
				return Sparky(node, model);
			}

			if (rrelativepath.test(path)) {
				data = findByPath(model, path.replace(rrelativepath, ''));

				if (!data) {
					throw new Error('[Sparky] No object at relative path \'' + path + '\' of model#' + model.id);
				}

				return Sparky(node, data);
			}

			rtag.lastIndex = 0;
			if (rtag.test(path)) {
				
				rtag.lastIndex = 0;
				data = findByPath(scope, rtag.exec(path)[1]);

				if (!data) {
					throw new Error('[Sparky] No object at path \'' + path + '\' of parent scope');
				}

				return Sparky(node, data);
			}

			return Sparky(node, findByPath(Sparky.data, path));
		}

		sparky.node = node;

		sparky.destroy = function destroy() {
			if (unbind) {
				unbind();
				unbind = undefined;
			}

			sparky.trigger('destroy');
			sparky.off();
		};

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope.
		scope = ctrl && ctrl(node, model, sparky);
		
		//if (Sparky.debug && scope) { console.log('[Sparky] with controller scope:', scope); }
		
		if (!scope) {
			//if (Sparky.debug) { console.log('[Sparky] with model as scope:', model); }
			scope = model;
		}
		
		if (Sparky.debug && templateId) {
			console.log('[Sparky] template:', templateId);
		}
		
		// If there's no model to bind, we need go no further.
		if (!scope) { return; }
		
		// The bind function returns an array of unbind functions.
		unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, set, create);
		
		sparky.trigger('ready');
	}

	// The Sparky function

	function Sparky(node, model, ctrl) {
		var sparky, modelPath, ctrlPath, tag;
		
		// If node is a string, assume it is the id of a template
		if (typeof node === 'string') {
			node = Sparky.template(node);
		}

		// Where model not defined look for the data-model attribute
		if (!model && node.getAttribute) {
			modelPath = node.getAttribute('data-model');
			
			if (isDefined(modelPath)) {
				model = isDefined(modelPath) && findByPath(Sparky.data, modelPath);
				
				if (model === undefined) {
					throw new Error('[Sparky] ' + modelPath + ' not found in Sparky.data');
				}
			}
		}

		// Where ctrl is not defined look for the data-ctrl attribute
		if (!ctrl && node.getAttribute) {
			ctrlPath = node.getAttribute('data-ctrl');
			
			ctrl = isDefined(ctrlPath) ? findByPath(Sparky.controllers, ctrlPath) :
				(tag = node.tagName.toLowerCase()) === 'input' ? inputCtrl :
				tag === 'select' ? selectCtrl :
				tag === 'textarea' ? textareaCtrl :
				defaultCtrl ;
		}

		// Where model is an array or array-like object with a length property,
		// set up Sparky to clone node for every object in the array.
		if (model && model.length !== undefined) {
			return setupCollection(node, model, ctrl);
		}
		
		if (Sparky.debug === 'verbose') {
			console.groupCollapsed('[Sparky] Sparky(', node, ',',
				(model && ('model#' + model.id)), ',',
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
	Sparky.mixin       = ns.mixin || (ns.mixin = {});
	Sparky.observe     = ns.observe;
	Sparky.unobserve   = ns.unobserve;
	Sparky.Collection  = ns.Collection;
	Sparky.data        = data;
	Sparky.controllers = controllers;
	Sparky.templates   = templates;
	Sparky.features    = features;
	Sparky.template    = fetchTemplate;
	Sparky.extend      = extend;
	Sparky.throttle    = onFrame;

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
		
		// Remove child sparkies
		while (++n < l) {
			node = nodes[n];
			array.push(node);
			while (++n < l && node.contains(nodes[n]));
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