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

function pressKey(context, key, fullValue, done) {
    var defaultView = getDocument(context).defaultView;
    var element = getDocument(context).activeElement;

    if(arguments.length < 3){
        done = fullValue;
        fullValue = element.value + key;
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
    element.value = fullValue;
    element.dispatchEvent(keypressEvent);
    element.dispatchEvent(inputEvent);
    element.dispatchEvent(keyupEvent);

    return done ? done(null, element) : righto.from(element);
}

function pressKeys(context, keys, done) {
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

    return done ? keysPressed(done) : keysPressed;
}

function typeInto(context, value, type, text, done) {
    var focused = righto(focus, context, value, type);
    var keysPressed = righto(pressKeys, context, text, righto.after(focused));

    return done ? keysPressed(done) : keysPressed;
}

function getLocation(context, done) {
    var result = righto.from(getDocument(context).defaultView.location);

    return done ? result(done) : result;
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

function findAll(context, value, type, done){
    var elementTypes = types[type];

    var results = righto.from(null).get(() => {
        if(!elementTypes) {
            return righto.fail(new Error(type + ' is not a valid ui type'));
        }

        var elements = Array.from(getDocument(context).querySelectorAll(elementTypes))

        if(!elements.length) {
            return righto.fail(new Error(noElementOfType + type));
        }

        return findMatchingElements(value, elements)
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

    return done ? results(done) : results;
}

function find(context, value, type, done) {
    var elements = righto(findAll, context, value, type);

    var result = elements.get(elements => {
        if(!elements.length){
            return righto.fail(new Error('"' + value + '" was not found'));
        }

        return elements;
    });

    return done ? result(done) : result;
}

function get(context, value, type, done) {
    var elements = righto(find, context, value, type);

    var result = elements.get(elements => {
        if(elements.length > 1) {
            return righto.fail(new Error('More than one "' + value + '" was found'));
        }

        return elements[0]
    })

    return done ? result(done) : result;
}

function setValue(value, type, text, done) {
    var focused = righto(focus, context, value, type);
    var valueSet = focused.get(target => {
        target.value = text;
        return target;
    })

    return done ? valueSet(done) : valueSet;
}

function wait(time, done) {
    setTimeout(done, time || 0);
}

function click(context, value, type, done) {
    var clickTargets = righto(findAll, context, value, type);
    var clickedElement = clickTargets.get(elements => {
        var sorted = elements.sort(function(a, b) {
            return getElementClickWeight(b) - getElementClickWeight(a);
        })

        var element = sorted[0];

        if(!element) {
            return done(new Error('could not find clickable element matching "' + value + '"'));
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

    return done ? clickedElement(done) : clickedElement;
}

function focus(context, value, type, done) {
   var elements = righto(findAll, context, value, type)

   var focuesdElement = elements.get(elements => {
        var result = elements
            .sort(function(a, b) {
                return getElementValueWeight(b) - getElementValueWeight(a);
            })
            .shift();

        result.focus();

        return result;
   });

    return done ? focuesdElement(done) : focuesdElement;
}

function changeInputValue(element, value, done){
    var defaultView = getDocument(element).defaultView;

    var inputEvent = new defaultView.KeyboardEvent('input');
    var method = 'initKeyboardEvent' in inputEvent ? 'initKeyboardEvent' : 'initKeyEvent';

    inputEvent[method]('input', true, true, defaultView, null, 3, true, false, true, false, false);
    element.value = value;

    element.dispatchEvent(inputEvent);
    element.blur();

    var changeEvent = document.createEvent('HTMLEvents');
    changeEvent.initEvent('change', false, true);
    element.dispatchEvent(changeEvent);

    done(null, element);
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

function changeNonTextInput(element, text, done){
    if(element.hasAttribute('contenteditable')){
        return changeContenteditableValue(element, text, done)
    }

    var value = null;

    if(element.type in typeEncoders){
        value = typeEncoders[element.type](text, element);
    } else {
        value = text;
    }
    return changeInputValue(element, value, done);
}

function changeValue(context, value, type, text, done) {

    focus(context, value, type, function(error, element) {
        if(error){
            return done(error);
        }

        if(
            element.nodeName === 'INPUT' && ~nonTextInputs.indexOf(element.type) ||
            element.nodeName === 'SELECT' ||
            element.hasAttribute('contenteditable')
        ){
            return changeNonTextInput(element, text, done);
        }

        pressKeys(context, text, function(error){
            if(error){
                return done(error);
            }

            element.blur();

            var changeEvent = document.createEvent('HTMLEvents');
            changeEvent.initEvent('change', false, true);
            element.dispatchEvent(changeEvent);

            done(null, element);
        });
    });
}

function blur(context, done) {
    var result = righto.from(null)
        .get(() => {
            var element = getDocument(context).activeElement;
            element.blur();
            return element
        });

    return done ? result(done) : result;
}

function waitFor(context, value, type, timeout, done){
    var startTime = Date.now();

    function retry(done){

        var foundElements = righto.handle(righto(get, context, value, type), (error, done) => done()).get(element => {
            if(!element){
                if(Date.now() - startTime > timeout){
                    return righto.fail(new Error('Timeout finding ' + value));
                }

                var wait = righto(done => setTimeout(done, 10));

                return righto(retry, righto.after(wait));
            }

            return element;
        });

        foundElements(done);
    }

    var result = righto(retry);

    return done ? result(done) : result;
}

module.exports = {
    pressKey,
    pressKeys,
    getLocation,
    findAll,
    find,
    get,
    click,
    typeInto,
    focus,
    changeInputValue,
    changeValue,
    blur,
    waitFor
};
