
module('Template', function(test) {
	test('Sparky.template() clones templates to documentFragments', function(assert, done, fixture) {
		var result = Sparky.template('test-template');

		assert.ok(result);
		assert.ok(result !== fixture.querySelectorAll('template'));
		assert.ok(result.nodeType === 11);
		
		done();
	});
}, function() {/*
	<template id="test-template">{[property]}</template>
*/});

module('Test template...', function(test) {
	console.log('Test template replacement.');

	test("Content should be replaced with content of template.", function(assert, done, fixture) {
		var node = fixture.querySelector('#thomas');
		var scope = {
			alex: 'Alex',
			mary: 'Mary'
		};

		Sparky(node, scope);

		window.requestAnimationFrame(function() {
			var p = node.querySelectorAll('p');
			var a = node.querySelectorAll('a');

			assert.ok(p.length === 0, 'Sparky should have taken the <p> out of #thomas. ' + node.innerHTML);
			assert.ok(a.length === 1, 'Sparky should have put an <a> in #thomas. ' + node.innerHTML);

			window.requestAnimationFrame(function() {
				done();
			});
		});
	});
}, function() {/*

<template id="bartholemew">
	<a class="{[ alex ]}" href="#">{[ mary ]}</a>
</template>

<div data-template="bartholemew" id="thomas">
	<p id="cindy">This text should disappear.</p>
</div>

*/});

module('Test template...', function(test) {
	console.log('Test template replacement.');

	test("Content should be replaced with content of template.", function(assert, done, fixture) {
		var node = fixture.querySelector('#thomas');
		var scope = {
			alex: 'Alex',
			mary: 'Mary'
		};

		Sparky(node, scope);

		window.requestAnimationFrame(function() {
			var p = node.querySelectorAll('p');
			var a = node.querySelectorAll('a');

			assert.ok(p.length === 1, 'Sparky should have left the <p> in #thomas. ' + node.innerHTML);
			assert.ok(a.length === 1, 'Sparky should have put an <a> in the <p>. ' + node.innerHTML);

			window.requestAnimationFrame(function() {
				done();
			});
		});
	});
}, function() {/*

<template id="bartholemew">
	<a class="{[ alex ]}" href="#">{[ mary ]}</a>
</template>

<div id="thomas">
	<p id="cindy" data-template="bartholemew">This text should disappear.</p>
</div>

*/});
