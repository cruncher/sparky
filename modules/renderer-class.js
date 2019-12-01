
import { classes } from '../../dom/module.js';
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
    Renderer.call(this);

    this.label  = 'ClassRenderer';

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
    fire: function renderBoolean() {
        Renderer.prototype.fire.apply(this);

        const list  = this.classList;
        const value = this.tokens.join(' ');

        // Avoid rendering the same value twice
        if (this.renderedValue === value) {
            return;
        }

        this.renderCount += this.renderedValue && rtext.test(this.renderedValue) ?
            removeClasses(list, this.renderedValue) :
            0 ;

        this.renderCount += value && rtext.test(value) ?
            addClasses(list, value) :
            0 ;

        this.renderedValue = value;
    }
});
