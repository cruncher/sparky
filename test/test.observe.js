module('Sparky.observe', function(fixture) {

	console.log('Test observe functions...');

	test("observe/unobserve anon fn", function() {
		expect(1);
		
		var object = {};
		
		observe(object, 'ting', function() {
			ok(object.ting === 1);
		});
		
		object.ting = 1;
		unobserve(object, 'ting');
		object.ting = 2;
	});

	test("observe/unobserve named fn", function() {
		expect(2);
		
		var object = {};
		
		function hello() {
			ok(object.ting === 1);
		}
		
		observe(object, 'ting', hello);
		object.ting = 1;
		unobserve(object, 'ting', hello);
		object.ting = 2;
		observe(object, 'ting', hello);
		object.ting = 1;
	});

	test("observe/unobserve path", function() {
		var object = { a: 0 };
		var expected = 0;

		function update() {
			ok(expected === object.a, 'Expected ' + expected + ', got ' + object.a);
		};

		Sparky.observePath(object, 'a', update);
		object.a = expected = 1;
	});

	test(".observePath() on resolvable path", function() {
		expect(6);
		
		var object = {a: {b: {c: 0}}};
		var expected = 0;

		function update(value) {
			ok(value === expected, 'Expected ' + expected + ', got ' + value);
		};

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
	});

	test(".observePath() on unresolvable path", function() {
		expect(2);

		var object = {};
		var expected = 0;

		function update(value) {
			ok(value === expected, 'expected: ' + expected + ', got: ' + value);
		};

		Sparky.observePath(object, 'a.b.c', update);
		expected = 1;
		object.a = {b: {c: 1}};

		expected = 2;
		object.a.b.c = 2;
	});

	test(".observePathOnce() on resolvable path", function() {
		expect(1);

		var object = {a: {b: {c: 1}}};
		var expected = 1;

		function update(value) {
			ok(value === expected, 'Expected ' + expected + ', got ' + value);
		};

		Sparky.observePathOnce(object, 'a.b.c', update);

		object.a.b.c = 2;
		object.a.b.c = 3;
	});

	test(".observePathOnce() on unresolvable path", function() {
		expect(1);

		var object = {};
		var expected = 0;

		function update(value) {
			ok(value === expected, 'Expected ' + expected + ', got ' + value);
		};

		Sparky.observePathOnce(object, 'a.b.c', update);
		expected = 1;
		object.a = {b: {c: 1}};

		expected = 2;
		object.a.b.c = 2;
		
		//setTimeout(function() {
		//	QUnit.start();
		//}, 0);
	});
});
