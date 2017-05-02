
(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var Sparky  = window.Sparky;
	var ga      = window.ga || Fn.noop;
	var rspaces = Fn.rspaces;

	function analyse(category, action, label, value) {
		ga('send', 'event', category, action, label, value);
	}

	Sparky.fn['analyse-on-click'] = function stickToTop(node, scopes) {
		var property = dom.attribute('data-analyse', node);

		if (!property) {
			console.warn('Sparky: data-fn="analyse-on-click" requires data-analyse="category action label"');
			return;
		}

		var data     = property.split(rspaces);

		node.addEventListener('click', function() {
			analyse.apply(null, data);
		});
	};

	Sparky.fn['analyse-on-change'] = function stickToTop(node, scopes) {
		var property = dom.attribute('data-analyse', node);
		var data     = property.split(rspaces);

		if (!property) {
			console.warn('Sparky: data-fn="analyse-on-change" requires data-analyse="category action label"');
			return;
		}

		node.addEventListener('change', function() {
			analyse.apply(null, data);
		});
	};
})(this);
