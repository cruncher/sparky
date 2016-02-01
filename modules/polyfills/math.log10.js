if (!Math.log10) {
	Math.log10 = function log10(n) {
		return Math.log(n) / Math.LN10;
	};
}
