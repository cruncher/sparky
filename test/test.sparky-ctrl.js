module('Multiple controllers', function(fixture) {
	console.log('Test ctrls...');

	asyncTest('Sparky should handle multiple controllers', function() {
		Sparky.data.model = {};

		var sparky;
		var scope = { property: 'value-1' };

		Sparky.ctrl['ctrl-1'] = function(node, model) {
			sparky = this;
			ok(model === Sparky.data.model, 'ctrl-1 should be passed model object.');
		};

		Sparky.ctrl['ctrl-2'] = function(node, model) {
			ok(this === sparky);
			ok(model === Sparky.data.model, 'ctrl-2 should be passed model object.');
			return scope;
		};

		Sparky.ctrl['ctrl-3'] = function(node, model) {
			ok(this === sparky);
			ok(model === scope, 'ctrl-3 should be passed the scope object.');
			return;
		};

		var p = fixture.querySelector('p');

		Sparky(fixture);

		window.requestAnimationFrame(function() {
			ok(p.innerHTML === 'value-1');
		});

		// Restart QUnit
		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});
}, function() {/*

<div data-scope="model">
	<p data-ctrl="ctrl-1 ctrl-2 ctrl-3">{{property}}</p>
</div>

*/});