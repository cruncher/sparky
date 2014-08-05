module('Sparky collections', function(fixture) {
	test('Initial length', function() {
		var collection = Sparky.Collection([{
		    	property: 1
		    }, {
		    	property: 2
		    }]);

		Sparky.ctrl['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		ok(ul.querySelectorAll('li').length === 2, 'All is well.');
	});

	asyncTest("Two or three", function(assert) {
		var collection = Sparky.Collection([{
		    	property: 1
		    }, {
		    	property: 2
		    }]);
		
		Sparky.ctrl['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		ok(ul.querySelectorAll('li').length === 2, 'All is well.');

		collection.push({
			property: 3
		});

		window.requestAnimationFrame(function() {
			ok(ul.querySelectorAll('li').length === 3, 'All is well.');
		});

		// Restart QUnit
		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});

	asyncTest("Zero to hero", function(assert) {
		var collection = Sparky.Collection();

		Sparky.ctrl['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		ok(ul.querySelectorAll('li').length === 0, 'All is well.');

		collection.push({ property: 1 });
		collection.push({ property: 2 });

		window.requestAnimationFrame(function() {
			ok(ul.querySelectorAll('li').length === 2, 'All is well.');
		});

		// Restart QUnit
		window.requestAnimationFrame(function() {
			QUnit.start();
		});
	});

	asyncTest("Detach collection items", function(assert) {
		expect(5);
		
		var collection = Sparky.Collection([{
		    	property: 1
		    }, {
		    	property: 2
		    }]);
		
		Sparky.ctrl['test-ctrl'] = function(node, model, sparky) {
			return {
				collection: collection
			};
		};

		var ul = fixture.querySelector('[data-ctrl="test-ctrl"]');
		var sparky = Sparky(ul);

		assert.ok(ul.querySelectorAll('li').length === 2, 'All is well.');

		var li = ul.querySelector('.li-2');

		assert.ok(!!li, 'li.li-2 exists.');

		var item1 = collection[0];
		var item2 = collection[1];

		collection.length = 0;

		window.requestAnimationFrame(function() {
			// Sparky for the li should be detached by this
			// point. This should do precisely nothing.
			item2.property = 0;

			assert.ok(ul.querySelectorAll('li').length === 0, 'There is nothing in the list.');
			assert.ok(li.innerHTML === '2', 'li content is still 2');

			window.requestAnimationFrame(function() {
				assert.ok(li.innerHTML === '2', 'li content is still 2');

				QUnit.start();
			});
		});
	});
}, function() {/*

<ul data-ctrl="test-ctrl">
	<li class="li-{{property}}" data-model="{{collection}}">{{property}}</li>
</ul>

*/});