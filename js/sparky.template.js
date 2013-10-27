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


(function(sparky) {
	"use strict";
	
	var debug = window.console && console.log ;
	
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

	var rname = /\{\{\s*([a-z]+)\s*(?:\|([^\}]+))?\s*\}\}/g;
	var rfilter = /\s*([a-zA-Z0-9_]+)\s*(?:\:(.+))?/;
	var filterCache = {};

	var types = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };
	
	function domNode(node, bind, unbind, get) {
		var unobservers = [];

		bindClasses(node, bind, unbind, get, unobservers);
		bindAttributes(node, bind, unbind, get, unobservers);
		bindNodes(node, bind, unbind, get, unobservers);
		
		nodeCount++;
		return unobservers;
	}

	function textNode(node, bind, unbind, get) {
		textCount++;

		//var innerText = node.textContent === undefined ? 'innerText' : 'textContent' ;
		var detachFn = observeProperties(node.nodeValue, bind, unbind, get, function(text) {
			node.nodeValue = text;
		});

		return [detachFn];
	}
	
	function fragmentNode(node, bind, unbind, get) {
		var unobservers = [];
		
		bindNodes(node, bind, unbind, get, unobservers);
		nodeCount++;
		return unobservers;
	}
	
	
	function bindNodes(node, bind, unbind, get, unobservers) {
		var nodes = node.childNodes,
		    n = -1, 
		    l = nodes.length,
		    child;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];
			
			console.log(child.nodeType, child, !!child, child.tagName);
			
			if (types[child.nodeType]) {
				Array.prototype.push.apply(unobservers, types[child.nodeType](child, bind, unbind, get));
			}
		}
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var value = node.className;

		if (!value) { return; }
		
		var classList = value.trim().split(/\s+/);
		// TODO: only replace classes we've previously set here
		unobservers.push(observeProperties(value, bind, unbind, get, function(text) {
			node.className = text;
		}));
	}

	function bindAttributes(node, bind, unbind, get, unobservers) {
		var a = attributes.length;
		
		while (a--) {
			bindAttribute(node, attributes[a], bind, unbind, get, unobservers);
		}
	}

	function bindAttribute(node, attribute, bind, unbind, get, unobservers) {
		var value = node.getAttribute(attribute);

		if (!value) { return; }
		
		unobservers.push(observeProperties(value, bind, unbind, get, function(text) {
			node[attribute] = text;
		}));
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
		
		//console.log(parts[2].replace(/\'/g, '\"'));
		
		return {
			fn: sparky.filters[parts[1]],
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
			word = filters[n].fn.apply(word, filters[n].args);
		}
		
		return word;
	}

	function observeProperties(text, bind, unbind, get, fn) {
		var properties = extractProperties(text),
		    flag = false;

		function replaceText($0, $1, $2) {
			var word = get($1);
			
			return $2 ? applyFilters(word, $2) :
				word === undefined ? '' :
				word ;
		}
		
		function update() {
			flag = false;
			fn(text.replace(rname, replaceText));
		}

		function change() {
			if (flag) { return; }
			flag = true;
			window.requestAnimationFrame(update);
		}

		// Observe properties
		properties.forEach(function attach(property) {
			bind(property, change);
		});
		
		// Return a function that unobserves properties
		return function() {
			properties.forEach(function detach(property) {
				unbind(property, change);
			});
		};
	}

	function traverse(node, observe, unobserve, get) {
		nodeCount = 0;
		textCount = 0;
		
		// Assume this is a DOM node, and set the binder off. The
		// binder returns an array of unobserve functions that
		// should be kept around in case the DOM element is removed
		// and the bindings should be thrown away.
		var unobservers = types[node.nodeType](node, observe, unobserve, get);

		if (debug) {
			console.log('dom nodes:  ' + nodeCount);
			console.log('text nodes: ' + textCount);
		}
		
		return function untemplate() {
			while (l--) {
				unobservers[l]();
			}
		};
	}

	sparky.template = traverse;
})(window.sparky || require('sparky'));