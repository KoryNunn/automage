var test = require('tape');
var automage = require('../');
var { JSDOM } = require('jsdom');

async function loadWindow () {
    var dom = await JSDOM.fromFile('test/index.html', {
        pretendToBeVisual: true,
        runScripts: 'dangerously'
    })

    return dom.window;
}

test('automage - available methods', async t => {
    t.plan(13);

    t.ok(automage.pressKey, '(context, description, type, key[, callback]) press a key');
    t.ok(automage.pressKeys, '(context, description, type, keys[, callback]) press many keys');
    t.ok(automage.findAll, '(context, description, type[, timeout, callback]) find all matching elements with a semantic selector sorted by type');
    t.ok(automage.find, '(context, description, type[, timeout, callback]) find all matching element with a semantic selector and matching type');
    t.ok(automage.get, '(context, description, type[, timeout, callback]) find exactly one matching element with a semantic selector and matching type');
    t.ok(automage.click, '(context, description, type[, timeout, callback]) click exactly one matching element with a semantic selector');
    t.ok(automage.typeInto, '(context, description, type, keys[, timeout, callback]) type into exactly one matching element with a semantic selector');
    t.ok(automage.getFocusedElement, '(context[, callback]) get the element that currently has focus in the document');
    t.ok(automage.focus, '(context, description, type[, timeout, callback]) focus an element matching a semantic selector');
    t.ok(automage.changeValue, '(context, description, type, value, [, timeout, callback]) change value of exactly one matching element with a semantic selector, then blur the focused element');
    t.ok(automage.blur, '(context[, callback]) blur the currently focused element');
    t.ok(automage.waitFor, '(context, description, type[, timeout, callback]) wait for exactly one matching element with a semantic selector, and custom timeout');
    t.ok(automage.isMissing, '(context, description, type[, timeout, callback]) ensure there are no matching elements with a semantic selector and matching type');
});

test('automage.get - select a heading', async t => {
    t.plan(1);

    var window = await loadWindow();

    var pageHeading = await automage.get(window.document.body, 'My test page', 'heading');

    t.ok(pageHeading, 'Page heading was found');
});

test('automage.get - select some text', async t => {
    t.plan(1);

    var window = await loadWindow();

    var pageHeading = await automage.get(window.document.body, 'My test page', 'text');

    t.ok(pageHeading, 'Page heading was found');
});

test('automage.get - cant select text within a [hidden]', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.get(window.document.body, 'My hidden text', 'text');
    } catch (error) {
        t.equal(error.message, 'text was not found matching "My hidden text" - Retrying timed out after 100ms')
    }
});

test('automage.get - cant select aria label within a [hidden]', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.get(window.document.body, 'hidden text', 'text');
    } catch (error) {
        t.equal(error.message, 'text was not found matching "hidden text" - Retrying timed out after 100ms')
    }
});

test('automage.get - select a heading by regex match', async t => {
    t.plan(1);

    var window = await loadWindow();

    var pageHeading = await automage.get(window.document.body, /My/, 'heading');

    t.ok(pageHeading, 'Page heading was found');
});

test('automage.get - select a section by heading match', async t => {
    t.plan(1);

    var window = await loadWindow();

    var coolContentSection = await automage.get(window.document.body, 'Cool content', 'section');

    t.ok(coolContentSection, 'Section was found');
});

test('automage.get - select a form by heading match', async t => {
    t.plan(1);

    var window = await loadWindow();

    var coolForm = await automage.get(window.document.body, 'My cool form', 'form');

    t.ok(coolForm, 'Form was found');
});

test('automage.get - if a single matching element isn\'t found, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.get(window.document.body, 'I don\'t exist', 'heading');
    } catch (error) {
        t.equal(error.message, 'heading was not found matching "I don\'t exist" - Retrying timed out after 100ms');
    }
});

test('automage.get - select the semantically correct element where multiple matched elements are part of the same component', async t => {
    t.plan(1);

    var window = await loadWindow();

    var field = await automage.get(window.document.body, 'Some Field', 'field');

    t.equal(field.tagName, 'INPUT', 'input field was returned');
});

test('automage.get - select the semantically correct field where the input has an associated label', async t => {
    t.plan(1);

    var window = await loadWindow();

    var field = await automage.get(window.document.body, 'Another Field', 'field');

    t.equal(field.tagName, 'INPUT', 'input field was returned');
});

test('automage.click - click a button', async t => {
    t.plan(1);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI', 'button');

    var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

    t.ok(newHeading, 'New heading was created upon button click');
});

test('automage.click - if a single matching element isn\'t found, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.click(window.document.body, 'I don\'t exist', 'button');
    } catch (error) {
        t.equal(error.message, 'Could not find clickable button matching "I don\'t exist" - Retrying timed out after 100ms');
    }
});

test('automage.typeInto - enter text', async t => {
    t.plan(1);

    var window = await loadWindow();

    var input = await automage.typeInto(window.document.body, 'Input with placeholder', 'field', 'some text');

    t.equal(input.value, 'some text');
});

test('automage.typeInto - if a single matching element isn\'t found, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.typeInto(window.document.body, 'I don\'t exist', 'field', 'some text');
    } catch (error) {
        t.equal(error.message, 'field was not found matching "I don\'t exist" - Retrying timed out after 100ms');
    }
});

test('automage.waitFor - wait for element', async t => {
    t.plan(1);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI eventually', 'button');
    var newHeading = await automage.waitFor(window.document.body, 'New Async UI', 'heading', 1000);

    t.ok(newHeading, 'New heading was found some time after button click');
});

