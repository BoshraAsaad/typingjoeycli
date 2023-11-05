
let formData = new FormData();
formData.append('roomID', 'test');

const headers = {
    type: 'application/json',
};
let blob = new Blob([JSON.stringify({
    data:[
        {control:"button1"},
        {control: "button2"},
        {control: "button3"}
    ]
})], headers);

blob = new Blob([JSON.stringify("body")], headers);
let result = navigator.sendBeacon(url, blob);

async function putSomeData() {
    let db = await idb.open('db-name', 1, upgradeDB => upgradeDB.createObjectStore('objectStoreName', { autoIncrement: true }))

    let tx = db.transaction('objectStoreName', 'readwrite')
    let store = tx.objectStore('objectStoreName')

    await store.put({ firstname: 'John', lastname: 'Doe', age: 33 })

    await tx.complete
    db.close()
}

async function getAllData() {
    let db = await idb.open('db-name', 1)

    let tx = db.transaction('objectStoreName', 'readonly')
    let store = tx.objectStore('objectStoreName')

    // add, clear, count, delete, get, getAll, getAllKeys, getKey, put
    let allSavedItems = await store.getAll()

    console.log(allSavedItems)

    db.close()
}
