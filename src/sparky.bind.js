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

	// For debugging
	var attributes = [
		'href',
		'title',
		'id',
		'for',
		'style',
		'value',
		'src',
		'alt'
	];
	
	var xlink = 'http://www.w3.org/1999/xlink';
	var xsvg  = 'http://www.w3.org/2000/svg';

	window.xlink = xlink;
	window.xsvg = xsvg;

	// Matches a sparky template tag, capturing (tag name, filter string)
	var rname   = /\{\{\s*([\w\-\.\[\]]+)\s*(?:\|([^\}]+))?\s*\}\}/g;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?:\:(.+))?/;

	var filterCache = {};

	var types = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };
	
	var empty = [];

	var tags = {
	    	input: function(node, name, bind, unbind, get, set) {
	    		var prop = (rname.exec(node.name) || empty)[1];
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }
	    		
	    		var value1 = get(prop);
	    		var value2 = normalise(node.getAttribute('value'));
	    		var flag = false;
	    		var throttle;
	    		
	    		function setProperty() {
	    			set(prop, normalise(node.value));
	    		}

	    		if (node.type === 'checkbox') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (node.checked && !isDefined(value1)) {
	    				set(prop, value2);
	    			}
	    			
	    			throttle = Sparky.Throttle(function setChecked() {
	    				node.checked = node.value === (get(prop) + '');
	    			});
	    			
	    			bind(prop, throttle);
	    			
	    			node.addEventListener('change', function(e) {
	    				set(prop, node.checked ? normalise(node.value) : undefined);
	    			});
	    		}
	    		else if (node.type === 'radio') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (!isDefined(value1) && node.checked) {
	    				set(prop, value2);
	    			}
	    			
	    			throttle = Sparky.Throttle(function setChecked() {
	    				node.checked = node.value === (get(prop) + '');
	    			});
	    			
	    			bind(prop, throttle);
	    			
	    			node.addEventListener('change', function(e) {
	    				if (node.checked) { set(prop, normalise(node.value)); }
	    			});
	    		}
	    		else {
	    			// Where the node has a value attribute and the model does
	    			// not have value for the named property, give the model the
	    			// node's value
	    			if (value2 && !isDefined(value1)) {
	    				setProperty();
	    			}

	    			throttle = Sparky.Throttle(function setValue() {
	    				var val = get(prop);
	    				var value = isDefined(val) ? val : '' ;
	
	    				// Avoid setting where the node already has this value, that
	    				// causes the cursor to jump in text fields
	    				if (node.value !== (value + '')) {
	    					node.value = value;
	    				}
	    			});

	    			bind(prop, throttle);
	    			node.addEventListener('change', setProperty);
	    			node.addEventListener('input', setProperty);
	    		}
	    	},
	    	
	    	select: function(node, name, bind, unbind, get, set) {
	    		var prop = (rname.exec(node.name) || empty)[1];
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }
	    		
	    		var value = get(prop);
	    		
	    		// If the model property does not yet exist, set it from the
	    		// node's value.
	    		if (!isDefined(value)) {
	    			set(prop, normalise(node.value));
	    		}
	    		
	    		bind(prop, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});
	    		
	    		node.addEventListener('change', function(e) {
	    			set(prop, normalise(node.value));
	    		});
	    	},
	    	
	    	textarea: function(node, prop, bind, unbind, get, set) {
	    		var prop = (rname.exec(node.name) || empty)[1];
	    		
	    		//console.log('INPUT', node.type, prop);
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value1 = get(prop);
	    		var value2 = node.value;

	    		// If the model property does not yet exist and this input
	    		// has value, set model property from node's value.
	    		if (!isDefined(value1) && value2) {
	    			set(prop, node.value);
	    		}

	    		bind(prop, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});

	    		node.addEventListener('change', function(e) {
	    			console.log('TEXT CHANGE');
	    			set(prop, node.value);
	    		});
	    	}
	    };

	function noop() {}

	function call(fn) {
		fn();
	}

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function normalise(value) {
		// window.isNaN() coerces non-empty strings to numbers before asking if
		// they are NaN. Number.isNaN() (ES6) does not, so beware.
		return value === '' || isNaN(value) ? value : parseFloat(value) ;
	}

	function domNode(node, bind, unbind, get, set, create) {
		var unobservers = [];
		var tag = node.tagName.toLowerCase();
		//var isSVG = node instanceof SVGElement;

		if (Sparky.debug === 'verbose') {
			console.log('[Sparky] <' + tag + '>, children:', node.childNodes.length, Array.prototype.slice.apply(node.childNodes));
		}
		
		bindClass(node, bind, unbind, get, unobservers);
		bindAttributes(node, bind, unbind, get, unobservers);
		bindNodes(node, bind, unbind, get, set, create, unobservers);

		// TODO: We may want to skip bindNodes for form elements, as
		// we a re about to do something special with them.

		// Set up name-value databinding for form elements 
		if (tags[tag]) {
			tags[tag](node, node.name, bind, unbind, get, set);
		}

		return unobservers;
	}

	function textNode(node, bind, unbind, get, set, create) {
		var detachFn = observeProperties(node.nodeValue, bind, unbind, get, function(text) {
			node.nodeValue = text;
		});

		return [detachFn];
	}

	function fragmentNode(node, bind, unbind, get, set, create) {
		var unobservers = [];
		
		bindNodes(node, bind, unbind, get, set, create, unobservers);
		
		return unobservers;
	}

	function bindNodes(node, bind, unbind, get, set, create, unobservers) {
		var nodes = [];
		var n = -1;
		var l, child, sparky;

		// childNodes is a live list, and we don't want it to be because we may
		// be about to modify the DOM. Copy it.
		nodes.push.apply(nodes, node.childNodes);
		l = nodes.length;
		
		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute &&
			   (isDefined(child.getAttribute('data-ctrl')) ||
			    isDefined(child.getAttribute('data-model')))) {
				sparky = create(child);
				unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (types[child.nodeType]) {
				unobservers.push.apply(unobservers, types[child.nodeType](child, bind, unbind, get, set, create));
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
			
			if (Sparky.debug === 'filter') {
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

			return !isDefined(word) ? '' :
				$2 ? applyFilters(word, $2) :
				word ;
		}

		function update() {
			fn(text.replace(rname, replaceText));
		}

		// Start throttling changes. The first update is immediate.
		var throttle = Sparky.Throttle(update);

		// Observe properties
		properties.forEach(function attach(property) {
			bind(property, throttle);
		});

		// Return a function that destroys live bindings
		return function() {
			properties.forEach(function detach(property) {
				// Unobserve properties
				unbind(property, throttle);
			});

			// Cancel already bound updates. If updates are queued,
			// the throttle applies them before bowing out.
			throttle.cancel();
		};
	}

	function traverse(node, observe, unobserve, get, set, create) {
		// Assume this is a DOM node, and set the binder off. The
		// binder returns an array of unobserve functions that
		// should be kept around in case the DOM element is removed
		// and the bindings should be thrown away.
		var unobservers = types[node.nodeType](node, observe, unobserve, get, set, create);

		return function unbind() {
			unobservers.forEach(call);
		};
	}

	Sparky.bind = traverse;
	Sparky.attributes = attributes;
})(window.Sparky || require('sparky'));
