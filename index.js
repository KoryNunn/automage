var righto = require('righto');
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
    key = key.slice(0, 1);
    var defaultView = getDocument(context).defaultView;
    var element = getDocument(context).activeElement;

    if(arguments.length < 3){
        callback = fullValue;
        fullValue = (element.value || '') + key;
    }

    var keydownEvent = new defaultView.KeyboardEvent('keydown'),
        keyupEvent = new defaultView.KeyboardEvent('keyup'),
        keypressEvent = new defaultView.KeyboardEvent('keypress');
        inputEvent = new defaultView.KeyboardEvent('input');

    var method = 'initKeyboardEvent' in keydownEvent ? 'initKeyboardEvent' : 'initKeyEvent';

    keydownEvent[method]('keydown', true, true, defaultView, key, 3, true, false, true, false, false);
    keypressEvent[method]('keypress', true, true, defaultView, key, 3, true, false, true, false, false);
    inputEvent[method]('input', true, true, defaultView, key, 3, true, false, true, false, false);
    keyupEvent[method]('keyup', true, true, defaultView, key, 3, true, false, true, false, false);

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
    function pressNextKey(keyIndex, callback){
        var nextKey = String(keys).charAt(keyIndex);

        if(nextKey === ''){
            return callback(null, getDocument(context).activeElement);
        }

        pressKey(context, nextKey, keys.slice(0, keyIndex + 1), function() {
            setTimeout(function(){
                pressNextKey(keyIndex + 1, callback);
            }, 10);
        });
    }

    var keysPressed = righto(pressNextKey, 0);

    return callback ? keysPressed(callback) : keysPressed;
}

function typeInto(context, description, type, value, callback) {
    var focused = righto(focus, context, description, type);
    var keysPressed = righto(pressKeys, context, value, righto.after(focused));

    return callback ? keysPressed(callback) : keysPressed;
}

function checkMatchValue(targetValue, value){
    if(value instanceof RegExp){
        return targetValue && targetValue.match(value);
    }

    return targetValue && targetValue.toLowerCase().trim() === value.toLowerCase();
}

function getElementVisibleText(element){
    return Array.from(element.childNodes).map(node => {
        if(node.nodeType !== 3){
            return getElementVisibleText(node);
        }

        if(node.textContent) {
            return node.textContent;
        }

        return '';
    })
    .flat()
    .join('');
}

function matchAttributes(element, value){
    if(
        checkMatchValue(element.getAttribute('title'), value) ||
        checkMatchValue(element.getAttribute('placeholder'), value) ||
        checkMatchValue(element.getAttribute('aria-label'), value) ||
        element.tagName === 'IMG' && checkMatchValue(element.getAttribute('alt'), value) ||
        checkMatchValue(element.value, value)
    ) {
        return 1;
    }
}

function matchTextContent(element, value){
    if(
        checkMatchValue(element.textContent, value) &&
        checkMatchValue(getElementVisibleText(element), value)
    ){
        return 1;
    }
}

function matchBesideLabels(element, value){
    if(
        element.previousElementSibling &&
        element.previousElementSibling.matches(types.label.join()) &&
        checkMatchValue(getElementVisibleText(element.previousElementSibling), value)
    ) {
        return 4;
    }
}

function isTextNode(node){
    return node.nodeType === 3;
}

function matchDirectChildTextNodes(element, value){
    var directChildText = Array.from(element.childNodes)
        .filter(isTextNode)
        .map(textNode => textNode.textContent)
        .join('');

    if(checkMatchValue(directChildText, value)){
        return  2;
    }
}

function matchDecendentLabels(element, value){
    if(
        findMatchingElements(
            value,
            Array.from(element.childNodes).filter(node =>
                node.matches &&
                node.matches(types.label.join())
            )
        ).length
    ){
        return 3
    }
}

function matchLabelFor(element, value){
    var name = element.getAttribute('name');

    if(
        name &&
        findMatchingElements(
            value,
            getDocument(element).querySelectorAll('label[for="' + name + '"]')
        ).length
    ){
        return 3
    }
}

