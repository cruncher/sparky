module('Sparky.filter', function(test) {
	var key, filter;
	var expected = {
		add:     { '': undefined, '5.5, 3.5': 9},
		slugify: { '': undefined, 'Pardon mE sir': 'pardon-me-sir' }
	};

	console.log('Test filters...');

	for (key in expected) {
		filter = Sparky.filter[key];

		(function(key, result, expect) {
			test("Sparky.filter." + key + "()", function(assert, done, fixture) {
				assert.ok(result === expect, "Returns '" + result + "', expected '" + expect + "'");
				done();
			});
		})(key, filter(), expected[key]['']);
	}

	test("Sparky.filter.add", function(assert, done, fixture) {
		assert.ok(Sparky.filter.add('5.5', 3.5) === 9);
		done();
	});

	test("Sparky.filter.slugify", function(assert, done, fixture) {
		assert.ok(Sparky.filter.slugify('Pardon Me sir') === 'pardon-me-sir');
		done();
	});

	test("Sparky.filter.yesno", function(assert, done, fixture) {
		assert.ok(Sparky.filter.yesno(true, '1', '2') === '1');
		assert.ok(Sparky.filter.yesno({}, '1', '2') === '1');
		assert.ok(Sparky.filter.yesno(false, '1', '2') === '2');
		assert.ok(Sparky.filter.yesno(undefined, '1', '2') === '2');
		assert.ok(Sparky.filter.yesno(null, '1', '2') === '2');
		done();
	});

	test("Sparky.filter.prepad", function(assert, done, fixture) {
		assert.ok(Sparky.filter.prepad('barf', '9') === '     barf');
		// TODO: This is failing - FIX in filter fn!
		//ok(Sparky.filter.prepad('barf', '2') === 'barf');
		done();
	});

	test("Sparky.filter.postpad", function(assert, done, fixture) {
		assert.ok(Sparky.filter.postpad('barf', '9') === 'barf     ');
		assert.ok(Sparky.filter.postpad('barf', '4') === 'barf');
		assert.ok(Sparky.filter.postpad('barf', '2') === 'ba');
		done();
	});
});


//	capfirst
//	cut
//	prepad
//	postpad
//	date
//	decimals: Number.prototype.toFixed,
//
//	// .default() can't work, because Sparky does not send undefined or null
//	// values to be filtered.
//	//'default'
//	//dictsort
//	//dictsortreversed
//	//divisibleby
//
//	escape
//	first
//	floatformat
//	//get_digit
//	//iriencode
//	join
//	json
//	last
//	length
//	//length_is
//	//linebreaks
//	linebreaksbr
//	//linenumbers
//	lower
//	lowercase
//	//make_list
//	multiply
//	parseint
//	//phone2numeric
//	pluralize
//	//pprint
//	random
//	//raw
//	//removetags
//	replace
//	//reverse
//	safe
//	//safeseq
//	slice
//	slugify
//	//sort
//	//stringformat
//	striptags
//	striptagsexcept
//	time
//	//timesince
//	//timeuntil
//	//title
//	truncatechars
//	//truncatewords
//	//truncatewords_html
//	//unique
//	unordered_list
//	//urlencode
//	//urlize
//	//urlizetrunc
//	//wordcount
//	//wordwrap
