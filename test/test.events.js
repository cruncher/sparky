module('mixin.events', function(fixture) {
	
	
	test("events", function() {
		var object = Object.create(mixin.events);
		var n;
		
		object
		.on('name', function() { n = 1; })
		.trigger('name');
		
		ok(n === 1, 'Listeners are called.');

		object
		.on('name', function() { n = 2; })
		.trigger('name');
		
		ok(n === 2, 'Listeners are called in bound order');

		function assign() { n = 3; }

		object
		.on('name', assign)
		.off('name', assign)
		.trigger('name');

		ok(n === 2, 'Listeners are unbound');

		object
		.on('name', assign)
		.off(assign)
		.trigger('name');

		ok(n === 2, 'Listeners are unbound by .off(fn)');

		object
		.on('name', assign)
		.off('name other')
		.trigger('name');

		ok(n === 2, 'Listeners are unbound by .off(typesString)');

		object
		.on(assign);
		
		console.log(object.events['*'], object.events);
		
		object
		.trigger('name');

		ok(n === 3, 'Listeners are bound by .on(fn)');

		function decrement() {
			--n;
		}

		object
		.off('name', assign)
		.on('name', decrement)
		.trigger('name');

		ok(n === 2, 'Listeners unbound by .on(types, fn)');

		object
		.trigger('other');

		ok(n === 3, '* listeners still bound');

		object
		.trigger('name')
		.off(decrement)
		.off(assign)
		.trigger('name')
		.trigger('other');
		
		ok(n === 2, '* listeners unbound by .off(fn)');
	});

	test("events callback arguments", function() {
		var object = Object.create(mixin.events);
		var n;

		function callback($1, $2, $3, $4) {
			ok(this === object, 'Listeners are called with object as \'this\'');
			ok($1 === 1);
			ok($2 === 2);
			ok($3 === 3);
			ok($4 === undefined, 'Listeners are given trailing arguments from .trigger(type, arg1, arg2,...) then .on(type, fn, arg3, arg4,...)');
		}

		object
		.on('name', callback, 2, 3)
		.trigger('name', 1);
	});
});