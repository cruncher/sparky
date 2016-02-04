(function(window) {
	var Sparky = window.Sparky;
	var isDefined = Sparky.isDefined;

	function escapeHTML(html) {
		return html
		.replace(/^\s*/, '')
		.replace(/\s*$/, '');
		//.replace(/\</g, '&lt;')
		//.replace(/\>/g, '&gt;');
	}

	Sparky.fn.code = function(node, scope) {
		var sparky = this;
		var id = node.getAttribute('data-template');
		var text, template, code;

		// No point in continueing when we're replacing the content of this
		// node with code.
		var fns = this.interrupt();

		// But we do want to make sure the rest of the fns get their turn.
		var n = -1;
		fns.forEach(function(fn) {
			fn.call(sparky, node, scope)
		});

		if (!isDefined(id)) {
			text = 'data-fn="code" requires a data-template="id".';
		}
		else {
			template = document.getElementById(id);

			if (node) {
				text = escapeHTML(template.innerHTML);
			}
			else {
				text = 'data-template="'+ id +'" not found in the DOM.';
			}
		}

		node.textContent = text;
	};

})(this);
