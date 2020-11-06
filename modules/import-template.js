import { cache } from '../../fn/module.js';
import { parseHTML, select, request } from '../../dom/module.js';

const DEBUG = true;

const requestDocument = cache(function requestDocument(path) {
    return request('GET', path)
    .then(parseHTML);
});

let scriptCount = 0;

function importDependencies(path, doc) {
    const dir = path.replace(/[^\/]+$/, '');

    // Import templates and styles

    // Is there a way to do this without importing them into the current document?
    // Is that even wise?
    // Is that just unecessary complexity?
    doc.querySelectorAll('style, template').forEach(function(node) {
        if (!node.title) { node.title = dir; }
        document.head.appendChild(document.adoptNode(node));
    });

    // Import CSS links
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(node) {
        if (!node.title) { node.title = dir; }
        const href = node.getAttribute('href');

        // Detect local href. Todo: very crude. Improve.
        if (/^[^\/]/.test(href)) {
            // Get rid of leading './'
            const localHref = href.replace(/^\.\//, '');
            node.setAttribute('href', dir + localHref);
        }

        document.head.appendChild(document.adoptNode(node));
    });

    // Wait for scripts to execute
    const promise = Promise.all(
        select('script', doc).map(toScriptPromise)
    )
    .then(() => doc);

    return DEBUG ? promise.then((object) => {
        console.log('%cSparky %cinclude', 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;', path);
        return object;
    }) :
    promise ;
}

function toScriptPromise(node) {
    return new Promise(function(resolve, reject) {
        window['sparkyScriptImport' + (++scriptCount)] = resolve;

        // This method doesnt seem to run the script
        // document.head.appendChild(document.adoptNode(node));
        // Try this instead...
        const script = document.createElement('script');
        script.type = 'module';
        script.title = node.title || node.baseURL;

        // Detect script has parsed and executed
        script.textContent = node.textContent + ';window.sparkyScriptImport' + scriptCount + '();';
        document.head.appendChild(script);
    });
}

function rewritePaths(doc, url) {
    const path = url.replace(/\/[^\s\/]*$/, '');

    doc.body.querySelectorAll('[src]').forEach((elem) => {
        const url = elem.getAttribute('src').replace(/^\.\//, '');

        // If path is absolute
        if (/^https?:/.test(url)) {
            return;
        }

        // If path begins with a letter it is relative to doc
        if (/^\w/.test(url)) {
            elem.src = path + url;
            return;
        }

        // If path begins with multiple `../`
        // Todo: this only currently handles cases where url is INSIDE path, ie:
        //
        // url    ../images/bollocks.jpg
        // path   path/to/template.html
        // result path/images/bollocks.jpg
        // 
        // This won't work yet:
        //
        // url    ../../../images/bollocks.jpg
        // path   path/to/template.html
        // result ../images/bollocks.jpg
        const prefix = /^((?:\.\.\/)+)([^\.\s\/]+)/.exec(url);
        if (prefix[1]) {
            const count = prefix[1].length / 3;
            const split = path.split('/');
            split.length -= count;
            elem.src = (split.length ? split.join('/') + '/' : '') + url.slice(prefix[1].length);
            return;
        }
    });

    doc.body.querySelectorAll('[href]').forEach((elem) => {
        const url = elem.getAttribute('href').replace(/^\.\//, '');

        // If path is absolute
        if (/^https?:/.test(url)) {
            return;
        }

        // If path begins with a letter it is relative to doc
        if (/^\w/.test(url)) {
            elem.href = path + url;
        }
    });

    return doc;
}

function sanitise(doc) {
    doc.querySelectorAll('script').forEach((elem) => elem.remove());

    // Todo: This is purely to support imports of already rendered <slide-show> 
    // elements, which are going to be rendered again when placed in the 
    // new DOM. It doesn't really belong here. SHould be pluggable somehow.
    doc.querySelectorAll('slide-show > [data-id]').forEach((elem) => elem.remove());

    return doc;
}

export default cache(function importTemplate(src) {
    const parts = src.split('#');
    const path  = parts[0] || '';
    const id    = parts[1] || '';

    return path ?
        id ?
            requestDocument(path)
            .then((doc) => importDependencies(path, doc))
            .then((doc) => document.getElementById(id))
            .then((template) => {
                if (!template) { throw new Error('Sparky template "' + src + '" not found'); }
                return template;
            }) :

        requestDocument(path)
        .then(sanitise)
        .then((doc) => rewritePaths(doc, path))
        .then((doc) => document.adoptNode(doc.body)) :

    id ?
        // If path is blank we are looking in the current document, so there
        // must be a template id (we can't import the document into itself!)
        Promise
        .resolve(document.getElementById(id))
        .then((template) => {
            if (!template) { throw new Error('Sparky template "' + src + '" not found'); }
            return template;
        }) :

    // If no path and no id
    Promise.reject(new Error('Sparky template "' + src + '" not found. URL must have a path or a hash ref')) ;
});
