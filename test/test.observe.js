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
});