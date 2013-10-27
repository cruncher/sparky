// app.js
// 
// A simple app toolkit. No magic. Reads data attributes in
// the DOM to bind dynamic data to views.
// 
// Views
// 
// <div data-view="name" data-data="path.to.data">
//     <h1>Hello world</h1>
// </div>
// 
// Where 'name' is the key of a view function in app.views and
// path.to.data points to an object in app.data.
// 
// Template
// 
// <div data-template="name">
//     <h1>{{ prop }}</h1>
// </div>
// 
// The template is stored as a DOM node in app.templates[name],
// and can be rendered with app.render(name, context), where
// context is an object with properties that match template tags
// such as {{ prop }}.

(function(jQuery, undefined){
	"use strict";
	
	var debug = false,
	    
	    doc = jQuery(document),
	    
	    rcomment = /\{\%\s*.+?\s*\%\}/g,
	    rtag = /\{\{\s*(\w+)\s*\}\}/g;
	
	var map = Array.prototype.map;
	var reduce = Array.prototype.reduce;
	
	function noop() {}
	
	// Pure functions
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}
	
	function isObject(obj) {
		return obj instanceof Object;
	}
	
	function returnArg(n) {
		return n;
	}
	
	// Feature detection
	
	function identify(node) {
		var id = node.id;

		if (!id) {
			do { id = Math.ceil(Math.random() * 100000); }
			while (document.getElementById(id));
			node.id = id;
		}

		return id;
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
		var children = map.call(template.childNodes, returnArg);
		var fragment = document.createDocumentFragment();
		return reduce.call(children, append, fragment);
	}
	
	Sparky.features = {
		template: 'content' in document.createElement('template')
	};

	var templateContent = Sparky.templateContent = Sparky.features.template ?
		function(template) {
			return template.content;
		} : (function() {
			var cache = {};

			return function(template) {
				var id = identify(template);
				
				return cache[id] ||
					(cache[id] = fragmentFromChildren(template));
			}
		})() ;
	
	function cloneTemplate(template) {
		return templateContent(template).cloneNode(true);
	}
	
	
	// App
	
	function objFrom(obj, array) {
		var val = obj[array[0]],
		    slice = array.slice(1);
		
		return isDefined(val) && slice.length ?
			objFrom(val, slice) :
			val ;
	}
	
	function objFromPath(obj, path) {
		return objFrom(obj, path.split('.'));
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
	
	function setupView(datas, views, node, settings) {
		var viewPath = node.getAttribute('data-view');
		var dataPath = node.getAttribute('data-data');
		var view = viewPath && objFromPath(views, viewPath);
		var data = isDefined(dataPath) && (objFromPath(datas, dataPath) || datas);
		var context, untemplate;
		var templateId = node.getAttribute('data-template');
		var templateNode = templateId && document.getElementById(templateId);
		var templateFragment = templateNode && cloneTemplate(templateNode);
		
		function insertTemplate() {
			// Wait until the data is rendered on the next animation frame
			requestAnimationFrame(function() {
				replace(node, templateFragment);
			});
			
			insertTemplate = noop;
		};

		function insert() {
			insertTemplate(node, templateFragment);
		}

		function observe(property, fn) {
			sparky.observe(context, property, fn);
			
			if (templateFragment) {
				sparky.observe(context, property, insert);
			}
		}
		
		function unobserve(property, fn) {
			sparky.unobserve(context, property, fn);
		}

		function get(property) {
			return sparky.get(context, property);
		}
		
		function destroy() {
			untemplate && untemplate();
		}
		
		//if (debug) console.log('[app] view: "' + viewPath + (dataPath ? '" data: "' + dataPath + '"' : ''));
		//if (!view) { throw new Error('\'' + viewPath + '\' not found in app.views'); }
		if (data === undefined) { throw new Error('\'' + dataPath + '\' not found in sparky.data'); }
		
		if (debug) {
			console.log('view:', viewPath);
			console.log('data:', dataPath, data);
		}
		
		// If a context object is returned by the view, we use that, otherwise
		// we use the data object as context.
		context = view && view(node, data, destroy) || data;
		
		if (debug) {
			console.log('context:', context);
			console.log('template:', templateId);
		}
		
		// If there's no data to bind, we need go no further.
		if (!context) { return; }
		
		// The template function returns an untemplate function.
		untemplate = sparky.template(templateFragment || node, observe, unobserve, get);
	}
	
	// Expose
	
	function Sparky(node, settings) {
		// Accept a selector as the first argument
		if (typeof node === 'string') {
			node = jQuery(node)[0];

			if (!node) {
				throw new Error('Node not found from selector \'' + arguments[0] + '\'.');
			}
		}

		doc.ready(function(){
			var start = Date.now();

			jQuery('[data-view], [data-data]', node).each(function() {
				if (debug) { console.groupCollapsed('[sparky] template', this); }
				
				setupView(Sparky.data, Sparky.views, this, settings);
				
				if (debug) { console.groupEnd(); }
			});
			
			console.log('[sparky] Initialised templates and views (' + (Date.now() - start) + 'ms)');
		});
	};
	
	Sparky.debug = debug;
	
	if (window.require) {
		module.exports = Sparky;
	}
	else {
		window.sparky = Sparky;
	}
})(jQuery);