import wixData from 'wix-data';

let debounceTimer;
let searchWord;

export function search_keyPress(event) { // onKeyPress for the search input
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => filter($w('#search').value), 300);
}

function filter(search) {
  if (searchWord === search) return;
  searchWord = search;
  $w('#dataset1').setFilter(search ? wixData.filter().contains('title', search) : wixData.filter());
  if (search) $w('#button12').show(); else $w('#button12').hide();
}

const empty = v => v === '' || v === null || v === undefined;

$w.onReady(() => {
  // Clear search
  $w('#button12').onClick(() => {
    $w('#search').value = undefined;
    searchWord = '';
    $w('#dataset1').setFilter(wixData.filter());
    $w('#button12').hide();
  });

  // One item handler: only one onItemReady can be active, so both buttons are set here
  $w('#repeater1').onItemReady(($item, itemData) => {
    if (empty(itemData.image)) $item('#button13').hide(); else $item('#button13').show();
    if (empty(itemData.document)) $item('#button14').hide(); else $item('#button14').show();
  });
});
