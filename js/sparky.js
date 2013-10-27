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
	
	var doc = jQuery(document);
	
	var map = Array.prototype.map,
	    reduce = Array.prototype.reduce,
	    slice = Array.prototype.slice;
	
	var rcomment = /\{\%\s*.+?\s*\%\}/g,
	    rtag = /\{\{\s*(\w+)\s*\}\}/g;
	
	var debug     = false;
	var views     = {};
	var templates = {};
	var data      = {};
	var features  = {
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
	
	
	// Feature detection
	
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
			console.warn('[sparky] template #' + id + ' not found.');
		}

		return template && template.cloneNode(true);
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
		var templateId = node.getAttribute('data-template');
		var templateFragment = templateId && fetchTemplate(templateId);
		var context, untemplate;
		
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
			
			// Start off with populated nodes
			fn();
			
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
	
	

	doc.ready(function(){
		var start = Date.now();

		jQuery('[data-view], [data-data]').each(function() {
			if (debug) { console.groupCollapsed('[sparky] template', this); }
			
			setupView(sparky.data, sparky.views, this);
			
			if (debug) { console.groupEnd(); }
		});
		
		console.log('[sparky] Initialised templates and views (' + (Date.now() - start) + 'ms)');
	});

	// Expose

	var sparky = {
	    	debug: debug,
	    	data: data,
	    	views: views,
	    	templates: templates,
	    	features: features
	    };

	if (window.require) {
		module.exports = sparky;
	}
	else {
		window.sparky = sparky;
	}
})(jQuery);