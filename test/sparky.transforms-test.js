group('Sparky.transformers', function(test, log) {
	var key, filter;
	var expected = {
		add:     { '': undefined, '5.5, 3.5': 9},
		slugify: { '': undefined, 'Pardon mE sir': 'pardon-me-sir' }
	};

	console.log('Test filters...');

	for (key in expected) {
		filter = Sparky.transforms[key];

		(function(key, result, expect) {
			test("Sparky.transformers." + key + "()", function(equals, done) {
				equals(result === expect, "Returns '" + result + "', expected '" + expect + "'");
				done();
			});
		})(key, filter(), expected[key]['']);
	}

	test("Sparky.transformers.add", function(equals, done) {
		equals(9, Sparky.transforms.add('5.5', 3.5));
		done();
	});

	test("Sparky.transformers.slugify", function(equals, done) {
		equals('pardon-me-sir', Sparky.transforms.slugify('Pardon Me sir'));
		done();
	});

	test("Sparky.transformers.yesno", function(equals, done) {
		equals('1', Sparky.transforms.yesno(true, '1', '2'));
		equals('1', Sparky.transforms.yesno({}, '1', '2'));
		equals('2', Sparky.transforms.yesno(false, '1', '2'));
		equals('2', Sparky.transforms.yesno(undefined, '1', '2'));
		equals('2', Sparky.transforms.yesno(null, '1', '2'));
		done();
	});

	test("Sparky.transformers.prepad", function(equals, done) {
		equals(Sparky.transforms.prepad('barf', '9') === '     barf');
		// TODO: This is failing - FIX in filter fn!
		//ok(Sparky.transformers.prepad('barf', '2') === 'barf');
		done();
	});

	test("Sparky.transformers.postpad", function(equals, done) {
		equals('barf     ', Sparky.transforms.postpad('barf', '9'));
		equals('barf', Sparky.transforms.postpad('barf', '4'));
		equals('ba', Sparky.transforms.postpad('barf', '2'));
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
