
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

