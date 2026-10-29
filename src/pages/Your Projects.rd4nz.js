import wixData from 'wix-data';

let debounceTimer;

export function input_keyPress(event) { //enable onKeypress for input form

    $w("#input").value;

    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
    }
    debounceTimer = setTimeout(() => {
        filter($w("#input").value); //ID of input form
    }, 200);

}

let searchWord;

function filter(search) {
    if (searchWord !== search) {
        $w("#dataset3").setFilter(wixData.filter().contains('title', search)); // ID of the dataset
        searchWord = search;
    }
}

$w.onReady(() => {

    $w('#button9').onClick(() => {

        $w("#input").value = undefined
        $w("#dataset3").setFilter(wixData.filter())

        $w("#button9").hide();

    })
})

$w.onReady(function () {
    $w('#dataset3').onReady(() => {
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
    $w('#dataset3').onReady(() => {
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

const mycollection = "Projects";

$w("#repeater1").onItemReady(($item, itemData, index)=>{
    $item("#button15").onClick(()=>{removeItem(itemData._id)})
})

const removeItem = (itemId) => {
    wixData.remove(mycollection, itemId)
        .then((results) => {
            console.log(results); //see item below
        })
        .catch((err) => {
            console.log(err);
        });

}

