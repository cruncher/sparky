module('Template', function(fixture) {
	test('Sparky.template() clones templates to documentFragments', function() {
		var result = Sparky.template('test-template');

		ok(result);
		ok(result !== fixture.querySelector('template'));
		ok(result.nodeType === 11);
	});
}, function() {/*
	<template id="test-template">{{property}}</template>
*/});