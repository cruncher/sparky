// Dependencies:
// 
// window.breakpoint

(function(window) {
	"use strict";

	var Sparky     = window.Sparky;
	var dom        = window.dom;
	var breakpoint = window.breakpoint;

	Sparky.fn['sticky'] = function stickToTop(node, scopes) {
		var value = node.getAttribute('data-sticky');

		scopes.tap(function() {
			var top = jQuery(node).offset().top;
			var gap = dom.valueToPx(value);
			var fixed;

			breakpoint({
				minScrollTop: top - gap
			}, function enter() {
				fixed = node.cloneNode(true);
				var fixedThs  = dom.query('th', fixed);

				jQuery('th', node).each(function(i, th) {
					fixedThs[i].style.width = dom.style('width', th);
				});

				dom.classes(fixed).add('fixed');
				dom.append(node.parentNode, fixed);

			}, function exit() {
				if (fixed) { dom.remove(fixed); }
			});
		});
	};
})(this);
