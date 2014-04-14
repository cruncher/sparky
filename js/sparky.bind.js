// DOM Binder
//
// Binds data to the DOM. Changes in data are then immediately rendered
// in the nodes that display that data via template tags such as {{ name }}.
// Only those nodes containing the changed data are updated, other nodes are
// left alone. The actual DOM tree does not change. Template tags can also
// be used in the attributes href, title, id, class, style and value.
//
// dataBind(node, observeFn, unobserveFn, getFn)
//
// node
//
// A DOM node to use as a route. The inner DOM tree is traversed and references
// to property names written as {{ name }} cause bindFn to be called with name
// as property.
//
// bindFn(property, fn)
//
// Responsible for listening to changes to properties on a data object or model.
// When the named property changes, function fn must be called.
//
// getFn(property)
//
// Responsible for returning the value of the named property from a data object
// or model.


(function(Sparky) {
	"use strict";

	var debug = Sparky.debug;

	// For debugging
	var nodeCount = 0;
	var textCount = 0;

	var attributes = [
		'href',
		'title',
		'id',
		'style',
		'value',
		'src',
		'alt'
	];
	
	var xlink = 'http://www.w3.org/1999/xlink';
	var xsvg  = 'http://www.w3.org/2000/svg';

	window.xlink = xlink;
	window.xsvg = xsvg;

	var rname = /\{\{\s*([\w\-]+)\s*(?:\|([^\}]+))?\s*\}\}/g;
	var rfilter = /\s*([a-zA-Z0-9_]+)\s*(?:\:(.+))?/;

	var filterCache = {};

	var types = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };

	var tags = {
	    	input: function(node, prop, bind, unbind, get) {
	    		bind(prop, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});
	    	},
	    	
	    	select: function(node, prop, bind, unbind, get) {
	    		bind(node.name, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});
	    	},
	    	
	    	textarea: function(node, prop, bind, unbind, get) {
	    		bind(node.name, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});
	    	}
	    };

	function call(fn) {
		fn();
	}
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function domNode(node, bind, unbind, get, create) {
		var unobservers = [];
		var tag = node.tagName.toLowerCase();
		var isSVG = node instanceof SVGElement;

		if (debug) { console.log('[Sparky] <' + tag + '>'); }
		bindClass(node, bind, unbind, get, unobservers);
		bindAttributes(node, bind, unbind, get, unobservers);
		bindNodes(node, bind, unbind, get, create, unobservers);

		// Set up name-value databinding for form elements 
		if (tags[tag]) {
			tags[tag](node, node.name, bind, unbind, get);
		}

		nodeCount++;
		return unobservers;
	}

	function textNode(node, bind, unbind, get, create) {
		textCount++;

		//var innerText = node.textContent === undefined ? 'innerText' : 'textContent' ;
		var detachFn = observeProperties(node.nodeValue, bind, unbind, get, function(text) {
			node.nodeValue = text;
		});

		return [detachFn];
	}

	function fragmentNode(node, bind, unbind, get, create) {
		var unobservers = [];

		bindNodes(node, bind, unbind, get, create, unobservers);
		nodeCount++;
		return unobservers;
	}


	function bindNodes(node, bind, unbind, get, create, unobservers) {
		var nodes = node.childNodes,
		    n = -1,
		    l = nodes.length,
		    child, sparky;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute &&
			   (isDefined(child.getAttribute('data-ctrl')) ||
			    isDefined(child.getAttribute('data-model')))) {
				sparky = create(child);
				unobservers.push(sparky.destroy);
			}
			else if (types[child.nodeType]) {
				unobservers.push.apply(unobservers, types[child.nodeType](child, bind, unbind, get, create));
			}
		}
	}

	function getClassList(node) {
		return node.classList || node.className.trim().split(/\s+/);
	}

	function updateClassSVG(node, text) {
		// Trying to use className sets a bunch of other
		// attributes on the node, bizarrely.
		node.setAttribute('class', text);
	}
	
	function updateClassHTML(node, text) {
		node.className = text;
	}

	function updateAttributeSVG(node, attribute, value) {
		node.setAttributeNS(xlink, attribute, value);
	}
	
	function updateAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function bindClass(node, bind, unbind, get, unobservers) {
		var value = node.getAttribute('class');
		
		if (!value) { return; }
		
		var update = node instanceof SVGElement ?
				updateClassSVG.bind(this, node) :
				updateClassHTML.bind(this, node) ;
		
		// TODO: only replace classes we've previously set here
		unobservers.push(observeProperties(value, bind, unbind, get, update));
	}

	function bindAttributes(node, bind, unbind, get, unobservers) {
		var a = attributes.length;

		while (a--) {
			bindAttribute(node, attributes[a], bind, unbind, get, unobservers);
		}
	}

	function bindAttribute(node, attribute, bind, unbind, get, unobservers) {
		var isSVG = node instanceof SVGElement;
		var value = isSVG ?
		    	node.getAttributeNS(xlink, attribute) :
		    	node.getAttribute(attribute) ;
		var update;
		
		if (!isDefined(value) || value === '') { return; }
		
		update = isSVG ?
			updateAttributeSVG.bind(this, node, attribute) :
			updateAttributeHTML.bind(this, node, attribute) ;
		
		unobservers.push(observeProperties(value, bind, unbind, get, update));
	}

	function extractProperties(str) {
		var propertiesCache = {},
		    properties = [];

		str.replace(rname, function($0, $1, $2){
			// Make sure properties are only added once.
			if (!propertiesCache[$1]) {
				propertiesCache[$1] = true;
				properties.push($1);
			}
		});

		return properties;
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filters[parts[1]],
			args: parts[2] && JSON.parse('[' + parts[2].replace(/\'/g, '\"') + ']')
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
		    	filterCache[filterString] = filterString.split('|').map(toFilter)
		    ),
		    l = filters.length,
		    n = -1;

		while (++n < l) {
			if (!filters[n].fn) {
				throw new Error('[Sparky] filter \'' + filters[n].name + '\' is not a Sparky filter');
			}
			
			if (debug) {
				console.log('[Sparky] filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}
			
			word = filters[n].fn.apply(word, filters[n].args);
		}

		return word;
	}

	function observeProperties(text, bind, unbind, get, fn) {
		var properties = extractProperties(text);

		function replaceText($0, $1, $2) {
			var word = get($1);

			return word === undefined ? '' :
				$2 ? applyFilters(word, $2) :
				word ;
		}

		function update() {
			fn(text.replace(rname, replaceText));
		}

		// Observe properties
		properties.forEach(function attach(property) {
			bind(property, update);
		});

		// Return a function that unobserves properties
		return function() {
			properties.forEach(function detach(property) {
				unbind(property, update);
			});
		};
	}

	function traverse(node, observe, unobserve, get, create) {
		nodeCount = 0;
		textCount = 0;

		// Assume this is a DOM node, and set the binder off. The
		// binder returns an array of unobserve functions that
		// should be kept around in case the DOM element is removed
		// and the bindings should be thrown away.
		var unobservers = types[node.nodeType](node, observe, unobserve, get, create);

		if (debug) {
			console.log('[Sparky] bound dom nodes:', nodeCount, 'text nodes:', textCount);
		}

		return function unbind() {
			unobservers.forEach(call);
		};
	}

	Sparky.bind = traverse;
})(window.Sparky || require('sparky'));
