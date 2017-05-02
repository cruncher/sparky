
(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var Sparky  = window.Sparky;
	var ga      = window.ga || Fn.noop;
	var rspaces = Fn.rspaces;

	function analyse(category, action, label, value, fields) {
		ga('send', 'event', category, action, label, value, fields);
	}

	Sparky.fn['analyse-on-click'] = function stickToTop(node, scopes) {
		var property = dom.attribute('data-analyse', node);
		var data     = property.split(rspaces);

		node.addEventListener('click', function() {
			analyse.apply(null, data);
		});
	};
})(this);
