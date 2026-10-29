import wixData from 'wix-data';

let debounceTimer;

export function search_keyPress(event) { //enable onKeypress for input form

    $w("#search").value;

    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
    }
    debounceTimer = setTimeout(() => {
        filter($w("#search").value); //ID of input form
    }, 200);

}

let searchWord;

function filter(search) {
    if (searchWord !== search) {
        $w("#dataset1").setFilter(wixData.filter().contains('title', search));
        searchWord = search;
    }
}

$w.onReady(() => {

    $w('#button12').onClick(() => {

        $w("#search").value = undefined
        $w("#dataset1").setFilter(wixData.filter())

        $w("#button12").hide();

    })
})

$w.onReady(function () {
    $w('#dataset1').onReady(() => {
        $w('#repeater1').onItemReady(($item, itemData) => {
            let sTitle = itemData.image;
            if (sTitle === "" || sTitle === null || sTitle === undefined) {
                $item("#button13").hide();
            } else {
                $item("#button13").show();
            }
        })
    })

});

$w.onReady(function () {
    $w('#dataset1').onReady(() => {
        $w('#repeater1').onItemReady(($item, itemData) => {
            let sTitle = itemData.document;
            if (sTitle === "" || sTitle === null || sTitle === undefined) {
                $item("#button14").hide();
            } else {
                $item("#button14").show();
            }
        })
    })

});