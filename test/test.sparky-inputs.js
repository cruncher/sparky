

var changeEvent = new CustomEvent('change', { bubbles: true });


module('Test 2 way binding...', function(fixture) {
	console.log('Test checkboxes default to booleans when value not given.');

	asyncTest("Checkboxes should default to boolean when value not given.", function() {
		var node1 = fixture.querySelector('.node-1');
		var node2 = fixture.querySelector('.node-2');
		var model1 = { property: true };
		var model2 = { };

		Sparky(node1, model1);
		Sparky(node2, model2);

		window.requestAnimationFrame(function() {
			ok(node1.checked === true, 'Checkbox 1 should be checked, actually: ' + node1.checked);
			ok(node2.checked === true, 'Checkbox 2 should be checked, actually: ' + node2.checked);
			ok(model2.property === true, 'model2.property should be true, actually: ' + node2.checked);

			node1.checked = false;
			node1.dispatchEvent(changeEvent);
			ok(model1.property === false, 'model.property should be false, actually: ' + model1.property);

			node1.checked = true;
			node1.dispatchEvent(changeEvent);
			ok(model1.property === true, 'model.property should be true, actually: ' + model1.property);

			model1.property = false;
			model2.property = 'eg';

			window.requestAnimationFrame(function() {
				ok(node1.checked === false, 'Checkbox 1 should not be checked, actually: ' + node1.checked);
				ok(node2.checked === false, 'Checkbox 2 should not be checked, actually: ' + node2.checked);

				QUnit.start();
			});
		});
	});
}, function() {/*

<input class="node-1" type="checkbox" name="{{property}}" />
<input class="node-2" type="checkbox" name="{{property}}" checked="checked" />

*/});


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
			ok(text.value === "", 'Input text value should be "", actually: "' + text.value + '"');
			ok(radio.checked === false, '1. Input radio should not be checked, actually: ' + radio.checked);
			ok(checkbox.checked === false, '1. Input checkbox should not be checked, actually: ' + checkbox.checked);

			text.value = 4;
			text.dispatchEvent(changeEvent);
			ok(model.property === '4', 'model.property should be 4, actually: ' + model.property);
			
			window.requestAnimationFrame(function() {
				ok(radio.checked === false, '2. Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, '2. Input checkbox should not be checked, actually: ' + checkbox.checked);

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
			ok(radio.checked === true, '3. Input radio should be checked, value: "' + radio.value + '"');
			ok(checkbox.checked === true, '3. Input checkbox should be checked, value: "' + checkbox.value + '"');

			text.value = '4';
			text.dispatchEvent(changeEvent);
			ok(model.property === '4', 'model.property should be 4, actually: ' + model.property);

			window.requestAnimationFrame(function() {
				ok(radio.checked === false, '4. Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, '4. Input checkbox should not be checked, actually: ' + checkbox.checked);

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
			ok(radio.checked === true, '5. Input radio should be checked, actually: ' + radio.checked);
			ok(checkbox.checked === true, '5. Input checkbox should be checked, actually: ' + checkbox.checked);

			text.value = 4;
			text.dispatchEvent(changeEvent);
			ok(model.property === 4, 'model.property should be number 4, actually: ' + (typeof model.property) + ' ' + model.property);
			
			window.requestAnimationFrame(function() {
				ok(radio.checked === false, '6. Input radio should not be checked, actually: ' + radio.checked);
				ok(checkbox.checked === false, '6. Input checkbox should not be checked, actually: ' + checkbox.checked);

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



module('Test 2 way binding for textarea...', function(fixture) {
	console.log('Test 2 way binding for textarea...');

	asyncTest("text input", function() {
		var text1 = fixture.querySelector('.text1');
		var text2 = fixture.querySelector('.text2');
		var model = { property1: 'hello' };

		Sparky(text1, model);
		Sparky(text2, model);

		window.requestAnimationFrame(function() {
			ok(text1.value === "hello", 'Input text value should be "hello", actually: "' + text1.value + '"');
			ok(text2.value === "cooee", 'Input text value should be "cooee", actually: "' + text2.value + '"');
			ok(model.property2 === "cooee", 'model.property2 should be "cooee", actually: "' + model.property2 + '"');

			// This gets coerced to string by the browser
			text1.value = true;
			text1.dispatchEvent(changeEvent);

			// But should be the correct type on the model
			ok(model.property1 === 'true', 'model.property should be string "true", actually: ' + (typeof model.property1) + ' ' + model.property1);

			model.property2 = 4;

			window.requestAnimationFrame(function() {
				ok(text2.value === "", 'textarea value should be "", actually: "' + text2.value + '"');

				QUnit.start();
			});
		});
	});
}, function() {/*

<textarea class="text1" name="{{property1}}"></textarea>
<textarea class="text2" name="{{property2}}">cooee</textarea>

*/});


module('Test 2 way binding for select...', function(fixture) {
	console.log('Test 2 way binding for select...');

	asyncTest("text input", function() {
		var node1 = fixture.querySelector('.select-1');
		var node2 = fixture.querySelector('.select-2');
		var model = { property: '1' };

		Sparky(node1, model);
		Sparky(node2, model);

		window.requestAnimationFrame(function() {
			ok(node1.value === "1", 'Select value should be "1", actually: "' + node1.value + '"');
			// In FireFox the initial value is 0. We'll tolerate this
			ok(node2.value === "" || node2.value === "0", 'Select value should be "1", actually: "' + node2.value + '"');

			// This gets coerced to string by the browser
			node1.value = 2;
			node1.dispatchEvent(changeEvent);

			// But should be the correct type on the model
			ok(model.property === '2', 'model.property should be string "2", actually: ' + (typeof model.property) + ' ' + model.property);

			// This gets coerced to string by the browser
			node2.value = 2;
			node2.dispatchEvent(changeEvent);

			// But should be the correct type on the model
			ok(model.property === 2, 'model.property should be number 2, actually: ' + (typeof model.property) + ' ' + model.property);

			// Set value of type number
			model.property = 3;

			window.requestAnimationFrame(function() {
				// Firefox keeps value '2' whereas other browsers happily
				// set ''. Test for non-equality.
				ok(node1.value !== "3", 'Select value should not be "3", actually: "' + node1.value + '"');
				ok(node2.value === "3", 'Select value should be "3", actually: "' + node2.value + '"');

				QUnit.start();
			});
		});
	});
}, function() {/*

<select class="select-1" name="{{property}}">
	<option value="0">0</option>
	<option value="1">1</option>
	<option value="2">2</option>
	<option value="3">3</option>
</select>

<select class="select-2" name="{{property}}" data-ctrl="value-number">
	<option value="0">0</option>
	<option value="1">1</option>
	<option value="2">2</option>
	<option value="3">3</option>
</select>

*/});
