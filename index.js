var righto = require('righto');
var stable = require('stable');
var types = require('./elementTypes');

// List of selectors ordered by their likeliness to be the target of text/click/value selection
var textWeighting = ['h1', 'h2', 'h3', 'h4', 'label', 'p', 'a', 'button', '[role=button]'];
var clickWeighting = ['button', '[role=button]', 'input', 'a', 'h1', 'h2', 'h3', 'h4', 'i', 'label'];
var valueWeighting = ['input', 'textarea', 'select', '[contenteditable]', 'label'];

var noElementOfType = 'no elements of type ';

var nonTextInputs = ['date', 'range', 'select'];

function getDocument(context){
    return context.ownerDocument || (context.defaultView ? context : null);
}

function getFocusedElement(context, callback) {
    const focusedElement = getDocument(context).activeElement;

    return callback ? callback(null, focusedElement) : righto.from(focusedElement);
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

function typeInto(context, description, type, value, callback) {
    if (automage.debug) {
        console.log('typeInto', description, type);
    }
    var focused = righto(focus, context, description, type);
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

        if(node.textContent && !node.parentElement.closest('[hidden]')) {
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
    if(element.closest('[hidden]')){
        return;
    }

    var directChildText = Array.from(element.childNodes)
        .filter(isTextNode)
        .map(textNode => textNode.textContent)
        .join('');

    if(checkMatchValue(directChildText, description)){
        return  2;
    }
}

function matchDecendentLabels(element, description, onlyScanDecendants){
    if(
        findMatchingElements(
            description,
            Array.from(element.children)
                .filter(node =>
                    !node.closest('[hidden]') &&
                    node.matches &&
                    node.matches(types.label.join())
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
                .filter(node => !node.closest('[hidden]')
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
            matchDecendentLabels(element, description, onlyScanDecendants) ||
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

function getElementTextWeight(element) {
    var index = textWeighting.findIndex(selector => element.matches(selector));
    return textWeighting.length - (index < 0 ? Infinity : index);
}

function getElementClickWeight(element) {
    var index = clickWeighting.findIndex(selector => element.matches(selector));
    return clickWeighting.length - (index < 0 ? Infinity : index);
}

function getElementValueWeight(element) {
    var index = valueWeighting.findIndex(selector => element.matches(selector));
    return valueWeighting.length - (index < 0 ? Infinity : index);
}

function findAllMatchingElements(context, description, type) {
    var elementTypes = types[type];
    var elements = Array.from(context.querySelectorAll(elementTypes))
        .filter(element => !element.closest('[hidden]'));

    var matches = findMatchingElements(description, elements, false);

    var matchesByDocumentPosition = stable(matches,
        function(a, b){
            return a[1].compareDocumentPosition(b[1]) & 2 ? -1 : 1;
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
            var aTypeIndex = elementTypes.findIndex(type => a[1].matches(type));
            var bTypeIndex = elementTypes.findIndex(type => b[1].matches(type));
            aTypeIndex = aTypeIndex < 0 ? Infinity : aTypeIndex;
            bTypeIndex = bTypeIndex < 0 ? Infinity : bTypeIndex;
            return aTypeIndex - bTypeIndex;
        }
    );

    return matchesByTypePriority.map(result => result[1]);
}

function findAll(context, description, type, callback){
    if (automage.debug) {
        console.log('findAll', description, type);
    }

    var results = righto.from(null).get(() => {
        if(!types[type]) {
            return righto.fail(new Error(`${type} is not a valid ui type`));
        }

        var matched = findAllMatchingElements(context, description, type);

        return matched;
    })

    return callback ? results(callback) : results;
}

function find(context, description, type, callback) {
    if (automage.debug) {
        console.log('find', description, type);
    }

    var result = righto.sync(elements => {
        var elementTypes = types[type];

        if(!elementTypes) {
            return righto.fail(new Error(`${type} is not a valid ui type`));
        }

        var matched = findAllMatchingElements(context, description, type);

        if(!matched.length){
            return righto.fail(new Error(`${type} was not found matching "${description}"`));
        }

        return matched.filter(element => element.matches(elementTypes));
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

function get(context, description, type, callback) {
    if (automage.debug) {
        console.log('get', description, type);
    }
    var elements = righto(find, context, description, type);
    var elementTypes = types[type];

    if(!elementTypes) {
        return righto.fail(new Error(`${type} is not a valid ui type`));
    }

    var result = righto.sync(() =>
            findAllMatchingElements(context, description, type, true)
        )
        .get(filterComponents.bind(null, elementTypes))
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

function isMissing(context, description, type, callback) {
    if (automage.debug) {
        console.log('isMissing', description, type);
    }

    var result = righto.handle(righto(get, context, description, type), (error, done) => done())
        .get(result => result
            ? righto.fail(new Error(`A ${type} was found matching "${description}"`))
            : true
        );

    return callback ? result(callback) : result;
}

function setValue(context, description, type, value, callback) {
    if (automage.debug) {
        console.log('setValue', description, type);
    }
    var focused = righto(focus, context, description, type);
    var valueSet = focused.get(target => {
        target.value = value;
        return target;
    })

    return callback ? valueSet(callback) : valueSet;
}

function wait(time, callback) {
    setTimeout(callback, time || 0);
}

function click(context, description, type, callback) {
    if (automage.debug) {
        console.log('click', description, type);
    }
    var clickTargets = righto(findAll, context, description, type);
    var clickedElement = clickTargets.get(elements => {
        var sorted = elements.sort(function(a, b) {
            return getElementClickWeight(b) - getElementClickWeight(a);
        })

        var element = sorted[0];

        if(!element) {
            return righto.fail(new Error(`Could not find clickable ${type} matching "${description}"`));
        }

        // SVG paths
        while(!element.click){
            element = element.parentNode;
        }

        element.click();

        // Find closest button-like decendant
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

function focus(context, description, type, callback) {
    if (automage.debug) {
        console.log('focus', description, type);
    }
    var elements = righto(findAll, context, description, type)

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
        return changeContenteditableValue(element, value, callback)
    }

    var value = null;

    if(element.type in typeEncoders){
        value = typeEncoders[element.type](value, element);
    } else {
        value = value;
    }
    return changeInputValue(element, value, callback);
}

function changeValue(context, description, type, value, callback) {
    if (automage.debug) {
        console.log('changeValue', description, type);
    }
    var focusedElement = righto(focus, context, description, type);
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
    return function(context, description, type, ...args){
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
            var result = righto.handle(righto(fn, context, description, type, ...args), (error, callback) => {
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

const automage = {
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
