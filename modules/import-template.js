import { cache } from '../../fn/fn.js';
import { parse } from '../../dom/dom.js';

const DEBUG = window.DEBUG;

const documentRequest = Promise.resolve(window.document);

const fetchDocument = cache(function fetchDocument(path) {
    return path ?
        fetch(path)
        .then(response => response.text())
        .then(parse('html'))
        .then(function(doc) {
            if (!doc) {
                console.warn('Template not found.');
                return;
            }

            // Is there a way to do this without importing them into the current document?
            // Is that even wise?
            // Is that just unecessary complexity?
            doc.querySelectorAll('style, template').forEach(function(node) {
                if (!node.title) { node.title = path; }
                document.head.appendChild(document.adoptNode(node));
            });

            // Wait for scripts to execute
            const promise = Promise.all(
                Array.from(doc.querySelectorAll('script'))
                .map(toScriptPromise)
            );

            return DEBUG ? promise.then((object) => {
                console.log('%cSparky %cimported', 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;', path);
                return object;
            }) :
            promise ;
        })
        .catch(function(error) {
            console.warn(error);
        }) :
        documentRequest ;
});

let scriptCount = 0;

function toScriptPromise(node) {
    return new Promise(function(resolve, reject) {
        window['scriptImport' + (++scriptCount)] = resolve;

        // This method doesnt seem to run the script
        // document.head.appendChild(document.adoptNode(node));
        // Try this instead...
        const script = document.createElement('script');
        script.type = 'module';
        script.title = node.title || node.baseURL;

        // Detect script has parsed and executed
        script.textContent = node.textContent + ';window.scriptImport' + scriptCount + '();';
        document.head.appendChild(script);
    });
}

export default function importTemplate(src) {
    const parts = src.split('#');
    const path  = parts[0] || '';
    const id    = parts[1] || '';

    if (DEBUG && !id) {
        throw new Error('Sparky: template URL "' + src + '" does not have an #id');
    }

    return fetchDocument(path)
    .then((doc) => {
        // Imported templates are now in the current document
        let elem = document.getElementById(id);

        if (DEBUG && !elem) {
            throw new Error('Sparky: template "' + id + '" not found in "' + path + '"');
        }

        return elem;
    });
}
