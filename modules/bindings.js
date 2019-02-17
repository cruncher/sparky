export default {
	// All
	default:  { booleans:   ['hidden'], attributes: ['id', 'title', 'style'] },

	// HTML
	a:        { attributes: ['href'] },
	button:   { booleans:   ['disabled'] },
	form:     { attributes: ['method', 'action'] },
	fieldset: { booleans:   ['disabled'] },
	img:      { attributes: ['alt']	},
	input:    {
		booleans:   ['disabled', 'required'],
		attributes: ['name'],
		types: {
			button:   { attributes: ['value'] },
			checkbox: { attributes: [], booleans: ['checked'], value: 'checkbox' },
			date:     { attributes: ['min', 'max', 'step'], value: 'string' },
			hidden:   { attributes: ['value'] },
			image:    { attributes: ['src'] },
			number:   { attributes: ['min', 'max', 'step'], value: 'number' },
			radio:    { attributes: [], booleans: ['checked'], value: 'radio' },
			range:    { attributes: ['min', 'max', 'step'], value: 'number' },
			reset:    { attributes: ['value'] },
			submit:   { attributes: ['value'] },
			time:     { attributes: ['min', 'max', 'step'], value: 'string' },
			default:  { value: 'string' }
		}
	},
	label:    { attributes: ['for'] },
	meta:     { attributes: ['content'] },
	meter:    { attributes: ['min', 'max', 'low', 'high', 'value'] },
	option:   { attributes: ['value'], booleans: ['disabled'] },
	output:   { attributes: ['for'] },
	progress: { attributes: ['max', 'value'] },
	select:   {
		attributes: ['name'],
		booleans: ['disabled', 'required'],
		types: {
			default: { value: 'string' }
		}
	},
	textarea: { attributes: ['name'], booleans: ['disabled', 'required'], value: 'string' },
	time:     { attributes: ['datetime'] },

	// SVG
	svg:      { attributes: ['viewbox'] },
	g:        { attributes: ['transform'] },
	path:     { attributes: ['d', 'transform'] },
	line:     { attributes: ['x1', 'x2', 'y1', 'y2', 'transform'] },
	rect:     { attributes: ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'] },
	text:     { attributes: ['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'] },
	use:      { attributes: ['href', 'transform'] }
};
