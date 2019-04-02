
import { classes } from '../../dom/dom.js';
import Renderer from './renderer.js';

const assign = Object.assign;

// Matches anything that contains a non-space character
const rtext = /\S/;

// Matches anything with a space
const rspaces = /\s+/;


function addClasses(classList, text) {
    var classes = text.trim().split(rspaces);
	classList.add.apply(classList, classes);

	// Return DOM mutation count
	return 1;
}

function removeClasses(classList, text) {
    var classes = text.trim().split(rspaces);
	classList.remove.apply(classList, classes);

	// Return DOM mutation count
	return 1;
}

function partitionByType(data, token) {
    data[typeof token].push(token);
    return data;
}

export default function ClassRenderer(tokens, node) {
    this.label  = 'Class renderer';
    this.mutationCount = 0;

    const types = tokens.reduce(partitionByType, {
        string: [],
        object: []
    });

    this.tokens = types.object;
    this.classList = classes(node);

    // Overwrite the class with just the static text
	node.setAttribute('class', types.string.join(' '));
}

assign(ClassRenderer.prototype, Renderer.prototype, {
    render: function renderBoolean() {
        Renderer.prototype.render.apply(this, arguments);

        const list  = this.classList;
        const value = this.tokens.join(' ');

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return count; }

		this.mutationCount += (this.valueRendered && rtext.test(this.valueRendered) ? removeClasses(list, this.valueRendered) : 0);
		this.mutationCount += (value && rtext.test(value) ? addClasses(list, value) : 0);

        this.valueRendered = value;

		// Return DOM mutation count
        return this.mutationCount;
    }
});
