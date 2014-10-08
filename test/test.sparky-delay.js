module('Child sparky', function(fixture) {

	asyncTest("Delayed models", function(assert) {
		// Reset Sparky
		Sparky.data = {};
		Sparky.ctrl = {};

		Sparky.data['dummy']   = {};

		var a = fixture.querySelector('a');

		Sparky(fixture);

		setTimeout(function() {
			Sparky.data.model = {};
			
			setTimeout(function() {
				Sparky.data.model.object = {
					thing: {
						property: 'Hello!'
					}
				};

				// TODO: DOM is updated immediately. Not sure that this is
				// correct behaviour.
				// assert.ok(a.innerHTML !== 'Hello!', "DOM not updated immediately object becomes available");

				window.requestAnimationFrame(function() {
					assert.ok(a.innerHTML === 'Hello!', "DOM updated on animation frame after object available: " + a.innerHTML);
				});

				Sparky.data.model.object.thing.blah = 7;

				assert.ok(a.hash !== '#7', "DOM href is not updated immediately property becomes available");

				window.requestAnimationFrame(function() {
					assert.ok(a.hash === '#7', "DOM href not updated on animation frame after property available: " + a.hash);
				});

				// Restart QUnit
				window.requestAnimationFrame(function() {
					QUnit.start();
				});
			}, 200);
		}, 200);
	});

}, function() {/*

<div data-model="dummy">
	<a data-model="model.object.thing" href="#{{blah}}">{{property}}</a>
</div>

*/});