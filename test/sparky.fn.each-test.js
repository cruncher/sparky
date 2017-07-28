group('[data-fn="each"]', function(test, log, fixture) {

	test('[data-fn="each"]', function(equals, done) {
		var ul     = fixture.querySelector('ul:not([data-fn])');
		var sparky = Sparky(ul);
		var nothing = [];
		var array   = [
			{ property: 1 },
			{ property: 2 }
		];

		sparky.push(nothing);

		requestAnimationFrame(function() {
			equals(0, ul.querySelectorAll('li').length);

			sparky.push(array);

			requestAnimationFrame(function() {
				var lis = ul.querySelectorAll('li');
				equals(2, ul.querySelectorAll('li').length);
				equals('1', lis[0] && lis[0].innerHTML, "First li content from array");
				equals('2', lis[1] && lis[1].innerHTML, "Second li content from array");
				
				Observable(array).push({ property: 3 });

				requestAnimationFrame(function() {
					var lis = ul.querySelectorAll('li');
					equals(3, ul.querySelectorAll('li').length);
					equals('3', lis[2] && lis[2].innerHTML, "Third li content from array");

					var li = lis[0];
					var object = array[0];

					Observable(array).length = 0;
					object.property = 0;

					requestAnimationFrame(function() {
						var lis = ul.querySelectorAll('li');
						equals(0, ul.querySelectorAll('li').length);
						equals('1', li && li.innerHTML, "First li content");
						
						done();
					});
				});
			});
		});
	}, 8);

	test('[data-fn="each"] empty array', function(equals, done) {
		var ul = fixture.querySelector('[data-fn="nothing"]');

		Sparky.fn['nothing'] = function(node, model) {
			return Fn.of([]);
		};

		var sparky = Sparky(ul);

		requestAnimationFrame(function() {
			equals(0, ul.querySelectorAll('li').length);
			done();
		});
	}, 1);

	test('[data-fn="each"] populated array', function(equals, done) {
		var ul = fixture.querySelector('[data-fn="items"]');

		Sparky.fn['items'] = function(node, model) {
			return Fn.of([
				{ property: 1 },
				{ property: 2 }
			]);
		};

		var sparky = Sparky(ul);

		requestAnimationFrame(function() {
			var lis = ul.querySelectorAll('li');
			equals(2, lis.length, 'Two <li>s expected in the DOM');
			equals('1', lis[0] && lis[0].innerHTML, "First li content from array");
			equals('2', lis[1] && lis[1].innerHTML, "Second li content from array");
			done();
		});
	}, 3);
}, function() {/*

<ul>
	<li class="li-{[property]}" data-fn="each">{[property]}</li>
</ul>

<ul data-fn="nothing">
	<li class="li-{[property]}" data-fn="each">{[property]}</li>
</ul>

<ul data-fn="items">
	<li class="li-{[property]}" data-fn="each">{[property]}</li>
</ul>

*/});
