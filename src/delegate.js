
// delegate
//
// An event delegate function that understands both HTML and
// SVG DOM (jQuery's delegator cannot handle SVG DOM). Usage:
//
// document.addEventListener(event, delegate(selector, fn));

(function(ns) {
	"use strict";
	
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
		if (node.correspondingUseElement) {
			// SVG <use> elements store their DOM reference in
			// .correspondingUseElement.
			node = node.correspondingUseElement;
		}

		if (node === root || node === document) { return; }
		if (matches(node, selector)) { return node; }

		return closest(node.parentNode, selector, root);
	}

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

	ns.closest = closest;
	ns.delegate = delegate;
})(window);
