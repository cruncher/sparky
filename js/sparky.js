// app.js
// 
// A simple app toolkit. No magic. Reads data attributes in
// the DOM to bind dynamic data to controllers.
// 
// Views
// 
// <div data-ctrl="name" data-model="path.to.data">
//     <h1>Hello world</h1>
// </div>
// 
// Where 'name' is the key of a view function in app.controllers and
// path.to.data points to an object in app.data.
// 
// Template
// 
// <div data-template="name">
//     <h1>{{ prop }}</h1>
// </div>
// 
// The template is stored as a DOM node in app.templates[name],
// and can be rendered with app.render(name, scope), where
// scope is an object with properties that match template tags
// such as {{ prop }}.

(function(jQuery, ns, undefined){
	"use strict";
	
	var doc = jQuery(document);
	
	var map = Array.prototype.map,
	    reduce = Array.prototype.reduce,
	    slice = Array.prototype.slice;
	
	var rcomment = /\{\%\s*.+?\s*\%\}/g,
	    rtag = /\{\{\s*(\w+)\s*\}\}/g,
	    rbracket = /\]$/,
	    rpathsplitter = /\]?\.|\[/g;
	
	var debug       = false;
	var controllers = {};
	var templates   = {};
	var data        = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };
	
	function noop() {}

	// Pure functions
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}
	
	function isObject(obj) {
		return obj instanceof Object;
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
	
	function trigger(target, type) {
		var e;
		
		if (document.createEventObject) {
			e = document.createEventObject(window.event);
			target.fireEvent('on' + type, e);
		}
		else {
			e = document.createEvent('Event');
			e.initEvent(type, true, true, null);
			target.dispatchEvent(e);
		}
	}
	
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
	
	function defaultCtrl(node, model) {
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
	
	var prototype = extend({}, ns.mixin.events);

	function Sparky(node, model, ctrl) {
		if (!model) {
			model = findByPath(Sparky.data, node.getAttribute('data-model'));
		}
		
		if (!ctrl) {
			ctrl = findByPath(Sparky.controllers, node.getAttribute('data-ctrl')) || defaultCtrl;
		}
		
		var sparky = Object.create(prototype);
		
		setupSparky(sparky, node, model, ctrl);
		
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
				sparky(node, 'templated');
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
			return Sparky.get(scope, property);
		}
		
		sparky.node = node;
		
		sparky.destroy = function destroy() {
			untemplate && untemplate();
			untemplate = false;
			sparky.trigger('destroy');
		};
		
		if (model === undefined) { throw new Error('[Sparky] model not found in Sparky.data'); }
		
		if (debug) {
			console.log('ctrl:', ctrl);
			console.log('model:', model);
		}
		
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

	doc.ready(function(){
		var start = Date.now();

		jQuery('[data-ctrl], [data-model]').each(function() {
			if (debug) { console.groupCollapsed('[Sparky] template', this); }
			
			Sparky(this);
			
			if (debug) { console.groupEnd(); }
		});
		
		console.log('[Sparky] DOM initialised (' + (Date.now() - start) + 'ms)');
	});

	// Expose

	Sparky.mixin       = ns.mixin || (ns.mixin = {});
	Sparky.events      = ns.events || (ns.events = {});
	Sparky.observe     = ns.observe;
	Sparky.unobserve   = ns.unobserve;
	Sparky.get         = function(data, property) {
		return data[property];
	};

	Sparky.debug       = debug;
	Sparky.data        = data;
	Sparky.controllers = controllers;
	Sparky.templates   = templates;
	Sparky.features    = features;
	Sparky.template    = fetchTemplate;
	Sparky.extend      = extend;

	ns.sparky = Sparky;
})(jQuery, this);