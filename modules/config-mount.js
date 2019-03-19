export default {
    default:  { attributes: ['id', 'title', 'style'], booleans: ['hidden'] },
    a:        { attributes: ['href'] },
    button:   { booleans:   ['disabled'] },
    circle:   { attributes: ['cx', 'cy', 'r', 'transform'] },
    ellipse:  { attributes: ['cx', 'cy', 'rx', 'ry', 'r', 'transform'] },
    form:     { attributes: ['method', 'action'] },
    fieldset: { booleans:   ['disabled'] },
    g:        { attributes: ['transform'] },
    img:      { attributes: ['alt']	},
    input: {
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
    line:     { attributes: ['x1', 'x2', 'y1', 'y2', 'transform'] },
    meta:     { attributes: ['content'] },
    meter:    { attributes: ['min', 'max', 'low', 'high', 'value'] },
    option:   { attributes: ['value'], booleans: ['disabled'] },
    output:   { attributes: ['for'] },
    path:     { attributes: ['d', 'transform'] },
    polygon:  { attributes: ['points', 'transform'] },
    polyline: { attributes: ['points', 'transform'] },
    progress: { attributes: ['max', 'value'] },
    rect:     { attributes: ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'] },
    select:   { attributes: ['name'], booleans: ['disabled', 'required'], types: { default: { value: 'string' }}},
    svg:      { attributes: ['viewbox'] },
    text:     { attributes: ['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'] },
    textarea: { attributes: ['name'], booleans: ['disabled', 'required'], value: 'string' },
    time:     { attributes: ['datetime'] },
    use:      { attributes: ['href', 'transform'] }
};