module('mixin.events', function(test) {
	test("events", function(assert, done, fixture) {
		var object = Object.create(mixin.events);
		var n;
		
		object
		.on('name', function() { n = 1; })
		.trigger('name');
		
		assert.ok(n === 1, 'Listeners are called.');

		object
		.on('name', function() { n = 2; })
		.trigger('name');
		
		assert.ok(n === 2, 'Listeners are called in bound order');

		function assign() { n = 3; }

		object
		.on('name', assign)
		.off('name', assign)
		.trigger('name');

		assert.ok(n === 2, 'Listeners are unbound');

		object
		.on('name', assign)
		.off(assign)
		.trigger('name');

		assert.ok(n === 2, 'Listeners are unbound by .off(fn)');

		object
		.on('name', assign)
		.off('name other')
		.trigger('name');

		assert.ok(n === 2, 'Listeners are unbound by .off(typesString)');

		object.off(assign);

		n = 8;

		function decrement() { --n; }

		object
		.off('name', assign)
		.on('name', decrement)
		.trigger('name');

		assert.ok(n === 7, 'Listeners unbound by .on(types, fn)');
	});

	test("events callback arguments", function(assert, done, fixture) {
		var object = Object.create(mixin.events);
		var n;

		function callback($0, $1, $2, $3, $4) {
			assert.ok(this === object, 'Listeners are called with target as \'this\'');
			assert.ok($0 === object, 'Listeners are called with current object as first argument');
			assert.ok($1 === 1);
			assert.ok($2 === 2);
			assert.ok($3 === 3);
			assert.ok($4 === undefined, 'Listeners are given trailing arguments from .trigger(type, arg1, arg2,...) then .on(type, fn, arg3, arg4,...)');
		}

		object
		.on('name', callback, 2, 3)
		.trigger('name', 1);

		object
		.off(callback)
		// Should not trigger anything
		.trigger('name')
		.trigger('other');
		
		object
		.on(callback, 2, 3)
		.trigger('name', 1);
		
		object
		.off(callback)
		// Should not trigger anything
		.trigger('name')
		.trigger('other');
	});

	test("events.propagate()", function(assert, done, fixture) {
		var object1 = Object.create(mixin.events);
		var object2 = Object.create(mixin.events);
		var n;

		function callback($0, $1, $2, $3, $4) {
			assert.ok(this === object2, 'Listeners are called with this object as \'this\'');
			assert.ok($0 === object1, 'Listeners are called with target as first argument');
			assert.ok($1 === 1);
			assert.ok($2 === 2);
			assert.ok($3 === 3);
			assert.ok($4 === undefined, 'Listeners are given trailing arguments from .trigger(type, arg1, arg2,...) then .on(type, fn, arg3, arg4,...)');
		}

		object2.on('name', callback, 2, 3);

		object1
		.on(object2)
		.trigger('name', 1);
	});
});