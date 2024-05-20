const searchAPIUrl = "https://anonymouscoder777.pythonanywhere.com/search";
const saveLocationUrl = "https://anonymouscoder777.pythonanywhere.com/savelocation";
const developerMode = true;
const minLatitude = 39.142483;
const maxLatitude = 39.144609;
const minLongitude = -77.419817;
const maxLongitude = -77.418606;
var currentLatitude = 0;
var currentLongitude = 0;
var currentAltitude = 0;

setInterval(trackUserLocation, 1000);

function printLocation(position) {
    const mapWebpage = document.getElementById("map_object");
    const deniedAccess = document.getElementById("deny_access");

    currentLatitude = position.coords.latitude;
    currentLongitude = position.coords.longitude;
    currentAltitude = position.coords.altitude;

    if(developerMode || (minLatitude <= currentLatitude && currentLatitude <= maxLatitude) && (minLongitude <= currentLongitude && currentLongitude <= maxLongitude)) {
        mapWebpage.style.display = "block";
        deniedAccess.style.display = "none";
    } else {
        mapWebpage.style.display = "none";
        deniedAccess.style.display = "block";
    }

    document.getElementById("location").innerHTML = "Your Current Location: (" + currentLatitude + ", " + currentLongitude + ")" + " Altitude: " + currentAltitude;
    console.log("Your Current Location: (" + currentLatitude + ", " + currentLongitude + ")");
}

function trackUserLocation() {
    navigator.geolocation.getCurrentPosition(printLocation);
}

function runPythonScript() {
    var room_value = document.getElementById("room_search").value;
    var search_filter = document.getElementById("search_type").value;
    var data_to_python = {"room_value": room_value, "search_filter": search_filter};

    const s = JSON.stringify(data_to_python);

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
        .then(function(data) { alert("Wow look at all that nice data! " + data["room_value"]) })
}

function tempSaveToJSON() {
    var room_value = document.getElementById("room_search").value;
    var data_to_python = {"room_value": String(room_value), "latitude": currentLatitude,
        "longitude": currentLongitude, "altitude": currentAltitude};

    const s = JSON.stringify(data_to_python);

    alert("Attempting to send request");

    fetch(searchAPIUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: s
    }).then(function(response) {
        return response.json();
    }).then(function(data) {
        alert("JSON request was successfully delivered!");
    });

    alert("Request sent");
}

function verifyUser() {

}