test('automage.waitFor - if a matching element isn\'t found within the timeout, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.waitFor(window.document.body, 'New Async UI', 'heading', 100);
    } catch (error) {
        t.equal(error.message, 'heading was not found matching "New Async UI" - Retrying timed out after 100ms');
    }
});

test('automage.pressKey - type into the current element with focus', async t => {
    t.plan(5);

    var window = await loadWindow();

    var element = window.document.querySelector('[autofocus]');
    element.focus();

    element.addEventListener('keydown', () => t.pass('recieved keydown event'));
    element.addEventListener('keyup', () => t.pass('recieved keyup event'));
    element.addEventListener('keypress', () => t.pass('recieved keypress event'));
    element.addEventListener('input', () => t.pass('recieved input event'));

    var focuesedElement = await automage.pressKey(window.document.body, 'a');

    t.equal(focuesedElement.value, 'a');
});

test('automage.pressKey - if a non-input is focused, it does not set value', async t => {
    t.plan(1);

    var window = await loadWindow();

    window.document.querySelector('body').focus();

    var focuesedElement = await automage.pressKey(window.document.body, 'a');

    t.equal(focuesedElement.value, undefined);
});

test('automage.pressKeys - type into the current element with focus', async t => {
    t.plan(13);

    var window = await loadWindow();

    var element = window.document.querySelector('[autofocus]');
    element.focus();

    element.addEventListener('keydown', () => t.pass('recieved keydown event'));
    element.addEventListener('keyup', () => t.pass('recieved keyup event'));
    element.addEventListener('keypress', () => t.pass('recieved keypress event'));
    element.addEventListener('input', () => t.pass('recieved input event'));

    var focuesedElement = await automage.pressKeys(window.document.body, 'abc');

    t.equal(focuesedElement.value, 'abc');
});

test('automage.pressKeys - if a non-input is focused, it does not set value', async t => {
    t.plan(1);

    var window = await loadWindow();

    window.document.querySelector('body').focus();

    var focuesedElement = await automage.pressKeys(window.document.body, 'abc');

    t.equal(focuesedElement.value, undefined);
});

test('automage.getFocusedElement - find the element with focus', async t => {
    t.plan(1);

    var window = await loadWindow();

    var element = window.document.querySelector('[autofocus]');
    element.focus();

    var newFocuesedElement = await automage.getFocusedElement(window.document.body);

    t.equal(newFocuesedElement, element, 'previously focused element lost focus');
});

test('automage.blur - clear focus from the element with focus', async t => {
    t.plan(1);

    var window = await loadWindow();

    var element = window.document.querySelector('[autofocus]');
    element.focus();

    var previouslyFocuesedElement = await automage.blur(window.document.body);
    var newFocuesedElement = await automage.getFocusedElement(window.document.body);

    t.notEqual(newFocuesedElement, previouslyFocuesedElement, 'previously focused element lost focus');
});

test('automage.changeValue - set the value of an element', async t => {
    t.plan(13);

    var window = await loadWindow();

    var input = await automage.get(window.document.body, 'Input with placeholder', 'field');

    input.addEventListener('keydown', () => t.pass('recieved keydown event'));
    input.addEventListener('keyup', () => t.pass('recieved keyup event'));
    input.addEventListener('keypress', () => t.pass('recieved keypress event'));
    input.addEventListener('input', () => t.pass('recieved input event'));

    var input = await automage.changeValue(window.document.body, 'Input with placeholder', 'field', 'abc');

    t.equal(input.value, 'abc');
});

test('automage.changeValue - clear the value of an element', async t => {
    t.plan(6);

    var window = await loadWindow();

    var input = await automage.changeValue(window.document.body, 'Input with placeholder', 'field', 'abc');
    t.equal(input.value, 'abc');

    input.addEventListener('keydown', () => t.pass('recieved keydown event'));
    input.addEventListener('keyup', () => t.pass('recieved keyup event'));
    input.addEventListener('keypress', () => t.pass('recieved keypress event'));
    input.addEventListener('input', () => t.pass('recieved input event'));

    await automage.changeValue(window.document.body, 'Input with placeholder', 'field', '');
    t.equal(input.value, '');
});

test('automage.isMissing - ensure something isnt found by the end of the wait time', async t => {
    t.plan(2);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI', 'button');

    var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

    t.ok(newHeading, 'New heading was created upon button click');

    await automage.click(window.document.body, 'I remove UI', 'button');

    var headingIsMissing = await automage.isMissing(window.document.body, 'New Ui', 'heading');

    t.ok(headingIsMissing, 'Heading was removed');
});

test('automage.get - adjacent cells don\'t label each-other', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, 'foo 1 bar 1', 'cell');
    t.ok(foundElement, 'Element was found');
});

test('state filtering - enabled', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, 'enabled', 'Button with state', 'button');
    t.ok(foundElement, 'Element was found');
});

test('state filtering - disabled', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, 'disabled', 'Button with state', 'button');
    t.ok(foundElement, 'Element was found');
});

test('state filtering - first', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, 'first', 'Button with state', 'button');
    t.ok(foundElement, 'Element was found');
});

test('state filtering - last', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, 'last', 'Button with state', 'button');
    t.ok(foundElement, 'Element was found');
});

test('state filtering - 2nd', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, '2nd', 'Button with state', 'button');
    t.ok(foundElement, 'Element was found');
});

test('state filtering - 2nd last', async t => {
    t.plan(1);

    var window = await loadWindow();

    var foundElement = await automage.get(window.document.body, '2nd last', 'Button with state', 'button');
    t.ok(foundElement, 'Element was found');
});