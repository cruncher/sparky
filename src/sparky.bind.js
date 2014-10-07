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
		'src',
		'alt',
		'min',
		'max'
	];
	
	var xlink = 'http://www.w3.org/1999/xlink';
	var xsvg  = 'http://www.w3.org/2000/svg';

	window.xlink = xlink;
	window.xsvg = xsvg;

	// Matches a sparky template tag, capturing (tag name, filter string)
	var rname   = /(\{\{\{?)\s*([\w\-\.\[\]]+)\s*(?:\|([^\}]+))?\s*\}\}\}?/g;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?:\:(.+))?/;

	var filterCache = {};

	var nodeTypes = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };

	var empty = [];

	var changeEvent = new CustomEvent('valuechange', { bubbles: true });

	var tags = {
	    	input: function(node, name, bind, unbind, get, set, create, unobservers) {
	    		var prop = (rname.exec(node.name) || empty)[2];

	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value1 = get(prop);
	    		var value2 = normalise(node.getAttribute('value'));
	    		var flag = false;
	    		var throttle, change;

	    		if (node.type === 'checkbox') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (node.checked && !isDefined(value1)) {
	    				set(prop, value2);
	    			}
	    			
	    			throttle = Sparky.Throttle(function setChecked() {
	    				node.checked = node.value === (get(prop) + '');
	    				node.dispatchEvent(changeEvent);
	    			});
	    			
	    			bind(prop, throttle);
	    			
	    			change = function change(e) {
	    				set(prop, node.checked ? normalise(node.value) : undefined);
	    			};
	    			
	    			node.addEventListener('change', change);
	    		}
	    		else if (node.type === 'radio') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (!isDefined(value1) && node.checked) {
	    				set(prop, value2);
	    			}
	    			
	    			throttle = Sparky.Throttle(function setChecked() {
	    				node.checked = node.value === (get(prop) + '');
	    				node.dispatchEvent(changeEvent);
	    			});
	    			
	    			bind(prop, throttle);
	    			
	    			change = function change(e) {
	    				if (node.checked) { set(prop, normalise(node.value)); }
	    			};
	    			
	    			node.addEventListener('change', change);
	    		}
	    		else {
	    			change = function change() {
	    				set(prop, normalise(node.value));
	    			}

	    			// Where the node has a value attribute and the model does
	    			// not have value for the named property, give the model the
	    			// node's value
	    			if (value2 && !isDefined(value1)) {
	    				change();
	    			}

	    			throttle = Sparky.Throttle(function setValue() {
	    				var val = get(prop);
	    				var value = isDefined(val) ? val : '' ;

	    				// Avoid setting where the node already has this value, that
	    				// causes the cursor to jump in text fields
	    				if (node.value !== (value + '')) {
	    					node.value = value;
	    					node.dispatchEvent(changeEvent);
	    				}
	    			});

	    			bind(prop, throttle);

	    			node.addEventListener('change', change);
	    			node.addEventListener('input', change);
	    		}
	    		
	    		unobservers.push(function() {
	    			unbind(prop, throttle);
	    			throttle.cancel();
	    			node.removeEventListener('change', change);
	    			node.removeEventListener('input', change);
	    		});
	    	},
	    	
	    	select: function(node, name, bind, unbind, get, set, create, unobservers) {
	    		bindNodes(node, bind, unbind, get, set, create, unobservers);

	    		var prop = (rname.exec(node.name) || empty)[2];

	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value = get(prop);

	    		var change = function change(e) {
	    		    	set(prop, normalise(node.value));
	    		    };

	    		// If the model property does not yet exist, set it from the
	    		// node's value.
	    		if (!isDefined(value)) {
	    			change();
	    		}

	    		var throttle = Sparky.Throttle(function setValue() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    			node.dispatchEvent(changeEvent);
	    		});

	    		bind(prop, throttle);

	    		node.addEventListener('change', change);

	    		unobservers.push(function() {
	    			unbind(prop, throttle);
	    			throttle.cancel();
	    			node.removeEventListener('change', change);
	    		});
	    	},

	    	option: function(node, name, bind, unbind, get, set, create, unobservers) {
	    		bindAttributes(node, bind, unbind, get, unobservers, ['value']);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers);
	    	},

	    	textarea: function(node, prop, bind, unbind, get, set, create, unobservers) {
	    		var prop = (rname.exec(node.name) || empty)[2];
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value1 = get(prop);
	    		var value2 = node.value;
	    		var change = function change(e) {
	    			set(prop, node.value);
	    		};

	    		// If the model property does not yet exist and this input
	    		// has value, set model property from node's value.
	    		if (!isDefined(value1) && value2) {
	    			change();
	    		}

	    		var throttle = Sparky.Throttle(function setValue() {
	    			var value = get(prop);

	    			// Avoid setting where the node already has this value, that
	    			// causes the cursor to jump in text fields
	    			if (node.value !== (value + '')) {
	    				node.value = isDefined(value) ? value : '' ;
	    				node.dispatchEvent(changeEvent);
	    			}
	    		});

	    		bind(prop, throttle);

	    		node.addEventListener('change', change);

	    		unobservers.push(function() {
	    			unbind(prop, throttle);
	    			throttle.cancel();
	    			node.removeEventListener('change', change);
	    		});
	    	}
	    };

	function noop() {}

	function call(fn) { fn(); }

	function isDefined(n) {
		return n || n !== undefined && n !== null && !Number.isNaN(n);
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
		bindAttributes(node, bind, unbind, get, unobservers, attributes);

		// Set up special binding for certain elements like form inputs
		if (tags[tag]) {
			tags[tag](node, node.name, bind, unbind, get, set, create, unobservers);
		}

		// Or sparkify the child nodes
		else {
			bindNodes(node, bind, unbind, get, set, create, unobservers);
		}

		return unobservers;
	}

	function textNode(node, bind, unbind, get, set, create) {
		var unobservers = [];
		var detachFn = observeProperties(node.nodeValue, bind, unbind, get, function(text) {
			node.nodeValue = text;
		}, unobservers);

		return unobservers;
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
			else if (nodeTypes[child.nodeType]) {
				unobservers.push.apply(unobservers, nodeTypes[child.nodeType](child, bind, unbind, get, set, create));
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
		observeProperties(value, bind, unbind, get, update, unobservers);
	}

	function bindAttributes(node, bind, unbind, get, unobservers, attributes) {
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

		observeProperties(value, bind, unbind, get, update, unobservers);
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filters[parts[1]],

			// Leave the first arg empty. It will be populated with the value to
			// be filtered when the filter fn is called.
			args: parts[2] && JSON.parse('["",' + parts[2].replace(/\'/g, '\"') + ']') || []
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
		    	filterCache[filterString] = filterString.split('|').map(toFilter)
		    );
		var l = filters.length;
		var n = -1;
		var args;

		while (++n < l) {
			if (!filters[n].fn) {
				throw new Error('[Sparky] filter \'' + filters[n].name + '\' is not a Sparky filter');
			}

			if (Sparky.debug === 'filter') {
				console.log('[Sparky] filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}

			args = filters[n].args;
			args[0] = word;
			word = filters[n].fn.apply(Sparky, args);
		}

		return word;
	}

	function extractProperties(str) {
		var properties = [];

		str.replace(rname, function($0, $1, $2){
			// And properties that are to be live updated,
			// and make sure properties are only added once.
			if ($1.length === 2 && properties.indexOf($2) === -1) {
				properties.push($2);
			}
		});

		return properties;
	}

	function observeProperties(text, bind, unbind, get, fn, unobservers) {
		var properties = extractProperties(text);
		return properties.length && observeProperties2(text, bind, unbind, get, fn, unobservers, properties);
	}

	function observeProperties2(text, bind, unbind, get, fn, unobservers, properties) {
		function replaceText($0, $1, $2, $3) {
			var value1 = get($2);
			var value2 = $3 ? applyFilters(value1, $3) : value1 ;
			return isDefined(value2) ? value2 : '' ;
		}

		function update() {
			fn(text.replace(rname, replaceText));
		}

		// Start throttling changes. The first update is immediate.
		var throttle = Sparky.Throttle(update);

		// Observe properties that are to be live updated
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
		var unobservers = nodeTypes[node.nodeType](node, observe, unobserve, get, set, create);

		return function unbind() {
			unobservers.forEach(call);
		};
	}

	Sparky.bind = traverse;
	Sparky.attributes = attributes;
})(window.Sparky || require('sparky'));
