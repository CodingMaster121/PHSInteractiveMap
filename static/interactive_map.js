const searchAPIUrl = "https://anonymouscoder777.pythonanywhere.com/search";
const saveLocationUrl = "https://anonymouscoder777.pythonanywhere.com/saveLocation";
const developerMode = true;
const minLatitude = 39.1423;
const maxLatitude = 39.144609;
const minLongitude = -77.419817;
const maxLongitude = -77.41845;
const searchCooldown = 150;
var currentLatitude = 0;
var currentLongitude = 0;
var searchUpdateQueue = 0;
var currentFloor = 1;

var locationSettings = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
}

navigator.geolocation.watchPosition(printLocation, printLocationError, locationSettings);


function printLocation(position) {
    const mapWebpage = document.getElementById("map_object");
    const deniedAccess = document.getElementById("deny_access");
    const deniedPerms = document.getElementById("denied_perms");
    const saveLocation = document.getElementById("save_location");

    currentLatitude = position.coords.latitude;
    currentLongitude = position.coords.longitude;

    deniedPerms.style.display = "none";
    if(developerMode || (minLatitude <= currentLatitude && currentLatitude <= maxLatitude) && (minLongitude <= currentLongitude && currentLongitude <= maxLongitude)) {
        mapWebpage.style.display = "block";
        deniedAccess.style.display = "none";
    } else {
        mapWebpage.style.display = "none";
        deniedAccess.style.display = "block";
    }

    if(developerMode) {
        saveLocation.style.display = "block";
    } else {
        saveLocation.style.display  = "none";
    }

    document.getElementById("location").innerHTML = "Your Current Location: (" + currentLatitude + ", " + currentLongitude + ")";
    console.log("Your Current Location: (" + currentLatitude + ", " + currentLongitude + ")");
}

function printLocationError(err) {
    const deniedPerms = document.getElementById("denied_perms");
    deniedPerms.style.display = "block";
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

function runLiveSearch() {
    var newQueue = searchUpdateQueue;
    var room_value = document.getElementById("room_search");
    var search_filter = document.getElementById("search_type").value;
    var search_result_list = document.getElementById("search_result_list");
    var data_to_python = {"room_value": room_value.value, "search_filter": search_filter, "current_latitude": currentLatitude, "current_longitude": currentLongitude};

    searchUpdateQueue++;

    setTimeout(function() {
        search_result_list.innerHTML = "";
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
            .then(function(data) {
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
    }, (((searchUpdateQueue - 1) * searchCooldown) + 25));
}

function changeCurrentFloor()

async function saveLocation() {
    if(developerMode) {
        var room_value = document.getElementById("room_search").value;
        var search_filter = document.getElementById("search_type").value;
        var data_to_python = {"room_value": room_value, "search_filter": search_filter, "current_latitude": currentLatitude, "current_longitude": currentLongitude};

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