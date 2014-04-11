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


(function(jQuery, ns, undefined){
	"use strict";
	
	var map = Array.prototype.map,
	    reduce = Array.prototype.reduce,
	    slice = Array.prototype.slice;
	
	var rcomment = /\{\%\s*.+?\s*\%\}/g,
	    rtag = /\{\{\s*(\w+)\s*\}\}/g,
	    rbracket = /\]$/,
	    rpathsplitter = /\]?\.|\[/g,
	    // Check whether a path begins with '.' or '['
	    rrelativepath = /^\.|^\[/;
	
	var debug       = true;//false;
	var controllers = {};
	var templates   = {};
	var data        = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };
	
	var prototype = extend({}, ns.mixin.events);
	
	// Pure functions
	
	function noop() {}

	function call(fn) {
		fn();
	}
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}
	
	function isObject(obj) {
		return obj instanceof Object;
	}

	function getProperty(obj, property) {
		return obj[property];
	}

	function getDestroy(obj) {
		return obj.destroy;
	}

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
		
		if (debug && !template) {
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
			var value = type === 'number' || type === 'range' ?
					parseFloat(e.target.value) :
					e.target.value ;

			model[prop] = value;
		});

		observe(model, prop, function() {
			var value = model[prop];
			node.value = isDefined(value) ? value : '' ;
		});
	}
	
	function selectCtrl(node, model, sparky) {
		
	}
	
	function textareaCtrl(node, model, sparky) {
		
	}
	
	function objFrom(obj, array) {
		var val = obj[array[0]],
		    slice = array.slice(1);
		
		return isDefined(val) && slice.length ?
			objFrom(val, slice) :
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
		return path !== undefined && objFromPath(obj, path.replace(rrelativepath, ''));
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
		var cache = model.slice();
		
		function updateNodes(model) {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, obj;
			
			console.log('[Sparky] Update sparky collection');
			
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
		}
		
		// Put the marker nodes in place
		insertNode(node, startNode);
		insertNode(node, endNode);
		
		// Remove the node
		removeNode(node);

		// Observe length and update the DOM on next
		// animation frame if it changes.
		if (isConfigurable(model, 'length')) {
			observe(model, 'length', onFrame(updateNodes));
		}
		
		// model.length cannot be observed by our observer.
		// So we need to dirty check it for changes.
		else {
			if (debug) {
				console.warn('[Sparky] Using dirtyObserve(). Object is probably an actual array./n' +
				             '         dirtyObserve() isnt very performant. You might want to consider/n' +
				             '         using a Collection([]) in place of the array.');
			}
			
			dirtyObserve(model, 'length', onFrame(updateNodes));
		}
		
		updateNodes(model);
		
		return {
			destroy: function() {
				sparkies.map(getDestroy).forEach(call);
			}
		};
	}

	function Sparky(node, model, ctrl) {
		var sparky;
		
		if (!model) {
			var modelPath = node.getAttribute('data-model');
			model = isDefined(modelPath) && findByPath(Sparky.data, modelPath);
		}
		
		if (!ctrl) {
			var ctrlPath = node.getAttribute('data-ctrl');
			var tag;
			
			ctrl = isDefined(ctrlPath) ? findByPath(Sparky.controllers, ctrlPath) :
				(tag = node.tagName.toLowerCase()) === 'input' ? inputCtrl :
				tag === 'select' ? selectCtrl :
				tag === 'textarea' ? textareaCtrl :
				defaultCtrl ;
		}
		
		if (model.length !== undefined) {
			// model is an array or collection
			if (debug) { console.groupCollapsed('[Sparky] collection:', node); }
			sparky = setupCollection(node, model, ctrl);
		}
		else {
			if (debug) { console.groupCollapsed('[Sparky] node:', node); }
			sparky = Object.create(prototype);
			setupSparky(sparky, node, model, ctrl);
		}
		
		if (debug) { console.groupEnd(); }
		
		return sparky;
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
			return getProperty(scope, property);
		}
		
		function create(node) {
			var modelPath = node.getAttribute('data-model');
			
			if (modelPath === undefined) {
				return Sparky(node);
			}
			
			if (rrelativepath.test(modelPath)) {
				return Sparky(node, findByPath(model, modelPath));
			}
			
			return Sparky(node, findByPath(Sparky.data, modelPath));
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
		
		if (model === undefined) { throw new Error('[Sparky] model not found in Sparky.data'); }
		
		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope.
		scope = ctrl && ctrl(node, model, sparky);
		
		if (!scope) {
			if (debug) { console.log('[Sparky] with model as scope:', model); }
			scope = model;
		}
		else {
			if (debug) { console.log('[Sparky] with controller scope:', scope); }
		}
		
		if (debug && templateId) {
			console.log('[Sparky] template:', templateId);
		}
		
		// If there's no model to bind, we need go no further.
		if (!scope) { return; }
		
		// The bind function returns an array of unbind functions.
		unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, create);
		
		sparky.trigger('ready');
	}

	// Expose

	Sparky.mixin       = ns.mixin || (ns.mixin = {});
	Sparky.events      = ns.events || (ns.events = {});
	Sparky.observe     = ns.observe;
	Sparky.unobserve   = ns.unobserve;

	Sparky.debug       = debug;
	Sparky.data        = data;
	Sparky.controllers = controllers;
	Sparky.templates   = templates;
	Sparky.features    = features;
	Sparky.template    = fetchTemplate;
	Sparky.extend      = extend;

	ns.sparky = Sparky;


	// Bind the DOM

	if (!jQuery) { return; }

	var doc = jQuery(document);

	doc.ready(function(){
		var start = Date.now();

//		if (debug) { console.groupCollapsed('[Sparky] DOM'); }
		
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

		if (debug) { console.log('[Sparky] DOM nodes to bind:', array); }
		
		array.forEach(function(node) {
			Sparky(node);
		});
		
//		if (debug) { console.groupEnd(); }
		if (window.console) { console.log('[Sparky] DOM initialised in ' + (Date.now() - start) + 'ms'); }
	});
})(jQuery, this);