module('Child sparky', function(test) {
	console.log('Test async models...');

	test("Delayed models", function(assert, done, fixture) {
		assert.expect(2);

		// Reset Sparky
		Sparky.data = {
			'model': {},
			'dummy': {}
		};

		var a = fixture.querySelector('a');

		Sparky(fixture);

		setTimeout(function() {
			Sparky.data.model.object = {
				thing: {
					property: 'Hello!'
				}
			};

			window.requestAnimationFrame(function() {
				assert.ok(a.innerHTML === 'Hello!', "DOM should be updated on frame after object available: " + a.innerHTML);
			});

			Sparky.data.model.object.thing.blah = 7;

			window.requestAnimationFrame(function() {
				assert.ok(a.hash === '#7', "DOM href Should be updated on frame after property available: " + a.hash);
				done();
			});
		}, 400);
	});
}, function() {/*

<div data-scope="dummy">
	<a data-scope="model.object.thing" href="#{{blah}}">{{property}}</a>
</div>

*/});


// This test cant work. See bug:
//
// https://github.com/cruncher/sparky/issues/3

//module('Child sparky', function(test) {
//	console.log('Test async models...');
//
//	asyncTest("Delayed models", function(assert) {
//		// Reset Sparky
//		Sparky.data = {
//			'dummy': {}
//		};
//
//		var a = fixture.querySelector('a');
//
//		Sparky(fixture);
//
//		setTimeout(function() {
//			Sparky.data.model ={
//				object: {
//					thing: {
//						property: 'Hello!'
//					}
//				}
//			};
//
//			// TODO: DOM is updated immediately. Not sure that this is
//			// correct behaviour.
//			// assert.ok(a.innerHTML !== 'Hello!', "DOM not updated immediately object becomes available");
//
//			window.requestAnimationFrame(function() {
//				assert.ok(a.innerHTML === 'Hello!', "DOM updated on animation frame after object available: " + a.innerHTML);
//			});
//
//			Sparky.data.model.object.thing.blah = 7;
//
//			assert.ok(a.hash !== '#7', "DOM href is not updated immediately property becomes available");
//
//			window.requestAnimationFrame(function() {
//				assert.ok(a.hash === '#7', "DOM href not updated on animation frame after property available: " + a.hash);
//				done();
//			});
//		}, 400);
//	});
//}, function() {/*
//
//<div data-scope="dummy">
//	<a data-scope="model.object.thing" href="#{{blah}}">{{property}}</a>
//</div>
//
//*/});
