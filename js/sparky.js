(function(undefined) {
	var assign = Object.assign;

	function noop() {}

	function Sparky(node, scope, fn) {
		if (!(this instanceof Sparky)) {
			return new Sparky(node, fn, scope);
		}
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Unbind Sparky bindings.
		unbind: noop,

		// Create a new Sparky dependent upon the current one.
		create: function() {},

		// Unbind and destroy Sparky bindings and nodes.
		destroy: function destroy() {
			return this
				.unbind()
				.remove()
				.trigger('destroy')
				.off();
		}
	});
})();
