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
	var debug = true,//false,
	    
	    doc = jQuery(document),
	    
	    rcomment = /\{\%\s*.+?\s*\%\}/g,
	    rtag = /\{\{\s*(\w+)\s*\}\}/g;
	
	
	// Pure functions
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}
	
	function isObject(obj) {
		return obj instanceof Object;
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
	
	function setupTemplate(templates, node) {
		objToPath(templates, node.getAttribute('data-template'), node);
		node.removeAttribute('data-template');
		node.parentNode.removeChild(node);
	}
	
	function setupView(datas, views, node, settings) {
		var viewPath = node.getAttribute('data-view');
		var dataPath = node.getAttribute('data-data');
		var view = viewPath && objFromPath(views, viewPath);
		var data = dataPath ? objFromPath(datas, dataPath) : datas;
		var context, untemplate;
		
		function observe(property, fn) {
			//console.log('observing', context, property);
			sparky.observe(context, property, fn);
		}
		
		function unobserve(property, fn) {
			//console.log('unobserving', context, property);
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
		
		console.log('view:', viewPath);
		console.log('data:', dataPath, data);
		
		// If a context object is returned by the view, we use that, otherwise
		// we use the data object as context.
		context = view && view(node, data, destroy) || data;
		
		console.log('context:', context);
		
		// The template function returns an untemplate function
		untemplate = sparky.template(node, observe, unobserve, get);
	}
	
	// Expose
	
	function App(node, settings) {
		// Accept a selector as the first argument
		if (typeof node === 'string') {
			node = jQuery(node)[0];

			if (!node) {
				throw new Error('Node not found from selector \'' + arguments[0] + '\'.');
			}
		}

		doc.ready(function(){
			if (debug) var start = Date.now();
			
			jQuery('[data-template]', node).each(function() {
				setupTemplate(templates, this);
			});

			jQuery('[data-data]', node).each(function() {
				if (debug) { console.group('[sparky] template node', this.id); }
				
				setupView(App.data, App.views, this, settings);
				
				if (debug) { console.groupEnd(); }
			});
			
			if (debug) console.log('[sparky] Initialised templates and views (' + (Date.now() - start) + 'ms)');
		});
	};
	
	if (window.require) {
		module.exports = App;
	}
	else {
		window.sparky = App;
	}
})(jQuery);