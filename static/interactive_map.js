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
var currentPeriod = 0;
// Temp Variable
var currentTime = 27000;

var locationSettings = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
}

navigator.geolocation.watchPosition(printLocation, printLocationError, locationSettings);
setInterval(checkBellSchedule, 500);

// Displays the latitude and longitude of the user and also denies access if outside school boundaries
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

// Changes the room number to number so that letters are not being used
function changeSearchType() {
    const roomValue = document.getElementById("room_search");
    var searchType = document.getElementById("search_type").value;
    var roomSearch = document.getElementById("room_search");
    var searchResultList = document.getElementById("search_result_list");

    if(searchType == "room_number") {
        roomSearch.type = "number";
    } else {
        roomSearch.type = "text";
    }

    roomValue.value = "";
    searchResultList.innerHTML = "";
}

function checkBellSchedule() {
    // Gets the current period of the day
    var roomSearch = document.getElementById("room_search");
    var destination = document.getElementById("map_destination");
    const url = "https://defygg.github.io/poolesvilleschedule/data.json";
    fetch(url)
        .then(response => {
        return response.json();
    }).then(function(data) {
        const currentDate = new Date();
        const currentDate2 = new Date();
        var currentDay = currentDate.getDate();
        var currentMonth = currentDate.getMonth() + 1;
        var currentTime2 = currentDate - currentDate2.setHours(0, 0, 0, 0);

        console.log(currentDay);
        console.log(currentMonth);
        console.log(currentTime2/2);

        currentMonth = 5;
        currentDay = 6;
        var dateString = currentMonth + "/" + currentDay;

        var scheduleOfDay = data[dateString];

        // If the day is a weekend or something, this search filter will not be effective
        if(scheduleOfDay == null) {
            roomSearch.placeholder = "Search (Use Room Search Filter Instead of This Filter)";
            return;
        }

        var scheduleType = scheduleOfDay[0];

        if(scheduleType == "No School") {
            roomSearch.placeholder = "Search (Use Room Search Filter Instead of This Filter)";
            return;
        }

        var schedule = scheduleOfDay[1];
        var scheduleStartTimes = Object.keys(schedule);
        var periodInfo = null;

        for(var i = 0; i < scheduleStartTimes.length; i++) {
            if(currentTime - scheduleStartTimes[i] < scheduleStartTimes[i + 1] - scheduleStartTimes[i] - 600) {
                periodInfo = schedule[scheduleStartTimes[i]];
                break;
            }

            if(i == scheduleStartTimes.length - 1){
                periodInfo = schedule[scheduleStartTimes[scheduleStartTimes.length - 1]];
                if(currentTime >= scheduleStartTimes[scheduleStartTimes.length - 1] - 600 && currentTime <= periodInfo[0]) {
                    console.log(currentTime);
                } else {
                    periodInfo = null;
                    currentPeriod = 0;
                    roomSearch.placeholder = "Search (Use Room Search Filter Instead of This Filter)"
                }
            }
        }

        currentTime += 100;

        if(periodInfo != null) {
            currentPeriod = parseInt(periodInfo[1].split(" ")[1]);
            roomSearch.placeholder = "Search"
        }

        if(isNaN(currentPeriod)) {
            currentPeriod = 0;
            roomSearch.placeholder = "Search (Use Room Search Filter Instead of This Filter)"
        }

        destination.innerHTML = "Destination (Currently for Period " + currentPeriod.toString() + "): ";
    });
}

function runLiveSearch() {
    var newQueue = searchUpdateQueue;
    var roomValue = document.getElementById("room_search");
    var searchFilter = document.getElementById("search_type").value;
    var searchResultList = document.getElementById("search_result_list");
    var dataToPython = {"floor": currentFloor, "room_value": roomValue.value, "search_filter": searchFilter, "current_latitude": currentLatitude, "current_longitude": currentLongitude, "current_period": currentPeriod};

    // Search update queue used to prevent duplicate results from occurring
    searchUpdateQueue++;

    setTimeout(function() {
        searchResultList.innerHTML = "";
        const s = JSON.stringify(dataToPython);

        setTimeout(function() {
            // Sends a fetch request that will later receive information such as room or teacher to create the different search result items needed to make buttons
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
                        var teacherInfo = data["search_results"][i]
                        var teacherRoom = "";

                        if(teacherInfo["room"] == "Not Available") {
                            teacherRoom = " (Not Currently in a Room)";
                        } else {
                            teacherRoom = " (Currently in Room " + teacherInfo["room"] + ")";
                        }

                        node = document.createTextNode(data["search_results"][i]["teacher"] + teacherRoom);
                    }

                    buttonItem.appendChild(node);
                    searchResultList.appendChild(buttonItem);

                    buttonItem.addEventListener("click", function() {
                        roomValue.value = buttonItem.innerHTML;

                        if(searchFilter == "teacher_name") {
                            roomValue.value = buttonItem.innerHTML.split(" ")[0];
                        }

                        searchResultList.innerHTML = "";
                    });
                }
            });

            searchUpdateQueue--;
        }, 50);
    }, (((searchUpdateQueue - 1) * searchCooldown) + 100));
}

// Changes the color of the buttons based on the new floor
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

// Temporary functions that stores new locations into the locations.json file
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