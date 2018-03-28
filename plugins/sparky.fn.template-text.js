(function(window) {

	// Import
	var Fn     = window.Fn;
	var Sparky = window.Sparky;

	// Utilities
	var isDefined = Fn.isDefined;

	function escapeHTML(html) {
		return html
		.replace(/^\s*/, '')
		.replace(/\s*$/, '');
		//.replace(/\</g, '&lt;')
		//.replace(/\>/g, '&gt;');
	}

	Sparky.fn['template-text'] = function(node, scopes) {
		var sparky = this;
		var id = node.getAttribute('data-template');
		var text, template;

		// No point in continueing when we're replacing the content of this
		// node with code.
		var fns = this.interrupt();

		// But we do want to make sure the rest of the fns get their turn.
		fns.forEach(function(fn) {
			fn.call(sparky, node)
		});

		if (!isDefined(id)) {
			console.warn('Sparky: data-fn="template-text" requires a data-template="id".')
			text = '';
		}
		else {
			template = document.getElementById(id);

			if (node) {
				text = escapeHTML(template.innerHTML);
			}
			else {
				console.warn('Sparky: data-template="'+ id +'" not found in the DOM.');
				text = '';
			}
		}

		node.textContent = text;
	};

})(window);
