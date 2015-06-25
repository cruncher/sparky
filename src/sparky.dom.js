(function(Sparky) {
	"use strict";

	// Matches anything with a space
	var rspaces = /\s+/;


	// Pure functions

	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }


	// TokenList constructor to emulate classList property. The get fn should
	// take the arguments (node), and return a string of tokens. The set fn
	// should take the arguments (node, string).

	function TokenList(node, get, set) {
		this.node = node;
		this.get = get;
		this.set = set;
	}

	TokenList.prototype = {
		add: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;

			while (n--) {
				if (array.indexOf(arguments[n]) === -1) {
					array.push(arguments[n]);
				}
			}

			this.set(this.node, array.join(' '));
		},

		remove: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;
			var i;

			while (n--) {
				i = array.indexOf(arguments[n]);
				if (i !== -1) { array.splice(i, 1); }
			}

			this.set(this.node, array.join(' '));
		}
	};


	function getClass(node) {
		// node.className is an object in SVG. getAttribute
		// is more consistent, if a tad slower.
		return node.getAttribute('class');
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function getClassList(node) {
		return node.classList || new TokenList(node, getClass, setClass);
	}


	// DOM methods made easy

	function matches(node, selector) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			node.tagName.toLowerCase() === selector ;
	}

	function closest(node, selector, root) {
		if (!node || node === root || node === document || node.nodeType === 11) { return; }

		if (node.correspondingUseElement) {
			// SVG <use> elements store their DOM reference in
			// .correspondingUseElement.
			node = node.correspondingUseElement;
		}

		return matches(node, selector) ?
			 node :
			 closest(node.parentNode, selector, root) ;
	}

	function tagName(node) {
		return node.tagName.toLowerCase();
	}

	function remove(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}
	
	function insertBefore(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}
	
	function insertAfter(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}


	// Templates

	var templates = {};

	function fragmentFromChildren(template) {
		var children = slice(template.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce(children, append, fragment);
	}

	function getTemplateContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		if (!node) { throw new Error('Sparky: requested template id="' + id + '". That is not in the DOM.') }
		return node && getTemplateContent(node);
	}

	function fetchTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		return template && template.cloneNode(true);
	}


	function append(parent, node) {
		parent.appendChild(node);
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


	// Events

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(e.target, selector, e.currentTarget);

			if (!node) { return; }

			e.delegateTarget = node;
			return fn(e);
		};
	}


	// Traversal

	// query(selector)
	// query(node, selector)

	function query(node, selector) {
		if (arguments.length === 1 && typeof node === 'string') {
			selector = node;
			node = document;
		}

		return Array.prototype.slice.apply(node.querySelectorAll(selector));
	}


	// Export

	Sparky.dom = {
		tag: tagName,
		append: append,
		after: insertAfter,
		before: insertBefore,
		remove: remove,
		query: query,
		closest: closest,
		matches: matches,  
		classes: getClassList,
		getClass: getClass,
		setClass: setClass,
		delegate: delegate,
		cloneTemplate: fetchTemplate,
		fragmentFromChildren: fragmentFromChildren
	};
})(window.Sparky);