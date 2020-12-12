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

test('automage.get - select a heading', async t => {
    t.plan(1);

    var window = await loadWindow();

    var pageHeading = await automage.get(window.document.body, 'My test page', 'heading');

    t.ok(pageHeading);
});

test('automage.get - if a single matching element isn\'t found, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.get(window.document.body, 'I don\'t exist', 'heading');
    } catch (error) {
        t.equal(error.message, 'element was not found matching "I don\'t exist"');
    }
});

test('automage.click - click a button', async t => {
    t.plan(1);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI', 'button');

    var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

    t.ok(newHeading);
});

test('automage.click - if a single matching element isn\'t found, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.click(window.document.body, 'I don\'t exist', 'button');
    } catch (error) {
        t.equal(error.message, 'could not find clickable element matching "I don\'t exist"');
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
        t.equal(error.message, 'element was not found matching "I don\'t exist"');
    }
});

test('automage.waitFor - wait for element', async t => {
    t.plan(1);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI eventually', 'button');
    var newHeading = await automage.waitFor(window.document.body, 'New Async UI', 'heading', 1000);

    t.ok(newHeading);
});

test('automage.waitFor - if a matching element isn\'t found, an error is thrown', async t => {
    t.plan(1);

    var window = await loadWindow();

    try {
        await automage.waitFor(window.document.body, 'New Async UI', 'heading', 100);
    } catch (error) {
        t.equal(error.message, 'Timed out attempting to find element matching "New Async UI"');
    }
});

test('automage.pressKey - type into the current element with focus', async t => {
    t.plan(5);

    var window = await loadWindow();

    // JSDom doesn't implement autofocus
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

    // JSDom doesn't implement autofocus
    window.document.querySelector('body').focus();

    var focuesedElement = await automage.pressKey(window.document.body, 'a');

    t.equal(focuesedElement.value, undefined);
});

test('automage.pressKeys - type into the current element with focus', async t => {
    t.plan(13);

    var window = await loadWindow();

    // JSDom doesn't implement autofocus
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

    // JSDom doesn't implement autofocus
    window.document.querySelector('body').focus();

    var focuesedElement = await automage.pressKeys(window.document.body, 'abc');

    t.equal(focuesedElement.value, undefined);
});

test('automage.getFocusedElement - find the element with focus', async t => {
    t.plan(1);

    var window = await loadWindow();

    // JSDom doesn't implement autofocus
    var element = window.document.querySelector('[autofocus]');
    element.focus();

    var newFocuesedElement = await automage.getFocusedElement(window.document.body);

    t.equal(newFocuesedElement, element, 'previously focused element lost focus');
});

test('automage.blur - clear focus from the element with focus', async t => {
    t.plan(1);

    var window = await loadWindow();

    // JSDom doesn't implement autofocus
    var element = window.document.querySelector('[autofocus]');
    element.focus();

    var previouslyFocuesedElement = await automage.blur(window.document.body);
    var newFocuesedElement = await automage.getFocusedElement(window.document.body);

    t.notEqual(newFocuesedElement, previouslyFocuesedElement, 'previously focused element lost focus');
});
