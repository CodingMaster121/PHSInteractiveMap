const searchAPIUrl = "https://anonymouscoder777.pythonanywhere.com/search";
const developerMode = true;
const minLatitude = 39.142483;
const maxLatitude = 39.144609;
const minLongitude = -77.419817;
const maxLongitude = -77.418606;
var currentLatitude = 0;
var currentLongitude = 0;
var currentAltitude = 0;

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

async function runLiveSearch() {
    var room_value = document.getElementById("room_search");
    var search_filter = document.getElementById("search_type").value;
    var search_result_list = document.getElementById("search_result_list");
    var data_to_python = {"room_value": room_value.value, "search_filter": search_filter, "current_latitude": currentLatitude, "current_longitude": currentLongitude, "current_altitude": currentAltitude};

    search_result_list.innerHTML = "";
    const s = JSON.stringify(data_to_python);

    await fetch(searchAPIUrl, {
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
            console.log("Wow look at all that nice data! " + data["search_results"]);
            for(var i = 0; i < data["search_results"].length && i < 5; i++) {
                const buttonItem = document.createElement("button");
                const node = document.createTextNode(data["search_results"][i]["room_value"]);
                buttonItem.appendChild(node);
                search_result_list.appendChild(buttonItem);

                buttonItem.addEventListener("click", function() {
                    console.log("Value of Button: " + buttonItem.innerHTML);
                    room_value.value = buttonItem.innerHTML;
                    search_result_list.innerHTML = "";
                });

                console.log(data["search_results"][i]["room_value"]);
                console.log(data["search_results"][i]["distance"]);
            }
        })
}

function verifyUser() {

}