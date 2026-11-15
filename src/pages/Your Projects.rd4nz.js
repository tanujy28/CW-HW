import wixData from 'wix-data';

const COLLECTION = 'Projects';
let debounceTimer;
let searchWord;

export function input_keyPress(event) { // onKeyPress for the search input
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => filter($w('#input').value), 200);
}

function filter(search) {
  if (searchWord === search) return;
  searchWord = search;
  $w('#dataset3').setFilter(wixData.filter().contains('title', search));
}

const empty = v => v === '' || v === null || v === undefined;

function removeItem(itemId) {
  wixData.remove(COLLECTION, itemId).catch((err) => console.log(err));
}

$w.onReady(() => {
  $w('#button9').onClick(() => {
    $w('#input').value = undefined;
    searchWord = '';
    $w('#dataset3').setFilter(wixData.filter());
    $w('#button9').hide();
  });

  // One item handler: only one onItemReady can be active, so all three buttons are set here
  $w('#repeater1').onItemReady(($item, itemData) => {
    if (empty(itemData.image)) $item('#button13').hide(); else $item('#button13').show();
    if (empty(itemData.document)) $item('#button14').hide(); else $item('#button14').show();
    $item('#button15').onClick(() => removeItem(itemData._id));
  });
});
