module('Sparky.observe', function(test) {

	console.log('Test observe functions...');

	test("observe/unobserve anon fn", function(assert, done, fixture) {
		assert.expect(3);

		var object = {};
		var expected = undefined;

		Sparky.observe(object, 'ting', function() {
			assert.ok(object.ting === expected);
		});

		Sparky.observe(object, 'ting', function() {
			assert.ok(object.ting === expected);
		}, true);

		object.ting = expected = 1;
		unobserve(object, 'ting');
		object.ting = expected = 2;
		
		done();
	});

	test("observe/unobserve named fn", function(assert, done, fixture) {
		assert.expect(2);

		var object = {};

		function hello() {
			assert.ok(object.ting === 1);
		}

		observe(object, 'ting', hello);
		object.ting = 1;
		unobserve(object, 'ting', hello);
		object.ting = 2;
		observe(object, 'ting', hello);
		object.ting = 1;
		
		done();
	});

	test("observe/unobserve path", function(assert, done, fixture) {
		assert.expect(3);

		var object = { a: 0 };
		var expected = 0;

		function update() {
			assert.ok(expected === object.a, 'Expected ' + expected + ', got ' + object.a);
		};

		Sparky.observePath(object, 'a', update);
		Sparky.observePath(object, 'a', update, true);
		object.a = expected = 1;
		
		done();
	});

	test(".observePath() on resolvable path", function(assert, done, fixture) {
		assert.expect(6);

		var object = {a: {b: {c: 0}}};
		var expected;

		object.a.b.c = expected = 0;

		function update(value) {
			assert.ok(value === expected, 'Expected ' + expected + ', got ' + value);
		}

		Sparky.observePath(object, 'a.b.c', update);
		object.a.b.c = expected = 1;
		object.a.b.c = expected = 2;

		var b2 = {c: 3};

		expected = 3;
		object.a.b = b2;

		var a2 = {b: {c: 4}};

		expected = 4;
		object.a = a2;

		var a3 = {};

		expected = undefined;
		object.a = a3;

		var b3 = {c: 5};

		expected = 5;
		object.a.b = b3;
		
		done();
	});

	test(".observePath() on unresolvable path", function(assert, done, fixture) {
		assert.expect(3);

		var object = {};
		var expected = undefined;

		function update(value) {
			assert.ok(value === expected, 'expected: ' + expected + ', got: ' + value);
		};

		Sparky.observePath(object, 'a.b.c', update, true);

		expected = 1;
		object.a = {b: {c: 1}};

		expected = 2;
		object.a.b.c = 2;

		// This should not cause update to be called immediately, without the
		// true flag, you see.
		Sparky.observePath(object, 'a.b.c', update);
		
		done();
	});

	test(".observePathOnce() on resolvable path", function(assert, done, fixture) {
		assert.expect(1);

		var object = {a: {b: {c: 1}}};
		var expected = 1;

		function update(value) {
			assert.ok(value === expected, 'Expected ' + expected + ', got ' + value);
		};

		Sparky.observePathOnce(object, 'a.b.c', update);

		object.a.b.c = 2;
		object.a.b.c = 3;
		
		done();
	});

	test(".observePathOnce() on unresolvable path", function(assert, done, fixture) {
		assert.expect(1);

		var object = {};
		var expected = 0;

		function update(value) {
			assert.ok(value === expected, 'Expected ' + expected + ', got ' + value);
		};

		Sparky.observePathOnce(object, 'a.b.c', update);
		expected = 1;
		object.a = {b: {c: 1}};

		expected = 2;
		object.a.b.c = 2;

		//setTimeout(function() {
		//	done();
		//}, 0);
		
		done();
	});

	test("observe() on inheritance chain", function(assert, done, fixture) {
		assert.expect(5);

		var a = 1;
		var s = {};
		Object.defineProperties(s, { d: { get: function(){return a;}, set: function(n){ a = n; }, configurable: true } });
		s.name = "super";

		var b = 2;
		var p = Object.create(s);
		Object.defineProperties(p, { d: { get: function(){return b;}, set: function(n){ b = n; }, configurable: true } });
		p.name = "prototype";

		var o = Object.create(p);
		o.name = "object";

		observe(s, 'd', function(object){ assert.ok(object.d === a); });
		observe(p, 'd', function(object){ assert.ok(object.d === b); });
		observe(o, 'd', function(object){ assert.ok(object.d === b); });

		// This should launch 5 calls in total -
		// One on s
		s.d = 10;
		// One on each of p and o
		p.d = 11;
		// One on each of p and o
		o.d = 12;
		
		done();
	});


// This will fail because we're not clever enough for that yet.
//
//	test("observe() on inheritance chain that changes", function() {
//		assert.expect(1);
//
//		var a = 1;
//		var s = {};
//		Object.defineProperties(s, { d: { get: function(){return a;}, set: function(n){ a = n; }, configurable: true } });
//		s.name = "super";
//
//		var b = 2;
//		var p = Object.create(s);
//		p.name = "prototype";
//
//		var o = Object.create(p);
//		o.name = "object";
//
//		observe(s, 'd', function(object){ ok(object.d === a); });
//		observe(p, 'd', function(object){ ok(object.d === b); });
//
//		Object.defineProperties(p, { d: { get: function(){return b;}, set: function(n){ b = n; }, configurable: true } });
//
//		observe(o, 'd', function(object){ ok(object.d === b); });
//
//		s.d = 10;
//		p.d = 11;
//		o.d = 12;
//	});
});
