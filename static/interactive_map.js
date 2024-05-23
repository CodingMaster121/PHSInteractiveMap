const searchAPIUrl = "https://anonymouscoder777.pythonanywhere.com/search";
const saveLocationUrl = "https://anonymouscoder777.pythonanywhere.com/saveLocation";
const developerMode = true;
const minLatitude = 39.1423;
const maxLatitude = 39.144609;
const minLongitude = -77.419817;
const maxLongitude = -77.41845;
const searchCooldown = 1000;
var currentLatitude = 0;
var currentLongitude = 0;
var currentAltitude = 0;
var searchUpdateQueue = 0;

var locationSettings = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
}
navigator.geolocation.watchPosition(printLocation, printLocationError, locationSettings);

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

function printLocationError(err) {
    console.error(`ERROR(${err.code}): ${err.message}`);
}

function changeSearchType() {
    var searchType = document.getElementById("search_type").value;
    var roomSearch = document.getElementById("room_search");

    if(searchType == "room_number") {
        roomSearch.type = "number";
    } else {
        roomSearch.type = "text";
    }
}

async function runLiveSearch() {
    var newQueue = searchUpdateQueue;
    var room_value = document.getElementById("room_search");
    var search_filter = document.getElementById("search_type").value;
    var search_result_list = document.getElementById("search_result_list");
    var data_to_python = {"room_value": room_value.value, "search_filter": search_filter, "current_latitude": currentLatitude, "current_longitude": currentLongitude, "current_altitude": currentAltitude};

    search_result_list.innerHTML = "";
    const s = JSON.stringify(data_to_python);

    console.log("Number of Search Requests Waiting: " + searchUpdateQueue);

    setTimeout(newQueue * searchCooldown);
    searchUpdateQueue++;

    console.log("Fetching Request");

    await fetch(searchAPIUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: s
    })
        .then(async function (response) {
            return response.json();
        })
        .then(async function(data) {
            for(var i = 0; i < data["search_results"].length && i < 5; i++) {
                const buttonItem = document.createElement("button");
                var node = null;

                if(search_filter == "room_name" || search_filter == "room_number") {
                    node = document.createTextNode(data["search_results"][i]["room_value"]);
                } else {
                    node = document.createTextNode(data["search_results"][i]["teacher"]);
                }

                buttonItem.appendChild(node);
                search_result_list.appendChild(buttonItem);

                buttonItem.addEventListener("click", function() {
                    console.log("Value of Button: " + buttonItem.innerHTML);
                    room_value.value = buttonItem.innerHTML;
                    search_result_list.innerHTML = "";
                });
            }
        });
    searchUpdateQueue--;
}

async function saveLocation() {
    if(developerMode) {
        var room_value = document.getElementById("room_search").value;
        var search_filter = document.getElementById("search_type").value;
        var data_to_python = {"room_value": room_value, "search_filter": search_filter, "current_latitude": currentLatitude, "current_longitude": currentLongitude, "current_altitude": currentAltitude};

        const s = JSON.stringify(data_to_python);

        await fetch(saveLocationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: s
        });
    }
}