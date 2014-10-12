module('Sparky.observe', function(fixture) {
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

	test("observe/unobserve path", function() {
		expect(6);
		
		var object = {a: {b: {c: 0}}};
		var expected = 0;

		function update() {
			console.log('HELLO', expected);
			var value = object.a && object.a.b && object.a.b.c ;
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
});