function matchElementValue(element, value) {
    return (
        // This check is fast, so we optimize by checking it first
        matchAttributes(element, value) ||
        (
            matchTextContent(element, value) ||
            matchDirectChildTextNodes(element, value) ||
            matchLabelFor(element, value) ||
            matchDecendentLabels(element, value) ||
            matchBesideLabels(element, value)
        )
    );
}

function findMatchingElements(value, elementsList) {
    return Array.prototype.slice.call(elementsList)
        .map(function(element) {
            var weighting = matchElementValue(element, value);
            if(weighting){
                return [weighting, element]
            };
        })
        .filter(result => result)
        .sort((a, b) => a[0] - b[0])
        .map(result => result [1]);
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

function findAll(context, description, type, callback){
    var elementTypes = types[type];

    var results = righto.from(null).get(() => {
        if(!elementTypes) {
            return righto.fail(new Error(type + ' is not a valid ui type'));
        }

        var elements = Array.from(getDocument(context).querySelectorAll(elementTypes))

        if(!elements.length) {
            return righto.fail(new Error(noElementOfType + type));
        }

        return findMatchingElements(description, elements)
            .sort(function(a, b){
                var aTypeIndex = elementTypes.findIndex(type => a.matches(type));
                var bTypeIndex = elementTypes.findIndex(type => b.matches(type));
                aTypeIndex = aTypeIndex < 0 ? Infinity : aTypeIndex;
                bTypeIndex = bTypeIndex < 0 ? Infinity : bTypeIndex;
                return aTypeIndex - bTypeIndex;
            })
            .sort(function(a, b){
                return a.contains(b) ? 1 : b.contains(a) ? -1 : 0;
            })
    })

    return callback ? results(callback) : results;
}

function find(context, description, type, callback) {
    var elements = righto(findAll, context, description, type);

    var result = elements.get(elements => {
        if(!elements.length){
            return righto.fail(new Error('element was not found matching "' + description + '"'));
        }

        return elements;
    });

    return callback ? result(callback) : result;
}

function get(context, description, type, callback) {
    var elements = righto(find, context, description, type);

    var result = elements.get(elements => {
        if(elements.length > 1) {
            return righto.fail(new Error('More than one element was found matching "' + description + '"'));
        }

        return elements[0]
    })

    return callback ? result(callback) : result;
}

function setValue(context, description, type, value, callback) {
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
    var clickTargets = righto(findAll, context, description, type);
    var clickedElement = clickTargets.get(elements => {
        var sorted = elements.sort(function(a, b) {
            return getElementClickWeight(b) - getElementClickWeight(a);
        })

        var element = sorted[0];

        if(!element) {
            return righto.fail(new Error('could not find clickable element matching "' + description + '"'));
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

    return callback ? clickedElement(callback) : clickedElement;
}

function focus(context, description, type, callback) {
   var elements = righto(findAll, context, description, type)

   var focuesdElement = elements.get(elements => {
        var result = elements
            .sort(function(a, b) {
                return getElementValueWeight(b) - getElementValueWeight(a);
            })
            .shift();

        if(!result) {
            return righto.fail(new Error('element was not found matching "' + description + '"'));
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
        .find(option => matchElementValue(option, label));

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
    var focusedElement = righto(focus, context, description, type);
    var valueChangedElement = focusedElement.get(element => {
        if(
            element.nodeName === 'INPUT' && ~nonTextInputs.indexOf(element.type) ||
            element.nodeName === 'SELECT' ||
            element.hasAttribute('contenteditable')
        ){
            return righto(changeNonTextInput, element, value);
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

function waitFor(context, description, type, timeout, callback){
    var startTime = Date.now();

    function retry(callback){
        var foundElements = righto.handle(righto(get, context, description, type), (error, callback) => callback()).get(element => {
            if(!element){
                if(Date.now() - startTime > timeout){
                    return righto.fail(new Error(`Timed out attempting to find element matching "${description}"`));
                }

                var wait = righto(callback => setTimeout(callback, 10));

                return righto(retry, righto.after(wait));
            }

            return element;
        });

        foundElements(callback);
    }

    var result = righto(retry);

    return callback ? result(callback) : result;
}

module.exports = {
    pressKey,
    pressKeys,
    findAll,
    find,
    get,
    click,
    typeInto,
    getFocusedElement,
    focus,
    changeValue,
    blur,
    waitFor
};
