

var changeEvent = new CustomEvent('change', { bubbles: true });


module('Test initial value when model.property undefined...', function(fixture) {
	console.log('Test initial value when model.property undefined...');

	asyncTest("text input", function() {
		var text  = fixture.querySelector('[type="text"]');
		var radio = fixture.querySelector('[type="radio"]');
		var checkbox = fixture.querySelector('[type="checkbox"]');
		var model = {};

		Sparky(text, model);
		Sparky(radio, model);
		Sparky(checkbox, model);

		window.requestAnimationFrame(function() {
			ok(model.property1 === "bartholemew", 'model.property1 should be "bartholemew", actually: ' + (typeof model.property1) + ' ' + model.property1);
			ok(model.property2 === undefined, 'model.property2 should be undefined, actually: ' + (typeof model.property2) + ' ' + model.property2);
			ok(model.property3 === "heironymous", 'model.property3 should be "heironymous", actually: ' + (typeof model.property3) + ' ' + model.property3);

			radio.checked = true;
			radio.dispatchEvent(changeEvent);
			checkbox.checked = false;
			checkbox.dispatchEvent(changeEvent);

			window.requestAnimationFrame(function() {
				ok(model.property2 === "plankton", 'model.property2 should be "plankton", actually: ' + (typeof model.property2) + ' ' + model.property2);
				ok(model.property3 === undefined, 'model.property3 should be undefined, actually: ' + (typeof model.property3) + ' ' + model.property3);

				QUnit.start();
			});
		});
	});
}, function() {/*

<input type="text" name="{{property1}}" value="bartholemew" />
<input type="radio" name="{{property2}}" value="plankton" />
<input type="checkbox" name="{{property3}}" value="heironymous" checked="checked" />

*/});


module('Test 2 way binding...', function(fixture) {
	console.log('Test 2 way binding...');

	asyncTest("text input", function() {
		var text     = fixture.querySelector('[type="text"]');
		var radio    = fixture.querySelector('[type="radio"]');
		var checkbox = fixture.querySelector('[type="checkbox"]');
		var model = { property: 3 };

		Sparky(text, model);
		Sparky(radio, model);
		Sparky(checkbox, model);

		window.requestAnimationFrame(function() {
			ok(text.value === "3", 'Input text value should be "3", actually: "' + text.value + '"');
			ok(radio.checked === true, 'Input radio should be checked, actually: ' + radio.checked);
			ok(checkbox.checked === true, 'Input checkbox should be checked, actually: ' + checkbox.checked);

			text.value = 4;
			text.dispatchEvent(changeEvent);
			ok(model.property === '4', 'model.property should be 4, actually: ' + model.property);
			
			window.requestAnimationFrame(function() {
				ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

				QUnit.start();
			});
		});
	});
}, function() {/*

<input type="text" name="{{property}}" />
<input type="radio" name="{{property}}" value="3" />
<input type="checkbox" name="{{property}}" value="3" />

*/});


module('Test 2 way input binding for value-string...', function(fixture) {
	console.log('Test 2 way binding for value-string...');

	asyncTest("text input", function() {
		var text     = fixture.querySelector('[type="text"]');
		var radio    = fixture.querySelector('[type="radio"]');
		var checkbox = fixture.querySelector('[type="checkbox"]');
		var model = { property: '3' };

		Sparky(text, model);
		Sparky(radio, model);
		Sparky(checkbox, model);

		window.requestAnimationFrame(function() {
			ok(text.value === "3", 'Input text value should be "3", actually: "' + text.value + '"');
			ok(radio.checked === true, 'Input radio should be checked, value: "' + radio.value + '"');
			ok(checkbox.checked === true, 'Input checkbox should be checked, value: "' + checkbox.value + '"');

			text.value = '4';
			text.dispatchEvent(changeEvent);
			ok(model.property === '4', 'model.property should be 4, actually: ' + model.property);

			window.requestAnimationFrame(function() {
				ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

				// Set property with the wrong type
				model.property = 3;

				window.requestAnimationFrame(function() {
					ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
					ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

					QUnit.start();
				});
			});
		});
	});
}, function() {/*

<input type="text" name="{{property}}" data-ctrl="value-string" />
<input type="radio" name="{{property}}" data-ctrl="value-string" value="3" />
<input type="checkbox" name="{{property}}" data-ctrl="value-string" value="3" />

*/});


