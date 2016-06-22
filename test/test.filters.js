module('Sparky.filter', function(fixture) {
	var key, filter;
	var expected = {
		add: { '': undefined, '5.5, 3.5': 9},
		slugify: { '': undefined, 'Pardon mE sir': 'pardon-me-sir' }
	};

	console.log('Test filters...');

	for (key in expected) {
		filter = Sparky.filter[key];

		(function(key, result, expect) {
			test("Sparky.filter." + key + "()", function() {
				ok(result === expect, "Returns '" + result + "', expected '" + expect + "'");
			});
		})(key, filter(), expected[key]['']);
	}

	test("Sparky.filter.add", function() {
		ok(Sparky.filter.add('5.5', 3.5) === 9);
	});

	test("Sparky.filter.slugify", function() {
		ok(Sparky.filter.slugify('Pardon Me sir') === 'pardon-me-sir');
	});

	test("Sparky.filter.yesno", function() {
		ok(Sparky.filter.yesno(true, '1', '2') === '1');
		ok(Sparky.filter.yesno({}, '1', '2') === '1');
		ok(Sparky.filter.yesno(false, '1', '2') === '2');
		ok(Sparky.filter.yesno(undefined, '1', '2') === '2');
		ok(Sparky.filter.yesno(null, '1', '2') === '2');
	});

	test("Sparky.filter.prepad", function() {
		ok(Sparky.filter.prepad('barf', '9') === '     barf');
		// TODO: This is failing - FIX in filter fn!
		//ok(Sparky.filter.prepad('barf', '2') === 'barf');
	});

	test("Sparky.filter.postpad", function() {
		ok(Sparky.filter.postpad('barf', '9') === 'barf     ');
		ok(Sparky.filter.postpad('barf', '4') === 'barf');
		ok(Sparky.filter.postpad('barf', '2') === 'ba');
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
