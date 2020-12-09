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
})

test('automage.click - click a button', async t => {
    t.plan(1);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI', 'button');

    var newHeading = await automage.get(window.document.body, 'New Ui', 'heading');

    t.ok(newHeading);
})

test('automage.typeInto - enter text', async t => {
    t.plan(1);

    var window = await loadWindow();

    var input = await automage.typeInto(window.document.body, 'Input with placeholder', 'field', 'some text');

    t.equal(input.value, 'some text');
})

test('automage.waitFor - wait for element', async t => {
    t.plan(1);

    var window = await loadWindow();

    await automage.click(window.document.body, 'I make UI eventually', 'button');
    var newHeading = await automage.waitFor(window.document.body, 'New Async UI', 'heading', 1000);

    t.ok(newHeading);
})