module('Test 2 way binding for value-number...', function(fixture) {
	console.log('Test 2 way binding for value-number...');

	asyncTest("text input", function() {
		var text     = fixture.querySelector('[type="text"]');
		var radio    = fixture.querySelector('[type="radio"]');
		var checkbox = fixture.querySelector('[type="checkbox"]');
		var model = { property: 3 };

		Sparky(text, model);
		Sparky(radio, model);
		Sparky(checkbox, model);

		window.requestAnimationFrame(function() {
			ok(text.value === "3", 'Input text value should be "3", actually: "' + text.value + '"');
			ok(radio.checked === true, 'Input radio should be checked, actually: ' + radio.checked);
			ok(checkbox.checked === true, 'Input checkbox should be checked, actually: ' + checkbox.checked);

			text.value = 4;
			text.dispatchEvent(changeEvent);
			ok(model.property === 4, 'model.property should be number 4, actually: ' + (typeof model.property) + ' ' + model.property);
			
			window.requestAnimationFrame(function() {
				ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

				// Set property with the wrong type
				model.property = '3';

				window.requestAnimationFrame(function() {
					ok(text.value === "", 'Input text value should be "4", actually: "' + text.value + '"');
					ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
					ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

					QUnit.start();
				});
			});
		});
	});
}, function() {/*

<input type="text" name="{{property}}" data-ctrl="value-number" />
<input type="radio" name="{{property}}" data-ctrl="value-number" value="3" />
<input type="checkbox" name="{{property}}" data-ctrl="value-number" value="3" />

*/});


module('Test 2 way binding for value-boolean true...', function(fixture) {
	console.log('Test 2 way binding for value-boolean true...');

	asyncTest("text input", function() {
		var text     = fixture.querySelector('[type="text"]');
		var radio    = fixture.querySelector('[type="radio"]');
		var checkbox = fixture.querySelector('[type="checkbox"]');
		var model = { property: true };

		Sparky(text, model);
		Sparky(radio, model);
		Sparky(checkbox, model);

		window.requestAnimationFrame(function() {
			ok(text.value === "true", 'Input text value should be "true", actually: "' + text.value + '"');
			ok(radio.checked === true, 'Input radio should be checked, actually: ' + radio.checked);
			ok(checkbox.checked === true, 'Input checkbox should be checked, actually: ' + checkbox.checked);

			text.value = false;
			text.dispatchEvent(changeEvent);
			ok(model.property === false, 'model.property should be boolean false, actually: ' + (typeof model.property) + ' ' + model.property);

			window.requestAnimationFrame(function() {
				ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

				// Set property with the wrong type
				model.property = '3';

				window.requestAnimationFrame(function() {
					ok(text.value === "", 'Input text value should be "4", actually: "' + text.value + '"');
					ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
					ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

					QUnit.start();
				});
			});
		});
	});
}, function() {/*

<input type="text" name="{{property}}" data-ctrl="value-boolean" />
<input type="radio" name="{{property}}" data-ctrl="value-boolean" value="true" />
<input type="checkbox" name="{{property}}" data-ctrl="value-boolean" value="true" />

*/});


module('Test 2 way binding for value-boolean false...', function(fixture) {
	console.log('Test 2 way binding for value-boolean false...');

	asyncTest("text input", function() {
		var text     = fixture.querySelector('[type="text"]');
		var radio    = fixture.querySelector('[type="radio"]');
		var checkbox = fixture.querySelector('[type="checkbox"]');
		var model = { property: false };

		Sparky(text, model);
		Sparky(radio, model);
		Sparky(checkbox, model);

		window.requestAnimationFrame(function() {
			ok(text.value === "false", 'Input text value should be "false", actually: "' + text.value + '"');
			ok(radio.checked === true, 'Input radio should be checked, actually: ' + radio.checked);
			ok(checkbox.checked === true, 'Input checkbox should be checked, actually: ' + checkbox.checked);

			// This gets coerced to string by the browser
			text.value = true;
			text.dispatchEvent(changeEvent);

			// But should be the correct type on the model
			ok(model.property === true, 'model.property should be boolean false, actually: ' + (typeof model.property) + ' ' + model.property);

			window.requestAnimationFrame(function() {
				ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

				// Set property with the number type
				model.property = 1;

				window.requestAnimationFrame(function() {
					ok(text.value === "true", 'Input text value should be "4", actually: "' + text.value + '"');
					ok(radio.checked === false, 'Input radio should not be checked, actually: ' + radio.checked);
					ok(checkbox.checked === false, 'Input checkbox should not be checked, actually: ' + checkbox.checked);

					QUnit.start();
				});
			});
		});
	});
}, function() {/*

<input type="text" name="{{property}}" data-ctrl="value-boolean" />
<input type="radio" name="{{property}}" data-ctrl="value-boolean" value="false" />
<input type="checkbox" name="{{property}}" data-ctrl="value-boolean" value="false" />

*/});
