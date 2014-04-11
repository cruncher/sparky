<h1>Sparky</h1>

<strong>Sparky is a live data binding view-controller layer for your html5 app.</strong>

<p>Sparky enhances the existing DOM with declarative data bindings,
passes data properties through Django-style template filters
and renders multiple changes in batches on browser animation frames.</p>

### Binding the DOM to a model

First let's give sparky some data:

    Sparky.data.text = {
        title: "Sparky",
        lang: "en",
        date: "2014-04-15",
        meta: {
            author: "stephband",
            word_count: 140,
            contributors: [{
                name: "Stephen",
                username: "stephband",
                url: "http://cruncher.ch"
            }, {
                name: "Marco",
                username: "mbi",
                url: "http://cruncher.ch"
            }]
        }
    };

Bind the text of a title to Sparky.data.text.title:

    <h1 data-model="text">{{title}}</h1>

Bind a class to the lang property:

    <h1 class="language-{{lang}}" data-model="text">{{title}}</h1>

Display the date, formatted:

    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>

Sparky has a number of filters for modifying and formatting data.
You can also create your own.

Bind Sparky.data.text.username to a text input:

    <input type="text" name="username" data-model="text" />

Inputs, selects and textareas get 2-way data binding.
Text written into the input is stored at Sparky.data.text.username.
Changes to Sparky.data.text.username also change the input's value.

Define a model with a relative path:

    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <p data-model=".meta">author: {{author}}, words: {{word_count}}</p>
    </h1>

The '.' makes Sparky look for the 'meta' object in the parent object, Sparky.data.text.

The data-model attribute also takes absolute paths:

    <p data-model="text.meta">author: {{author}}, words: {{word_count}}</p>

The paths are standard JavaScript path notation.
You can use dots .prop for string properties and brackets [0] for numbered keys.

Sparky has no syntax for looping over a collection.
Instead, if data-model is an array or array-like collection object, Sparky
automatically loops over it, cloning the corresponding DOM node for all the
items in the collection.
So the HTML:

    <ul>
        <li data-model="text.meta.contributors">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

Results in a DOM that looks like this:

    <ul>
        <!-- [Sparky] collection start -->
        <li data-model="text.meta.contributors[0]">
            <a href="http://cruncher.ch">Stephen</a>
        </li>
        <li data-model="text.meta.contributors[1]">
            <a href="http://cruncher.ch">Marco</a>
        </li>
        <!-- [Sparky] collection end -->
    </ul>

The comment nodes are added automatically and are required by Sparky to maintain the collection.


### Use a controller to create scope

All the above examples use the model directly as the context for rendering the DOM.
Sparky uses the model by default, but you can create a scope object to use instead.

    Sparky.controllers['my-controller'] = function(node, model) {
        var scope = {
            problem: 'I seem to be having enormous difficulty with my lifestyle'
        };
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

Where a controller returns undefined, the model is used as scope.
But where a controller returns an object, that object is used as scope for rendering the DOM.

Tell Sparky to use the controller:

    <p data-ctrl="my-controller">{{ problem }}</p>

The controller is passed the DOM node, and the model where a data-model is defined.
Listen to changes on the model to update the scope:

    Sparky.controllers['my-controller'] = function(node, model) {
        var scope = {};
        
        function updateLang(model) {
            scope.lang = model.lang === 'en' ? 'English' :
                model.lang === 'fr' ? 'French' :
                model.lang === 'dp' ? 'Dolphin' :
                model.lang ;
        }
        
        Sparky.observe(model, 'lang', updateLang);
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

And take the data-model 'text' and pass it to my-controller:

    <p data-model="text" data-ctrl="my-controller">I speak {{ lang }}</p>

Try updating the model in the console:

    Sparky.data.text.lang = 'dp';

And you will see the text of the paragraph change:

    I speak Dolphin

In Sparky scope objects are just objects you create.
You control them, so you can make them inherit from other scopes and organise them however you like.


### Use a controller to listen to DOM events


### Define a template for a DOM node


### Template filters

##### add
##### capfirst
##### cut
##### date
##### decimals
##### default
##### escape
##### first
##### floatformat
##### join
##### json
##### last
##### length
##### linebreaksbr
##### lower
##### multiply
##### parseint
##### pluralize
##### random	
##### replace
##### safe
##### slice
##### slugify
##### striptags
##### striptagsexcept
##### time
##### truncatechars
##### unordered_list
##### yesno

#### not implemented

##### //dictsort
##### //dictsortreversed
##### //divisibleby
##### //filesizeformat
##### //get_digit
##### //iriencode
##### //length_is
##### //linebreaks
##### //linenumbers
##### //make_list 
##### //phone2numeric
##### //pprint
##### //raw
##### //removetags
##### //reverse
##### //safeseq
##### //sort
##### //stringformat
##### //timesince
##### //timeuntil
##### //title
##### //truncatewords
##### //truncatewords_html
##### //unique
##### //urlencode
##### //urlize
##### //urlizetrunc
##### //wordcount
##### //wordwrap