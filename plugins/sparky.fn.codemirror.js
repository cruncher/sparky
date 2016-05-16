(function(window) {
	"use strict";

	var Sparky = window.Sparky;
	var assign = Object.assign;

	// Note: was "midi-scope"
	assign(Sparky.fn, {
		codemirror: function(node) {
			var codemirror = CodeMirror.fromTextArea(node, {
				scrollbarStyle: "null"
			});

			var code = codemirror.getWrapperElement();
			var classes = Sparky.dom.classes(code);

			classes.add('text-layer');
			classes.add('layer');

console.log(code === node, node, code);
console.log(code);
		}
	});
})(this);
