module('Controller', function() {
/*
	<div data-ctrl="test-ctrl">{{property}}</div>
*/
}, function(fixture) {
	test("ctrl passed in as fn parameter and {{tag}} replaced with scope property", function() {
		var node = fixture.querySelector('div');
	
		Sparky(node, undefined, function(node, model, sparky) {
			ok(model === undefined);
			return { property: 'peas' };
		});

		ok(node.innerHTML === 'peas');
	});
	
	test("ctrl found in Sparky.controllers and {{tag}} replaced with scope property", function() {
		var node = fixture.querySelector('div');
		
		Sparky.controllers['test-ctrl'] = function(node, model, sparky) {
			ok(model === undefined);
			return { property: 'peas' };
		};
		Sparky(node);

		ok(node.innerHTML === 'peas');
	});
});


module('Model', function() {
/*
	<div data-model="test-model">{{property}}</div>
*/
}, function(fixture) {
	test("{{tag}} is replaced with model property", function() {
		var node = fixture.querySelector('div');
		
		Sparky.data['test-model'] = { property: 'juice' };
		Sparky(node);

		ok(node.innerHTML === 'juice');
	});
});

module('Template', function() {
/*
	<template id="test-template">{{property}}</template>
*/
}, function(fixture) {
	test('Sparky.template() clones templates to documentFragments', function() {
		var result = Sparky.template('test-template');
		ok(result);
		ok(result !== fixture.querySelector('template'));
		ok(result.nodeType === 11);
	});
});

