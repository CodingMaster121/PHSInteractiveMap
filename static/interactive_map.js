// const baseUrl = "https://codingmaster121.github.io/search"
const searchAPIUrl = "http://anonymouscoder777.pythonanywhere.com/search"

function runPythonScript() {
    var room_value = document.getElementById("room_search").value;
    var search_filter = document.getElementById("search_type").value;
    var data_to_python = {"room_value": room_value, "search_filter": search_filter};

    if(event.key==='Enter') {
        const s = JSON.stringify(data_to_python);

        alert("Request is currently sending the following: " + s)

        fetch(searchAPIUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: s
        })
            .then(function (response) {
                return response.json();
            })
            .then(function(data) { alert("Wow look at all that nice data! " + data) })

        alert("Request successfully sent");
    }
}

function verifyUser() {

}