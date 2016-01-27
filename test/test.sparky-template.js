
module('Test template...', function(fixture) {
	console.log('Test template replacement.');

	asyncTest("Checkboxes should default to boolean when value not given.", function() {
		var node = fixture.querySelector('#thomas');
		var scope = {
			alex: 'Alex',
			mary: 'Mary'
		};

		Sparky(node, scope);

		window.requestAnimationFrame(function() {
			var p = node.querySelectorAll('p');
			var a = node.querySelectorAll('a');

			ok(p.length === 0, 'Sparky should have taken the <p> out of #thomas. ' + node.innerHTML);
			ok(a.length === 1, 'Sparky should have put an <a> in #thomas. ' + node.innerHTML);

			window.requestAnimationFrame(function() {
				QUnit.start();
			});
		});
	});
}, function() {/*

<template id="bartholemew">
	<a class="{{ alex }}" href="#">{{ mary }}</a>
</template>

<div data-template="bartholemew" id="thomas">
	<p id="cindy">This text should disappear.</p>
</div>

*/});
