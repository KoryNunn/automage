var righto = require('righto');
var stable = require('stable');
var types = require('./elementTypes');
var states = require('./elementStates');

// List of selectors ordered by their likeliness to be the target of text/click/value selection
var clickWeighting = ['button, [role=button], [type=button], a', 'input', 'h1, h2, h3, h4', 'i', 'label'];
var valueWeighting = ['input, textarea, select', '[contenteditable]', 'label'];

var nonTextInputs = ['date', 'datetime-local', 'range', 'select'];

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

function typeInto(context, state, description, type, value) {
    if(!(typeof value === 'string')) {
        callback = value;
        value = type;
        type = description;
        description = state;
        state = null;
    }

    debug('typeInto', state, description, type);
    var focused = focus(context, state, description, type);
    var keysPressed = righto(pressKeys, context, value, righto.after(focused));

    return keysPressed;
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

function matchBesideLabels(element, description){
    if(
        element.previousElementSibling &&
        element.previousElementSibling.matches(types.label.join()) &&
        !element.previousElementSibling.hasAttribute('for') &&
        checkMatchValue(getElementVisibleText(element.previousElementSibling), description)
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

function findAllMatchingElements(context, state, description, type, bestType) {
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

    var matchedElementsByTypePriority = matchesByTypePriority
        .filter(match => (bestType && state !== 'labeledBy') ? match[0] === matchesByTypePriority[0][0] : true)
        .map(result => result[1]);

    return matchedElementsByTypePriority
        .filter(element => stateCheck == null || stateCheck(element, matchedElementsByTypePriority));
}

function findAll(context, state, description, type){
    if(!(typeof type === 'string')) {
        type = description;
        description = state;
        state = null;
    }

    debug('findAll', state, description, type);

    var results = righto.from(null).get(() => {
        var matched = findAllMatchingElements(context, state, description, type);

        return matched;
    });

    return results;
}

function find(context, state, description, type) {
    if(!(typeof type === 'string')) {
        type = description;
        description = state;
        state = null;
    }

    debug('find', state, description, type);

    var typeSelectors = getTypeSelectors(type);

    var result = righto.sync(() => {
        var matched = findAllMatchingElements(context, state, description, type, true);

        if(!matched.length){
            const error = new Error(`${type} was not found matching "${description}"`);
            return righto.fail(error);
        }

        return matched.filter(element => element.matches(typeSelectors));
    });

    return result;
}

function filterComponents(elementTypes, elements){
    return elementTypes.reduce((result, nextType) => {
        if(result.length) {
            return result;
        }

        return elements.filter(element => element.matches(nextType));
    }, [])
}

function get(context, state, description, type) {
    if(!(typeof type === 'string')) {
        type = description;
        description = state;
        state = null;
    }

    debug('get', state, description, type);

    var typeSelectors = getTypeSelectors(type);
    var result = righto.sync(() =>
            findAllMatchingElements(context, state, description, type, true, true)
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

    return result;
}

function isMissing(context, state, description, type) {
    if(!(typeof type === 'string')) {
        type = description;
        description = state;
        state = null;
    }

    debug('isMissing', state, description, type);

    var foundElements = findAll(context, state, description, type);

    var result = foundElements.get(result =>
        result.length
        ? righto.fail(new Error(`A ${type} was found matching "${description}"`))
        : true
    );

    return result;
}

function wait(time, callback) {
    setTimeout(callback, time || 0);
}

function click(context, state, description, type) {
    if(!(typeof type === 'string')) {
        type = description;
        description = state;
        state = 'enabled';
    }

    debug('click', state, description, type);
    var clickTargets = findAll(context, state, description, type);
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

    return result;
}

function focus(context, state, description, type) {
    if(!(typeof type === 'string')) {
        type = description;
        description = state;
        state = null;
    }
    
    debug('focus', state, description, type);
    var elements = findAll(context, state, description, type)

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

    return focuesdElement;
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

function encodeDatetimeLocalValue(date){
    date = new Date(date);
    var tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(date - tzoffset)).toISOString().slice(0, -1);
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
    'datetime-local': encodeDatetimeLocalValue,
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

function changeValue(context, state, description, type, value) {
    if(!(typeof value === 'string')) {
        value = type;
        type = description;
        description = state;
        state = null;
    }

    debug('changeValue', state, description, type);
    var focusedElement = focus(context, state, description, type);
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

    return valueChangedElement;
}

function blur(context, callback) {
    var result = righto(getFocusedElement, context)
        .get(element => {
            element.blur();
            return element
        });

    return callback ? result(callback) : result;
}

function formatHTML(html) {
    var tab = '\t';
    var result = '';
    var indent= '';

    html.split(/>\s*</).forEach(function(element) {
        if (element.match( /^\/\w/ )) {
            indent = indent.substring(tab.length);
        }

        result += indent + '<' + element + '>\r\n';

        if (element.match( /^<?\w[^>]*[^\/]$/ ) && !element.startsWith("input")  ) { 
            indent += tab;              
        }
    });

    return result.substring(1, result.length-3);
}

function waitFor(fn){
    return function(context, ...args){
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
            if(!context.ownerDocument.contains(context)){
                var error = new Error(`the provided Context is not in the Document\n\nContext: \n${formatHTML(context.outerHTML)}\n`);
                return callback(error);
            }

            var result = righto.handle(fn(context, ...args), (error, callback) => {
                if(Date.now() - startTime > timeout){
                    var error = new Error(`${error.message} - Retrying timed out after ${timeout}ms`);
                    error.contextHTML = formatHTML(context.outerHTML);
                    return callback(error);
                }

                var retryWait = righto(wait, automage.defaultRetryTimeout);

                righto(retry, righto.after(retryWait))(callback);
            });

            result(callback);
        }

        var result = righto(retry);

        return callback ? result(callback) : result;
    }
}

var automage = {
    defaultRetryTimeout: 10,
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
