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
    const roomValue = document.getElementById("room_search");
    var searchType = document.getElementById("search_type").value;
    var roomSearch = document.getElementById("room_search");

    if(searchType == "room_number") {
        roomSearch.type = "number";
    } else {
        roomSearch.type = "text";
    }

    roomValue.value = "";
}

function runLiveSearch() {
    var newQueue = searchUpdateQueue;
    var roomValue = document.getElementById("room_search");
    var searchFilter = document.getElementById("search_type").value;
    var searchResultList = document.getElementById("search_result_list");
    var dataToPython = {"floor": currentFloor, "room_value": room_value.value, "search_filter": search_filter, "current_latitude": currentLatitude, "current_longitude": currentLongitude};

    searchUpdateQueue++;

    setTimeout(function() {
        searchResultList.innerHTML = "";
        const s = JSON.stringify(dataToPython);

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

                if(searchFilter == "room_name" || searchFilter == "room_number") {
                    node = document.createTextNode(data["search_results"][i]["room_value"]);
                } else {
                    node = document.createTextNode(data["search_results"][i]["teacher"]);
                }

                buttonItem.appendChild(node);
                searchResultList.appendChild(buttonItem);

                buttonItem.addEventListener("click", function() {
                    roomValue.value = buttonItem.innerHTML;
                    searchResultList.innerHTML = "";
                });
            }
        });

        searchUpdateQueue--;
    }, (((searchUpdateQueue - 1) * searchCooldown) + 100));
}

function changeCurrentFloor(floor) {
    const floor1Element = document.getElementById("floor_1");
    const floor2Element = document.getElementById("floor_2");

    currentFloor = floor;
    if(currentFloor == 1) {
        floor1Element.style.backgroundColor = "darkgray";
        floor2Element.style.backgroundColor = "lightgray";
    } else {
        floor1Element.style.backgroundColor = "lightgray";
        floor2Element.style.backgroundColor = "darkgray";
    }
}

async function saveLocation() {
    if(developerMode) {
        var roomValue = document.getElementById("room_search").value;
        var searchFilter = document.getElementById("search_type").value;
        var dataToPython = {"room_value": roomValue, "search_filter": searchFilter, "current_latitude": currentLatitude, "current_longitude": currentLongitude};

        const s = JSON.stringify(dataToPython);

        await fetch(saveLocationUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: s
        });
    }
}