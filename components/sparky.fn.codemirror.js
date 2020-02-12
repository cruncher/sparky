(function(window) {
	"use strict";

	var CodeMirror = window.CodeMirror;
	var dom        = window.dom;
	var Sparky     = window.Sparky;
	var assign     = Object.assign;

	// Define an extended mixed-mode that understands vbscript and
	// leaves mustache/handlebars embedded templates in html mode
	//var mixedMode = {
	//  name: "htmlmixed",
	//  scriptTypes: [
	//	  { matches: /\/javascript/i, mode: "javascript" }
	//  ]
	//};

	// Note: was "midi-scope"
	assign(Sparky.fn, {
		codemirror: function(node) {
			//var fns = this.interrupt();

			var codemirror = CodeMirror.fromTextArea(node, {
				scrollbarStyle: "null",
				maxHighlightLength: 1024,
				mode: "htmlmixed",
				theme: "cruncher"
			});

			// Set up editor element
			var code = codemirror.getWrapperElement();
			code.className += ' ' + node.className;

			// Update textarea whenever codemirror changes
			var changing = false;

			codemirror.on("changes", function() {
				if (changing) { return; }
				node.value = codemirror.getValue();
				changing = true;
				dom.trigger("change", node);
				changing = false;
			});

			node.addEventListener('valuechange', function(e) {
				if (changing) { return; }
				changing = true;
				codemirror.setValue(node.value);
				changing = false;
			});
		}
	});
})(window);
