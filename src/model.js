(function(jQuery, ns, undefined) {
	
	function returnTrue() { return true; }

	function returnFalse() { return false; }

	var prototype = {
		get: function(prop) {
			return prop === undefined ? this._data : this._data[prop] ;
		},
		
		set: function(prop, value) {
			this._data[prop] = value;
			this.trigger(prop);
		},
		
		toJSON: function () {
			return JSON.stringify(this._data);
		},
		
		saved: returnFalse,
		
		post: function() {
			var self = this;
			
			return jQuery.ajax({
				url: this.url,
				data: this._data,
				type: 'POST'
			})
			.done(function() {
				self.saved = returnTrue;
				self.trigger('post', arguments)
			});
		},
		
		create: function() {
			var self = this;
			
			return jQuery.ajax({
				url: this.url,
				data: this._data,
				type: 'CREATE'
			})
			.done(function() {
				self.saved = returnTrue;
				self.trigger('create', arguments)
			});
		}
	}
	
	extend(prototype, mixin.events);
	
	ns.Model = function Model(data) {
		var model = Object.create(prototype);
		
		model._data = data;
		return model;
	}
})(jQuery, this);