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
	    rpathsplitter = /\]?\.|\[/g;
	
	var debug       = true;//false;
	var controllers = {};
	var templates   = {};
	var data        = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };
	
	var prototype = extend({}, ns.mixin.events);
	
	function noop() {}

	// Pure functions
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}
	
	function isObject(obj) {
		return obj instanceof Object;
	}

	function getProperty(obj, property) {
		return obj[property];
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
	
	
	// App
	
	function destroyNode(node) {
		node.parentNode.removeChild(node);
	}
	
	function defaultCtrl(node, model, sparky) {
		sparky.on('destroy', destroyNode, node);
		
		return model;
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
		return objTo(root, path.split('.'), obj);
	}
	
	function setupView(node) {
		var viewPath = node.getAttribute('data-ctrl');
		var dataPath = node.getAttribute('data-model');

		sparky(node, dataPath, viewPath);
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
		return path !== undefined && objFromPath(obj, path);
	}

	function Sparky(node, model, ctrl) {
		if (debug) { console.groupCollapsed('[Sparky] <' + node.tagName.toLowerCase() + '>'); }
		
		if (!model) {
			model = findByPath(Sparky.data, node.getAttribute('data-model'));
		}
		
		if (!ctrl) {
			ctrl = findByPath(Sparky.controllers, node.getAttribute('data-ctrl')) || defaultCtrl;
		}
		
		if (debug) { console.log('[Sparky] node:', node); }
		
		var sparky = Object.create(prototype);
		
		setupSparky(sparky, node, model, ctrl);
		
		if (debug) { console.groupEnd(); }
		
		return sparky;
	}

	function setupSparky(sparky, node, model, ctrl) {
		var templateId = node.getAttribute && node.getAttribute('data-template');
		var templateFragment = templateId && fetchTemplate(templateId);
		var scope, untemplate;
		
		function insertTemplate() {
			// Wait until the scope is rendered on the next animation frame
			requestAnimationFrame(function() {
				replace(node, templateFragment);
				sparky.trigger(node, 'templated');
			});
			
			insertTemplate = noop;
		};

		function insert() {
			insertTemplate(node, templateFragment);
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
		
		sparky.node = node;
		
		sparky.destroy = function destroy() {
			untemplate && untemplate();
			untemplate = false;
			sparky.trigger('destroy');
		};
		
		if (model === undefined) { throw new Error('[Sparky] model not found in Sparky.data'); }
		
		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope.
		scope = ctrl && ctrl(node, model, sparky) || model;
		
		if (debug) {
			console.log('scope:', scope);
			console.log('template:', templateId);
		}
		
		// If there's no model to bind, we need go no further.
		if (!scope) { return; }
		
		// The template function returns an untemplate function.
		untemplate = Sparky.bind(templateFragment || node, observe, unobserve, get);
		
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

		if (debug) { console.groupCollapsed('[Sparky] DOM'); }
		
		jQuery('[data-ctrl], [data-model]').each(function() {
			Sparky(this);
		});
		
		if (debug) { console.groupEnd(); }
		if (window.console) { console.log('[Sparky] DOM initialised in ' + (Date.now() - start) + 'ms'); }
	});
})(jQuery, this);