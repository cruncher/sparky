module('Sparky.filters', function(fixture) {
	test("Sparky.filters.add", function() {
		ok(Sparky.filters.add('5.5', 3.5) === 9);
	});

	test("Sparky.filters.slugify", function() {
		ok(Sparky.filters.slugify('Pardon Me sir') === 'pardon-me-sir');
	});

	test("Sparky.filters.yesno", function() {
		ok(Sparky.filters.yesno(true, '1', '2') === '1');
		ok(Sparky.filters.yesno({}, '1', '2') === '1');
		ok(Sparky.filters.yesno(false, '1', '2') === '2');
		ok(Sparky.filters.yesno(undefined, '1', '2') === '2');
		ok(Sparky.filters.yesno(null, '1', '2') === '2');
	});

	test("Sparky.filters.prepad", function() {
		ok(Sparky.filters.prepad('barf', '9') === '     barf');
		// TODO: This is failing - FIX in filter fn!
		//ok(Sparky.filters.prepad('barf', '2') === 'barf');
	});

	test("Sparky.filters.postpad", function() {
		ok(Sparky.filters.postpad('barf', '9') === 'barf     ');
		ok(Sparky.filters.postpad('barf', '4') === 'barf');
		ok(Sparky.filters.postpad('barf', '2') === 'ba');
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


