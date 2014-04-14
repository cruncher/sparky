// delegate
//
// An event delegate function that understands both HTML and
// SVG DOM.

(function(ns) {
	function matches(node, selector) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			node.tagName.toLowerCase() === selector ;
	}
	
	function closest(node, root, selector) {
		if (node.correspondingUseElement) {
			// SVG <use> elements store their DOM reference in
			// .correspondingUseElement.
			node = node.correspondingUseElement;
		}
		
		if (node === root) { return; }
		
		if (matches(node, selector)) { return node; }
		
		return closest(node.parentNode, root, selector);
	}
	
	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		
		return function(e) {
			var node = closest(e.target, e.currentTarget, selector);
			
			if (!node) { return; }
			
			e.delegateTarget = node;
			return fn(e);
		};
	}
	
	ns.delegate = delegate;
})(window);