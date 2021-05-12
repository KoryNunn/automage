var list = ['ul', 'ol', '[role=list]'];
var item = ['li', '[role=listitem]'];
var button = ['button', 'a', 'input[type=button]', '[role=button]', '[tabindex]'];
var link = ['a', 'button', 'input[type=button]', '[role=button]'];
var cell = ['td', 'th', '[role=cell]'];
var heading = ['[role=heading]', 'h1', 'h2', 'h3', 'h4'];
var header = ['header', '[role=banner]'];
var footer = ['footer'];
var image = ['img', 'svg', '[role=img]'];
var field = ['input', 'textarea', 'select', 'label', '[role=textbox]', '[contenteditable]'];
var section = ['section'];
var form = ['form', '[role=form]'];
var row = ['tr', '[role=row]'];
var article = ['[role=article]', 'article'];
var region = ['[role=region]'];
var dialog = ['[role=dialog]', '[role=alertdialog]', '[aria-modal]'];
var area = [section, form, article, region, dialog].flat();
var navigation = ['[role=navigation]'];
var all = ['*'];
var text = ['p', 'section', 'article', 'aside', 'header', 'footer', 'span', 'div', '*'];
var notLabel = [
        list,
        item,
        button,
        link,
        cell,
        row,
        article,
        region,
        dialog,
        navigation
    ]
    .flatMap(typeList => typeList.map(type => `:not(${type})`))
    .join('');
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
    area, // Logical UI area, eg form, section, etc..'.
    list, // Lists of items.
    navigation, // UI with a role of 'navigation'.
    all, // Any element. This is a very vague selector and usually wont do what you want.
    text // Things that usually hold text. This is a very vague selector and sometimes wont do what you want.
};