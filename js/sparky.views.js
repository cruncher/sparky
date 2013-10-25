(function(app, undefined){
	jQuery.extend(app.views, {
		test: function(node, model) {
			console.log(node, model);
			
			var elem = jQuery(node);
			
			elem.html(app.render('test', {text: 'You cock'}))
		}
	});
})(app);