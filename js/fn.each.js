(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 8000;

	function createPlaceholder(node) {
		if (!Sparky.debug) { return dom.create('text', ''); }

		var attrScope = node.getAttribute('data-scope');
		var attrCtrl = node.getAttribute('data-fn');

		return dom.create('comment',
			(attrScope ? ' data-scope="' + attrScope + '"' : '') +
			(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
	}

	Sparky.fn.each = function setupCollection(node, scopes) {

	};
})(this);
