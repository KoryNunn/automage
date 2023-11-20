(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.automage = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = {
    enabled: element => !element.closest('[disabled]'),
    disabled: element => element.closest('[disabled]'),
    first: (element, otherMatchedElements) => otherMatchedElements[0] === element,
    last: (element, otherMatchedElements) => otherMatchedElements[otherMatchedElements.length - 1] === element,
    '(\\d+)(?:st|nd|rd)': (element, otherMatchedElements, parameters) => otherMatchedElements[parseInt(parameters[0]) - 1] === element,
    '(\\d+)(?:st|nd|rd) last': (element, otherMatchedElements, parameters) => otherMatchedElements[otherMatchedElements.length - parseInt(parameters[0])] === element
};
},{}],2:[function(require,module,exports){
var list = ['ul', 'ol', '[role=list]'];
var item = ['li', '[role=listitem]'];
var button = ['button', 'a', 'input[type=button]', '[role=button]', '[tabindex]'];
var link = ['a', 'button', 'input[type=button]', '[role=button]'];
var cell = ['td', 'th', '[role=cell]'];
var heading = ['[role=heading]', 'h1', 'h2', 'h3', 'h4'];
var header = ['header', '[role=banner]'];
var footer = ['footer'];
var image = ['img', 'svg', '[role=img]'];
var input = ['input', 'textarea', 'select', '[role=textbox]', '[contenteditable]'];
var field = [...input, 'label'];
var section = ['section'];
var form = ['form', '[role=form]'];
var row = ['tr', '[role=row]'];
var article = ['[role=article]', 'article'];
var region = ['[role=region]'];
var dialog = ['[role=dialog]', '[aria-modal]', '[role=alertdialog]', '[role=alert]'];
var alert = ['[role=alert]', '[role=alertdialog]', '[aria-modal]', '[role=dialog]'];
var area = [section, form, article, region, dialog].flat();
var navigation = ['[role=navigation]'];
var progressbar = ['progress', '[role=progressbar]'];
var status = ['[role=status]'];
var all = ['*'];
var text = ['p', 'section', 'article', 'aside', 'header', 'footer', 'span', 'div', '*'];
var notLabel = `:not(${[
            list,
            item,
            button,
            link,
            cell,
            row,
            article,
            region,
            dialog,
            alert,
            navigation,
            progressbar,
            status,
            section,
            header,
            footer,
            image,
            form,
            input
        ]
        .flatMap(typeList => typeList)
        .join(',')
    })`;
var label = [
    `label${notLabel}`,
    `span${notLabel}`,
    `td${notLabel}`,
    `${notLabel}`
];

// Each of the below is a valid UI 'Type' that can be used with automage.
module.exports = {
    button, // Things you want to click.
    link, // Things that are links to other places.
    label, // Things that labels other bits of UI.
    heading, // Headings for chunks of UI.
    header, // Content area headers.
    footer, // Content area footers.
    image, // Graphical UI
    field, // Interactive UI, eg: inputs, selects, radiobuttons etc.
    section, // Sections of UI.
    form, // Forms.
    row, // Rows in a table.
    cell, // Cells in a table.
    item, // An item in a list.
    article, // DOM Article elements.
    region, // UI with a role of 'region'.
    dialog, // UI with a role of 'dialog'.
    alert, // UI with a role of 'alert'.
    area, // Logical UI area, eg form, section, etc..'.
    list, // Lists of items.
    navigation, // UI with a role of 'navigation'.
    progressbar, // Things that describe progress.
    status, // Things that describe status, like a loading spinner.
    all, // Any element. This is a very vague selector and usually wont do what you want.
    text // Things that usually hold text. This is a very vague selector and sometimes wont do what you want.
};
},{}],3:[function(require,module,exports){
var righto = require('righto');
var stable = require('stable');
var types = require('./elementTypes');
var states = require('./elementStates');

// List of selectors ordered by their likeliness to be the target of text/click/value selection
var clickWeighting = ['button, [role=button], [type=button], a', 'input', 'h1, h2, h3, h4', 'i', 'label'];
var valueWeighting = ['input, textarea, select', '[contenteditable]', 'label'];

var noElementOfType = 'no elements of type ';

var nonTextInputs = ['date', 'range', 'select'];

var hiddenSelector = '[hidden],[aria-hidden=true]';

function debug(...args){
    if(automage.debug){
        /* c8 ignore next 2 */
        console.log(args);
    }
}

function getDocument(context){
    return context.ownerDocument || (context.defaultView ? context : null);
}

function getFocusedElement(context, callback) {
    var focusedElement = getDocument(context).activeElement;

    return callback ? callback(null, focusedElement) : righto.from(focusedElement);
}

function getTypeSelectors(type) {
    if(!(type in types)) {
        throw new Error(`Invalid type: expected one of ${Object.keys(types)}, saw ${type}`);
    }

    return types[type];
}

function getStateCheck(state) {
    if(state == null) {
        return null;
    }

    var [stateType, parameters] = state.match();
    var [statePattern, parameters] = Object.keys(states).flatMap(statePattern => {
        var match = state.match(statePattern);
        return match ? [statePattern, Array.from(match).slice(1)] : []
    });

    if(!(statePattern in states)) {
        throw new Error(`Invalid state: expected an optional state of ${Object.keys(states)}, saw ${state}`);
    }

    return (element, otherMatchedElements) => states[statePattern](element, otherMatchedElements, parameters);
}

function pressKey(context, key, fullValue, callback) {
    var defaultView = getDocument(context).defaultView;
    var element = getDocument(context).activeElement;
    var specialKeyMatch = key.match(/^U\+(\d\d\d\d)$/);
    var keyCode = specialKeyMatch ? parseInt(specialKeyMatch[1]) : key.charCodeAt(0);

    if(specialKeyMatch){
        key = '';
    }

    if(arguments.length < 3){
        callback = fullValue;
        fullValue = (element.value || '') + key;
    }

    function makeEvent(type) {
        return new defaultView.KeyboardEvent(type, {
            code: keyCode,
            key: key,
            charCode: keyCode,
            keyCode: keyCode,
            view: defaultView
        });
    }

    var keydownEvent = makeEvent('keydown'),
        keyupEvent = makeEvent('keyup'),
        keypressEvent = makeEvent('keypress'),
        inputEvent = makeEvent('input');

    element.dispatchEvent(keydownEvent);

    if ('value' in element) {
        element.value = fullValue;
    }

    element.dispatchEvent(keypressEvent);
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(keyupEvent);

    return callback ? callback(null, element) : righto.from(element);
}

function pressKeys(context, keys, callback) {
    var isEmptyStringKey = keys === '';

    function pressNextKey(keyIndex, callback){
        var nextKey = String(keys).charAt(keyIndex);

        if(!isEmptyStringKey && nextKey === ''){
            return callback(null, getDocument(context).activeElement);
        }

        if(isEmptyStringKey){
            isEmptyStringKey = false;
            nextKey = 'U+0008';
        }

        pressKey(context, nextKey, keys.slice(0, keyIndex + 1), function() {
            setTimeout(function(){
                pressNextKey(keyIndex + 1, callback);
            }, automage.defaultKeyPressWaitTimeout);
        });
    }

    var keysPressed = righto(pressNextKey, 0);

    return callback ? keysPressed(callback) : keysPressed;
}

function typeInto(context, state, description, type, value, callback) {
    if(!(typeof value === 'string')) {
        callback = value;
        value = type;
        type = description;
        description = state;
        state = null;
    }

    debug('typeInto', state, description, type);
    var focused = righto(focus, context, state, description, type);
    var keysPressed = righto(pressKeys, context, value, righto.after(focused));

    return callback ? keysPressed(callback) : keysPressed;
}

function checkMatchValue(targetValue, description){
    if(description instanceof RegExp){
        return targetValue && targetValue.match(description);
    }

    return targetValue && targetValue.toLowerCase().trim() === description.toLowerCase();
}

function getElementVisibleText(element){
    return Array.from(element.childNodes).map(node => {
        if(node.nodeType !== 3){
            return getElementVisibleText(node);
        }

        if(node.textContent && !node.parentElement.closest(hiddenSelector)) {
            return node.textContent;
        }

        return '';
    })
    .flat()
    .join('');
}

function matchAttributes(element, description){
    if(
        checkMatchValue(element.getAttribute('title'), description) ||
        checkMatchValue(element.getAttribute('placeholder'), description) ||
        checkMatchValue(element.getAttribute('aria-label'), description) ||
        element.tagName === 'IMG' && checkMatchValue(element.getAttribute('alt'), description) ||
        checkMatchValue(element.value, description)
    ) {
        return 1;
    }
}

function matchTextContent(element, description){
    if(
        checkMatchValue(element.textContent, description) &&
        checkMatchValue(getElementVisibleText(element), description)
    ){
        return 1;
    }
}

function matchBesideLabels(element, description, onlyScanDecendants){
    if(
        element.previousElementSibling &&
        element.previousElementSibling.matches(types.label.join()) &&
        !element.previousElementSibling.hasAttribute('for') &&
        checkMatchValue(getElementVisibleText(element.previousElementSibling), description, onlyScanDecendants)
    ) {
        return 4;
    }
}

function isTextNode(node){
    return node.nodeType === 3;
}

function matchDirectChildTextNodes(element, description){
    var directChildText = Array.from(element.childNodes)
        .filter(isTextNode)
        .map(textNode => textNode.textContent)
        .join('');

    if(checkMatchValue(directChildText, description)){
        return 2;
    }
}

function matchDecendentText(element, description, onlyScanDecendants){
    if(
        findMatchingElements(
            description,
            Array.from(element.children)
                .filter(node =>
                    !node.closest(hiddenSelector) &&
                    node.matches &&
                    node.matches(types.text.join())
                ),
            onlyScanDecendants
        ).length
    ){
        return 3
    }
}

function matchLabelFor(element, description){
    var id = element.getAttribute('id');

    if(
        id &&
        findMatchingElements(
            description,
            Array.from(getDocument(element).querySelectorAll(`label[for="${id}"]`))
                .filter(node => !node.closest(hiddenSelector)
                ),
            true
        ).length
    ){
        return 3
    }
}

function matchElementContent(element, description, onlyScanDecendants) {
    return (
        // This check is fast, so we optimize by checking it first
        matchAttributes(element, description) ||
        (
            matchTextContent(element, description) ||
            matchDirectChildTextNodes(element, description) ||
            matchDecendentText(element, description, onlyScanDecendants) ||
            matchBesideLabels(element, description, onlyScanDecendants) ||

            // the labelFor check can include already-scanned elements
            // which can lead to an infinit recursive loop.
            !onlyScanDecendants && matchLabelFor(element, description)
        )
    );
}

function findMatchingElements(description, elementsList, onlyScanDecendants) {
    return Array.prototype.slice.call(elementsList)
        .map(function(element) {
            var weighting = matchElementContent(element, description, onlyScanDecendants);
            if(weighting){
                return [weighting, element]
            };
        })
        .filter(result => result)
        .sort((a, b) => a[0] - b[0]);
}

// ToDo: add coverage.
/* c8 ignore next 4 */
function getElementClickWeight(element) {
    var index = clickWeighting.findIndex(selector => element.matches(selector));
    return clickWeighting.length - (index < 0 ? Infinity : index);
}

function getElementValueWeight(element) {
    var index = valueWeighting.findIndex(selector => element.matches(selector));
    return valueWeighting.length - (index < 0 ? Infinity : index);
}

function findAllMatchingElements(context, state, description, type) {
    var typeSelectors = getTypeSelectors(type);
    var stateCheck = getStateCheck(state);
    var elements = Array.from(context.querySelectorAll(typeSelectors))
        .filter(element => !element.closest(hiddenSelector));

    var matches = findMatchingElements(description, elements, false);

    var matchesByDocumentPosition = stable(matches,
        function(a, b){
            return a[0] === b[0] ? a[1].compareDocumentPosition(b[1]) & 2 ? -1 : 1 : 0;
        }
    );

    var matchesWithParentNodesFiltered = matchesByDocumentPosition
    .reduce((results, nextMatch) => {
        if(results.some(match => nextMatch[1].contains(match[1]))) {
            return results;
        }

        return results.concat([nextMatch]);
    }, []);

    var matchesByTypePriority = stable(matchesWithParentNodesFiltered,
        function(a, b){
            var aTypeIndex = typeSelectors.findIndex(type => a[1].matches(type));
            var bTypeIndex = typeSelectors.findIndex(type => b[1].matches(type));

            aTypeIndex = aTypeIndex < 0 ? Infinity : aTypeIndex;
            bTypeIndex = bTypeIndex < 0 ? Infinity : bTypeIndex;
            return aTypeIndex - bTypeIndex;
        }
    );

    var matchedElementsByTypePriority = matchesByTypePriority.map(result => result[1]);
    return matchedElementsByTypePriority
        .filter(element => stateCheck == null || stateCheck(element, matchedElementsByTypePriority));
}

function findAll(context, state, description, type, callback){
    if(!(typeof type === 'string')) {
        callback = type;
        type = description;
        description = state;
        state = null;
    }

    debug('findAll', state, description, type);

    var typeSelectors = getTypeSelectors(type);

    var results = righto.from(null).get(() => {
        var matched = findAllMatchingElements(context, state, description, type);

        return matched;
    });

    return callback ? results(callback) : results;
}

function find(context, state, description, type, callback) {
    if(!(typeof type === 'string')) {
        callback = type;
        type = description;
        description = state;
        state = null;
    }

    debug('find', state, description, type);

    var typeSelectors = getTypeSelectors(type);

    var result = righto.sync(elements => {
        var matched = findAllMatchingElements(context, state, description, type);

        if(!matched.length){
            return righto.fail(new Error(`${type} was not found matching "${description}"`));
        }

        return matched.filter(element => element.matches(typeSelectors));
    });

    return callback ? result(callback) : result;
}

function filterComponents(elementTypes, elements){
    return elementTypes.reduce((result, nextType) => {
        if(result.length) {
            return result;
        }

        return elements.filter(element => element.matches(nextType));
    }, [])
}

function get(context, state, description, type, callback) {
    if(!(typeof type === 'string')) {
        callback = type;
        type = description;
        description = state;
        state = null;
    }

    debug('get', state, description, type);

    var typeSelectors = getTypeSelectors(type);
    var elements = righto(find, context, state, description, type);
    var result = righto.sync(() =>
            findAllMatchingElements(context, state, description, type, true)
        )
        .get(filterComponents.bind(null, typeSelectors))
        .get(elements => {
            if(elements.length > 1) {
                return righto.fail(new Error(`More than one ${type} was found matching "${description}"`));
            }
            if(!elements.length){
                return righto.fail(new Error(`${type} was not found matching "${description}"`));
            }

            return elements[0];
        })

    return callback ? result(callback) : result;
}

function isMissing(context, state, description, type, callback) {
    if(!(typeof type === 'string')) {
        callback = type;
        type = description;
        description = state;
        state = null;
    }

    debug('isMissing', state, description, type);

    var foundElements = righto(findAll, context, state, description, type);

    var result = foundElements.get(result =>
        result.length
        ? righto.fail(new Error(`A ${type} was found matching "${description}"`))
        : true
    );

    return callback ? result(callback) : result;
}

function wait(time, callback) {
    setTimeout(callback, time || 0);
}

function click(context, state, description, type, callback) {
    if(!(typeof type === 'string')) {
        callback = type;
        type = description;
        description = state;
        state = 'enabled';
    }

    debug('click', state, description, type);
    var clickTargets = righto(findAll, context, state, description, type);
    var clickedElement = clickTargets.get(elements => {
        var sorted = elements.sort((a, b) => getElementClickWeight(b) - getElementClickWeight(a));

        var element = sorted[0];

        if(!element) {
            return righto.fail(new Error(`Could not find clickable ${type} matching "${description}"`));
        }

        // SVG paths
        // ToDo: add coverage.
        /* c8 ignore next 3 */
        while(!element.click){
            element = element.parentNode;
        }

        element.click();

        // Find closest button-like parent
        while(
            element &&
            (!element.matches || !element.matches(types.button.concat('input').join()))
        ){
            element = element.parentNode;
        }

        if(element){
            element.focus();
        }

        return element;
    });
    var waitForEffect = righto(wait, automage.defaultClickWaitTimeout);
    var result = righto.mate(clickedElement, righto.after(waitForEffect));

    return callback ? result(callback) : result;
}

function focus(context, state, description, type, callback) {
    if(!(typeof type === 'string')) {
        callback = type;
        type = description;
        description = state;
        state = null;
    }
    
    debug('focus', state, description, type);
    var elements = righto(findAll, context, state, description, type)

    var focuesdElement = elements.get(elements => {
        var result = elements
            .sort(function(a, b) {
                return getElementValueWeight(b) - getElementValueWeight(a);
            })
            .shift();

        if(!result) {
            return righto.fail(new Error(`${type} was not found matching "${description}"`));
        }

        result.focus();

        return result;
    });

    return callback ? focuesdElement(callback) : focuesdElement;
}

function changeInputValue(element, value, callback){
    var document = getDocument(element)
    var defaultView = document.defaultView;

    var inputEvent = new defaultView.KeyboardEvent('input');
    var method = 'initKeyboardEvent' in inputEvent ? 'initKeyboardEvent' : 'initKeyEvent';

    inputEvent[method]('input', true, true, defaultView, null, 3, true, false, true, false, false);
    element.value = value;

    element.dispatchEvent(inputEvent);
    element.blur();

    var changeEvent = document.createEvent('HTMLEvents');
    changeEvent.initEvent('change', false, true);
    element.dispatchEvent(changeEvent);

    callback(null, element);
}

function encodeDateValue(date){
    date = new Date(date);
    var value = null;

    if(date && !isNaN(date)){
        value = [
            date.getFullYear(),
            ('0' + (date.getMonth() + 1)).slice(-2),
            ('0' + date.getDate()).slice(-2)
        ].join('-');
    }

    return value;
}

function changeContenteditableValue(element, value, callback) {
    element.textContent = value;
    callback(null, element);
}

function encodeSelectValue(label, element){
    var selectedOption = Array.from(element.querySelectorAll('option'))
        .find(option => matchElementContent(option, label));

    return selectedOption ? selectedOption.value : label;
}

var typeEncoders = {
    date: encodeDateValue,
    'select-one': encodeSelectValue
};

function changeNonTextInput(element, value, callback){
    if(element.hasAttribute('contenteditable')){
        return changeContenteditableValue(element, value, callback);
    }

    if(element.type in typeEncoders){
        value = typeEncoders[element.type](value, element);
    }

    changeInputValue(element, value, callback);
}

function changeValue(context, state, description, type, value, callback) {
    if(!(typeof value === 'string')) {
        callback = value;
        value = type;
        type = description;
        description = state;
        state = null;
    }

    debug('changeValue', state, description, type);
    var focusedElement = righto(focus, context, state, description, type);
    var valueChangedElement = focusedElement.get(element => {
        if(
            element.nodeName === 'INPUT' && ~nonTextInputs.indexOf(element.type) ||
            element.nodeName === 'SELECT' ||
            element.hasAttribute('contenteditable')
        ){
            return righto(changeNonTextInput, element, value);
        }

        if(value === ''){
            // Select the contents before deleting.
            element.select();
        }

        var keysPressed = righto(pressKeys, context, value);
        var elementChanged = keysPressed.get(element => {
            var document = getDocument(element);
            element.blur();

            var changeEvent = document.createEvent('HTMLEvents');
            changeEvent.initEvent('change', false, true);
            element.dispatchEvent(changeEvent);

            return element
        });

        return elementChanged;
    });

    return callback ? valueChangedElement(callback) : valueChangedElement;
}

function blur(context, callback) {
    var result = righto(getFocusedElement, context)
        .get(element => {
            element.blur();
            return element
        });

    return callback ? result(callback) : result;
}

function waitFor(fn){
    return function(...args){
        var timeoutIndex = args.length-1;

        if(typeof args[timeoutIndex] === 'function') {
            timeoutIndex--;
        }

        if(!args.length || typeof args[timeoutIndex] !== 'number') {
            timeoutIndex = null;
        }

        var timeout = timeoutIndex != null ? args.splice(timeoutIndex, 1).pop() : automage.defaultWaitTimeout;
        var startTime = Date.now();
        var callback;

        if(typeof args[args.length - 1] === 'function') {
            callback = args.pop();
        }


        function retry(callback){
            var result = righto.handle(righto(fn, ...args), (error, callback) => {
                if(Date.now() - startTime > timeout){
                    return callback(new Error(`${error.message} - Retrying timed out after ${timeout}ms`));
                }

                var retryWait = righto(wait, 10);

                righto(retry, righto.after(retryWait))(callback);
            });

            result(callback);
        }

        var result = righto(retry);

        return callback ? result(callback) : result;
    }
}

var automage = {
    defaultWaitTimeout: 100,
    defaultClickWaitTimeout: 10,
    defaultKeyPressWaitTimeout: 10,
    pressKey: pressKey,
    pressKeys: pressKeys,
    findAll: waitFor(findAll),
    find: waitFor(find),
    get: waitFor(get),
    isMissing: waitFor(isMissing),
    click: waitFor(click),
    typeInto: waitFor(typeInto),
    getFocusedElement: getFocusedElement,
    focus: waitFor(focus),
    changeValue: waitFor(changeValue),
    blur: blur,
    waitFor: waitFor(get)
};

module.exports = automage;

},{"./elementStates":1,"./elementTypes":2,"righto":6,"stable":8}],4:[function(require,module,exports){
function checkIfPromise(promise){
    if(!promise || typeof promise !== 'object' || typeof promise.then !== 'function'){
        throw "Abbott requires a promise to break. It is the only thing Abbott is good at.";
    }
}

module.exports = function abbott(promiseOrFn){
    if(typeof promiseOrFn !== 'function'){
        checkIfPromise(promiseOrFn);
    }

    return function(){
        var promise;
        if(typeof promiseOrFn === 'function'){
           promise = promiseOrFn.apply(null, Array.prototype.slice.call(arguments, 0, -1));
        }else{
            promise = promiseOrFn;
        }

        checkIfPromise(promise);

        var callback = arguments[arguments.length-1];
        promise.then(callback.bind(null, null), callback);
    };
};
},{}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
(function (global){(function (){
var abbott = require('abbott');
require('setimmediate');

var deferCallbacks = [];
var defer = global.process && global.process.nextTick || global.setImmediate;

function isRighto(x){
    return typeof x === 'function' && (x.__resolve__ === x || x.resolve === x);
}

function isThenable(x){
    return x && typeof x.then === 'function' && !isRighto(x);
}

function isResolvable(x){
    return isRighto(x) || isThenable(x);
}

function isTake(x){
    return x && typeof x === 'object' && '__take__' in x;
}

var slice = Array.prototype.slice.call.bind(Array.prototype.slice);

function getCallLine(stack){
    var index = 0,
        lines = stack.split('\n');

    while(lines[++index] && lines[index].match(/righto\/index\.js/)){}

    var match = lines[index] && lines[index].match(/at (.*)/);

    return match ? match[1] : ' - No trace - ';
}

function takeWrap(results){
    this.results = results;
}

function take(targetTask){
    var done = this;
    var keys = slice(arguments, 1);
    return righto.from(targetTask)(function(error){
        if(error){
            return done(error);
        }
        var args = slice(arguments, 1);
        done(error, new takeWrap(keys.map(function(key){
            return args[key];
        })));
    });
}

function resolveDependency(task, done){
    if(isThenable(task)){
        task = righto(abbott(task));
    }

    if(isRighto(task)){
        return task(done);
    }

    if(isTake(task)){
        return take.apply(done, task.__take__);
    }

    if(
        righto._debug &&
        righto._warnOnUnsupported &&
        Array.isArray(task) &&
        isRighto(task[0]) &&
        !isRighto(task[1])
    ){

        console.warn('\u001b[33mPossible unsupported take/ignore syntax detected:\u001b[39m\n' + getCallLine(this._stack));
    }

    return done(null, task);
}

function traceGet(instance, result){
    if(righto._debug && !(typeof result === 'object' || typeof result === 'function')){
        var line = getCallLine(instance._stack);
        throw new Error('Result of righto was not an instance at: \n' + line);
    }
}

function get(fn){
    var instance = this;
    return righto(function(result, fn, done){
        if(typeof fn === 'string' || typeof fn === 'number'){
            traceGet(instance, result);
            return done(null, result[fn]);
        }

        righto.from(fn(result))(done);
    }, this, fn);
}

var noOp = function(){};

function proxy(instance){
    instance._ = new Proxy(instance, {
        get: function(target, key){
            if(key === '__resolve__'){
                return instance._;
            }

            if(instance[key] || key in instance || key === 'inspect' || typeof key === 'symbol'){
                return instance[key];
            }

            if(righto._debug && key.charAt(0) === '_'){
                return instance[key];
            }

            return proxy(righto.sync(function(result){
                traceGet(instance, result);
                return result[key];
            }, instance));
        }
    });
    instance.__resolve__ = instance._;
    return instance._;
}

function createIterator(fn){
    var outerArgs = slice(arguments, 1);

    return function(){
        var args = outerArgs.concat(slice(arguments)),
            callback = args.pop(),
            errored,
            lastValue;

        var generator = fn.apply(null, args);

        function run(){
            if(errored){
                return;
            }
            var next = generator.next(lastValue);
            if(next.done){
                if(errored){
                    return;
                }
                return righto.from(next.value)(callback);
            }
            if(isResolvable(next.value)){
                righto.sync(function(value){
                    lastValue = value;
                    run();
                }, next.value)(function(error){
                    if(error){
                        callback(error);
                    }
                });
                return;
            }
            lastValue = next.value;
            run();
        }

        run();
    };
}

function addTracing(resolve, fn, args){

    var argMatch = fn.toString().match(/^[\w\s]*?\(((?:\w+[,\s]*?)*)\)/),
        argNames = argMatch ? argMatch[1].split(/[,\s]+/g) : [];

    resolve._stack = new Error().stack;
    resolve._trace = function(tabs){
        var firstLine = getCallLine(resolve._stack);

        if(resolve._error){
            firstLine = '\u001b[31m' + firstLine + ' <- ERROR SOURCE' +  '\u001b[39m';
        }

        tabs = tabs || 0;
        var spacing = '    ';
        for(var i = 0; i < tabs; i ++){
            spacing = spacing + '    ';
        }
        return args.map(function(arg, index){
            return [arg, argNames[index] || index];
        }).reduce(function(results, argInfo){
            var arg = argInfo[0],
                argName = argInfo[1];

            if(isTake(arg)){
                arg = arg.__take__[0];
            }

            if(isRighto(arg)){
                var line = spacing + '- argument "' + argName + '" from ';


                if(!arg._trace){
                    line = line + 'Tracing was not enabled for this righto instance.';
                }else{
                    line = line + arg._trace(tabs + 1);
                }
                results.push(line);
            }

            return results;
        }, [firstLine])
        .join('\n');
    };
}

function errorOut(error, callback){
    if(error && righto._debug){
        if(righto._autotraceOnError || this.resolve._traceOnError){
            console.log('Dependency error executing ' + this.fn.name + ' ' + this.resolve._trace());
        }
    }

    callback(error);
}

function debugResolve(context, args, complete){
    try{
        args.push(complete);
        context.fn.apply(null, args);
    }catch(error){
        console.log('Task exception executing ' + context.fn.name + ' from ' + context.resolve._trace());
        throw error;
    }
}

function resolveWithDependencies(done, error, argResults){
    var context = this;

    if(error){
        var boundErrorOut = errorOut.bind(context, error);

        for(var i = 0; i < context.callbacks.length; i++){
            boundErrorOut(context.callbacks[i]);
        }

        return;
    }

    var args = argResults.reduce((results, next) => {
            if(next && next instanceof takeWrap){
                return results.concat(next.results);
            }

            results.push(next);
            return results;
        }, []);

    function complete(error){
        if(error && righto._debug){
            context.resolve._error = error;
        }

        var results = arguments;

        done(results);

        var callbacks = context.callbacks;

        while(callbacks.length){
            var nextCallback = callbacks.shift();

            nextCallback.apply(null, results)
        }
    }

    if(righto._debug){
        debugResolve(context, args, complete);
    } else {
        // Slight perf bump by avoiding apply for simple cases.
        switch(args.length){
            case 0: context.fn(complete); break;
            case 1: context.fn(args[0], complete); break;
            case 2: context.fn(args[0], args[1], complete); break;
            case 3: context.fn(args[0], args[1], args[2], complete); break;
            default:
                args.push(complete);
                context.fn.apply(null, args);
        }
    }
}

function resolveDependencies(args, complete, resolveDependency){
    var results = [],
        done = 0,
        hasErrored;

    if(!args.length){
        complete(null, []);
    }

    function dependencyResolved(index, error, result){
        if(hasErrored){
            return;
        }

        if(error){
            hasErrored = true;
            return complete(error);
        }

        results[index] = result;

        if(++done === args.length){
            complete(null, results);
        }
    }

    for(var i = 0; i < args.length; i++){
        if(!isResolvable(args[i]) && !isTake(args[i])){
            dependencyResolved(i, null, args[i]);
            continue;
        }
        resolveDependency(args[i], dependencyResolved.bind(null, i));
    }
}

function resolver(complete){
    var context = this;

    // No callback? Just run the task.
    if(!arguments.length){
        complete = noOp;
    }

    if(isRighto(complete)){
        throw new Error('righto instance passed into a righto instance instead of a callback');
    }

    if(typeof complete !== 'function'){
        throw new Error('Callback must be a function');
    }

    if(context.results){
        complete.apply(null, context.results);
        return context.resolve;
    }

    context.callbacks.push(function(){
        defer(() => complete.apply(null, arguments))
    });

    if(context.started++){
        return context.resolve;
    }

    var async;

    function dependenciesResolved(resolvedResults){
        if(righto._debug){
            if(righto._autotrace || context.resolve._traceOnExecute){
                console.log('Executing ' + context.fn.name + ' ' + context.resolve._trace());
            }
        }

        context.results = resolvedResults;
    }

    var resolved = resolveWithDependencies.bind(context, dependenciesResolved);

    defer(resolveDependencies.bind(null, context.args, resolved, resolveDependency.bind(context.resolve)));

    return context.resolve;
};

function thenMethod(handleSuccess, handleError){
    if(handleError){
        return this.then(handleSuccess).catch(handleError);
    }

    return this.get(handleSuccess)();
}

function catchMethod(handleError){
    return righto.handle(this, function(error, done){
        righto.from(handleError(error))(done);
    })();
}

function finallyMethod(handleFinally){
    return this
    .then(() => {
        handleFinally();
    }, () => {
        handleFinally();
    });
}

function righto(){
    var args = slice(arguments),
        fn = args.shift();

    if(typeof fn !== 'function'){
        throw new Error('No task function passed to righto');
    }

    if(isRighto(fn) && args.length > 0){
        throw new Error('Righto task passed as target task to righto()');
    }

    var resolverContext = {
            fn: fn,
            callbacks: [],
            args: args,
            started: 0
        },
        resolve = resolver.bind(resolverContext);
    resolve.get = get.bind(resolve);
    resolve.then = thenMethod.bind(resolve);
    resolve.catch = catchMethod.bind(resolve);
    resolve.finally = finallyMethod.bind(resolve);
    resolverContext.resolve = resolve;
    resolve.resolve = resolve;

    if(righto._debug){
        addTracing(resolve, fn, args);
    }

    return resolve;
}

righto.sync = function(fn){
    return righto.apply(null, [function(){
        var args = slice(arguments),
            done = args.pop(),
            result = fn.apply(null, args);

        if(isResolvable(result)){
            return righto.from(result)(done);
        }

        done(null, result);
    }].concat(slice(arguments, 1)));
};

righto.all = function(value){
    var task = value;
    if(arguments.length > 1){
        task = slice(arguments);
    }

    function resolve(tasks){
        return righto.apply(null, [function(){
            arguments[arguments.length - 1](null, slice(arguments, 0, -1));
        }].concat(tasks));
    }

    if(isRighto(task)){
        return righto(function(tasks, done){
            resolve(tasks)(done);
        }, task);
    }

    return resolve(task);
};

righto.reduce = function(values, reducer, seed){
    var hasSeed = arguments.length >= 3;

    if(!reducer){
        reducer = function(previous, next){
            return righto(next);
        };
    }

    return righto.from(values).get(function(values){
        if(!values || !values.reduce){
            throw new Error('values was not a reduceable object (like an array)');
        }

        values = values.slice();

        if(!hasSeed){
            seed = values.shift();
        }

        if(!values.length){
            return righto.from(seed);
        }

        return values.reduce(function(previous, next){
            return righto.sync(reducer, previous, righto.value(next));
        }, seed);
    });
};

righto.from = function(value){
    if(arguments.length > 1){
        throw new Error('righto.from called with more than one argument. Righto v4 no longer supports constructing eventuals via `from`, use `sync` instead.');
    }

    if(isRighto(value)){
        return value;
    }

    return righto.sync(function(resolved){
        return resolved;
    }, value);
};

righto.mate = function(){
    return righto.apply(null, [function(){
        arguments[arguments.length -1].apply(null, [null].concat(slice(arguments, 0, -1)));
    }].concat(slice(arguments)));
};

righto.take = function(task){
    if(!isResolvable(task)){
        throw new Error('task was not a resolvable value');
    }

    return {__take__: slice(arguments)};
};

righto.after = function(task){
    if(!isResolvable(task)){
        throw new Error('task was not a resolvable value');
    }

    if(arguments.length === 1){
        return {__take__: [task]};
    }

    return {__take__: [righto.mate.apply(null, arguments)]};
};

righto.resolve = function(object, deep){
    if(isRighto(object)){
        return righto.sync(function(object){
            return righto.resolve(object, deep);
        }, object);
    }

    if(!object || !(typeof object === 'object' || typeof object === 'function')){
        return righto.from(object);
    }

    var pairs = righto.all(Object.keys(object).map(function(key){
        return righto(function(value, done){
            if(deep){
                righto.sync(function(value){
                    return [key, value];
                }, righto.resolve(value, true))(done);
                return;
            }
            done(null, [key, value]);
        }, object[key]);
    }));

    return righto.sync(function(pairs){
        return pairs.reduce(function(result, pair){
            result[pair[0]] = pair[1];
            return result;
        }, Array.isArray(object) ? [] : {});
    }, pairs);
};

righto.iterate = createIterator;

righto.value = function(){
    var args = arguments;
    return righto(function(done){
        done.apply(null, [null].concat(slice(args)));
    });
};

righto.surely = function(task){
    if(!isResolvable(task)){
        task = righto.apply(null, arguments);
    }

    return righto(function(done){
        righto.from(task)(function(){
            done(null, slice(arguments));
        });
    });
};

righto.handle = function(task, handler){
    return righto(function(handler, done){
        function complete(error){
            if(!error){
                return done.apply(null, arguments);
            }

            handler(error, done);
        }
        righto.from(task)(complete);
    }, handler);
};

righto.fail = function(error){
    return righto(function(error, done){
        done(error);
    }, error);
};

righto.fork = function(value){
    return function(resolve, reject){
        righto.from(value)(function(error, result){
            if(error){
                return reject(error);
            }

            resolve(result);
        });
    };
};

righto.isRighto = isRighto;
righto.isThenable = isThenable;
righto.isResolvable = isResolvable;

righto.proxy = function(){
    if(typeof Proxy === 'undefined'){
        throw new Error('This environment does not support Proxy\'s');
    }

    return proxy(righto.apply(this, arguments));
};

for(var key in righto){
    righto.proxy[key] = righto[key];
}

module.exports = righto;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"abbott":4,"setimmediate":7}],7:[function(require,module,exports){
(function (process,global){(function (){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":5}],8:[function(require,module,exports){
//! stable.js 0.1.8, https://github.com/Two-Screen/stable
//! © 2018 Angry Bytes and contributors. MIT licensed.

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.stable = factory());
}(this, (function () { 'use strict';

  // A stable array sort, because `Array#sort()` is not guaranteed stable.
  // This is an implementation of merge sort, without recursion.

  var stable = function (arr, comp) {
    return exec(arr.slice(), comp)
  };

  stable.inplace = function (arr, comp) {
    var result = exec(arr, comp);

    // This simply copies back if the result isn't in the original array,
    // which happens on an odd number of passes.
    if (result !== arr) {
      pass(result, null, arr.length, arr);
    }

    return arr
  };

  // Execute the sort using the input array and a second buffer as work space.
  // Returns one of those two, containing the final result.
  function exec(arr, comp) {
    if (typeof(comp) !== 'function') {
      comp = function (a, b) {
        return String(a).localeCompare(b)
      };
    }

    // Short-circuit when there's nothing to sort.
    var len = arr.length;
    if (len <= 1) {
      return arr
    }

    // Rather than dividing input, simply iterate chunks of 1, 2, 4, 8, etc.
    // Chunks are the size of the left or right hand in merge sort.
    // Stop when the left-hand covers all of the array.
    var buffer = new Array(len);
    for (var chk = 1; chk < len; chk *= 2) {
      pass(arr, comp, chk, buffer);

      var tmp = arr;
      arr = buffer;
      buffer = tmp;
    }

    return arr
  }

  // Run a single pass with the given chunk size.
  var pass = function (arr, comp, chk, result) {
    var len = arr.length;
    var i = 0;
    // Step size / double chunk size.
    var dbl = chk * 2;
    // Bounds of the left and right chunks.
    var l, r, e;
    // Iterators over the left and right chunk.
    var li, ri;

    // Iterate over pairs of chunks.
    for (l = 0; l < len; l += dbl) {
      r = l + chk;
      e = r + chk;
      if (r > len) r = len;
      if (e > len) e = len;

      // Iterate both chunks in parallel.
      li = l;
      ri = r;
      while (true) {
        // Compare the chunks.
        if (li < r && ri < e) {
          // This works for a regular `sort()` compatible comparator,
          // but also for a simple comparator like: `a > b`
          if (comp(arr[li], arr[ri]) <= 0) {
            result[i++] = arr[li++];
          }
          else {
            result[i++] = arr[ri++];
          }
        }
        // Nothing to compare, just flush what's left.
        else if (li < r) {
          result[i++] = arr[li++];
        }
        else if (ri < e) {
          result[i++] = arr[ri++];
        }
        // Both iterators are at the chunk ends.
        else {
          break
        }
      }
    }
  };

  return stable;

})));

},{}]},{},[3])(3)
});
