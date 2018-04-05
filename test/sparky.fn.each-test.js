group('[sparky-fn="each"]', function(test, log, fixture) {

	test('[sparky-fn="each"]', function(equals, done) {
		var ul     = fixture.querySelector('ul');
		var sparky = Sparky(ul);
		var nothing = [];
		var array   = Observable([
			{ property: 1 },
			{ property: 2 }
		]);

//console.log('• TEST PUSH NOTHING')
		sparky.push(nothing);

		requestAnimationFrame(function() {
//console.log('• TEST FRAME 1 -------------------------')
			equals(0, ul.querySelectorAll('li').length);
//console.log('• TEST PUSH ARRAY')
			sparky.push(array);

			requestAnimationFrame(function() {
//console.log('• TEST FRAME 2 -------------------------')
				var lis = ul.querySelectorAll('li');
				equals(2, ul.querySelectorAll('li').length);
				equals('1', lis[0] && lis[0].innerHTML, "First li content from array");
				equals('2', lis[1] && lis[1].innerHTML, "Second li content from array");
//console.log('• TEST ARRAY PUSH OBJECT')
				array.push({ property: 3 });

				requestAnimationFrame(function() {
//console.log('• TEST FRAME 3 --------------------------')
					var lis = ul.querySelectorAll('li');

					equals(3, ul.querySelectorAll('li').length);
					equals('3', lis[2] && lis[2].innerHTML, "Third li content from array");

					var li = lis[0];
					var object = array[0];

					array.length = 0;
					object.property = 0;

					requestAnimationFrame(function() {
//console.log('• TEST FRAME 4 --------------------------')
						var lis = ul.querySelectorAll('li');
						equals(0, ul.querySelectorAll('li').length);
//						equals('1', li && li.innerHTML, "First li content");

						done();
					});
				});
			});
		});
	});

}, function() {/*

<ul>
	<li sparky-fn="each" class="{[class]}">{[property]}</li>
</ul>

*/});


Fn.noop('[sparky-fn="each"]', function(test, log, fixture) {

	test('[sparky-fn="each"] empty array', function(equals, done) {
		var ul = fixture.querySelector('[sparky-fn="nothing"]');

		Sparky.fn['nothing'] = function(node, model) {
			return Fn.of([]);
		};

		Sparky(ul);

		requestAnimationFrame(function() {
			equals(0, ul.querySelectorAll('li').length);
			done();
		});
	}, 1);

}, function() {/*
<ul sparky-fn="nothing">
	<li class="li-{[property]}" sparky-fn="each">{[property]}</li>
</ul>
*/});
