module('Multiple controllers', function(fixture) {
	asyncTest('Sparky should handle multiple controllers', function() {
		Sparky.data.model = {};

		var sparky;

		Sparky.ctrl['ctrl-1'] = function(node, model) {
			sparky = this;
			ok(model === Sparky.data.model);
			return { property: 'value-1' };
		};

		Sparky.ctrl['ctrl-2'] = function(node, model) {
			ok(this === sparky);
			ok(model === Sparky.data.model);
			return { property: 'value-2' };
		};

		Sparky.ctrl['ctrl-3'] = function(node, model) {
			ok(this === sparky);
			ok(model === Sparky.data.model);
			return;
		};

		var p = fixture.querySelector('p');

		Sparky(fixture);

		//window.requestAnimationFrame(function() {
		//	ok(p.innerHTML === 'value-1');
		//});

		// Restart QUnit
		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});
}, function() {/*

<div data-model="model">
	<p data-ctrl="ctrl-1 ctrl-2 ctrl-3">{{property}}</p>
</div>

*/});