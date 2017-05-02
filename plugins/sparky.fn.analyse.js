
(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var dom     = window.dom;
	var Sparky  = window.Sparky;
	var ga      = window.ga || Fn.noop;
	var rspaces = Fn.rspaces;

	function analyse(category, action, label, value) {
		ga('send', 'event', category, action, label, value);
	}

	Sparky.fn['analyse-on-click'] = function stickToTop(node, scopes) {
		node.addEventListener('click', function(e) {
			var node     = dom.closest('[data-analyse]', e.target);

			if (!node) {
				console.warn('Sparky: data-fn="analyse-on-click" requires data-analyse="category action label"');
				return;
			}

			var property = dom.attribute('data-analyse', node);
			var labels   = property.split(rspaces);

			analyse.apply(null, labels);
		});
	};

	Sparky.fn['analyse-on-change'] = function stickToTop(node, scopes) {
		node.addEventListener('change', function(e) {
			var node     = e.target;
			var property = dom.attribute('data-analyse', node);

			if (!property) {
				console.warn('Sparky: data-fn="analyse-on-change" requires data-analyse="category action label"');
				return;
			}

			var labels   = property.split(rspaces);

			analyse.apply(null, labels);
		});
	};
})(this);
