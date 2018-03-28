// Dependencies:
// 
// window.breakpoint

(function(window) {
	"use strict";

	var Sparky     = window.Sparky;
	var dom        = window.dom;
	var breakpoint = window.breakpoint;

	Sparky.fn['sticky'] = function stickToTop(node, scopes) {
		var value = dom.attribute('data-sticky', node);

		scopes.tap(function() {
			var top = dom.offset(node)[1];
			var gap = dom.toPx(value);
			var fixed;

			breakpoint({
				minScrollTop: top - gap
			}, function enter() {
				fixed = node.cloneNode(true);
				var fixedThs  = dom.query('th', fixed);

				// Make sure table header cells retain their correct width
				dom.query('th', node).forEach(function(th, i) {
					fixedThs[i].style.width = dom.style('width', th) + 'px';
				});

				dom.classes(fixed).add('fixed');
				dom.after(node, fixed);
			}, function exit() {
				if (fixed) { dom.remove(fixed); }
			});
		});
	};
})(window);
