const directionUrl = "https://anonymouscoder777.pythonanywhere.com/directions"
const searchAPIUrl = "https://anonymouscoder777.pythonanywhere.com/search";
const saveLocationUrl = "https://anonymouscoder777.pythonanywhere.com/saveLocation";
const searchCooldown = 150;
const developerMode = true;
const disableSaveLocation = true;

const minLatitude = 39.1423;
const maxLatitude = 39.144609;
const minLongitude = -77.419817;
const maxLongitude = -77.41845;
var currentLatitude = 0;
var currentLongitude = 0;
var searchUpdateQueue = 0;
var currentFloor = 1;
var currentPeriod = 0;

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
    roomSearch.placeholder = "Search";
    searchResultList.innerHTML = "";
}

function checkBellSchedule() {
    // Gets the current period of the day
    var roomSearch = document.getElementById("room_search");
    var destination = document.getElementById("map_destination");
    var searchType = document.getElementById("search_type").value;

    const url = "https://defygg.github.io/poolesvilleschedule/data.json";
    fetch(url)
        .then(response => {
        return response.json();
    }).then(function(data) {
        if(searchType == "teacher_name") {
            const currentDate = new Date();
            const currentDate2 = new Date();
            var currentDay = currentDate.getDate();
            var currentMonth = currentDate.getMonth() + 1;
            var currentTime = (currentDate - currentDate2.setHours(0, 0, 0, 0))/1000;

            currentDay = 3;
            currentMonth = 6;
            currentTime = 36000;

            var dateString = currentMonth + "/" + currentDay;
            var scheduleOfDay = data[dateString];

            // If the day is a weekend or something, this search filter will not be effective
            if(scheduleOfDay == null) {
                roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)";
                return;
            }

            var scheduleType = scheduleOfDay[0];

            if(scheduleType == "No School") {
                roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)";
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

                        roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)"
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
                if(searchType == "teacher_name") {
                    roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)"
                }
            }

            destination.innerHTML = "Destination (Currently for Period " + currentPeriod.toString() + "): ";
        }
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
                        var firstWord = buttonItem.innerHTML.split(" ")[0];

                        if(searchFilter == "teacher_name") {
                            roomValue.value = firstWord;
                        } else {
                            // This will help ensure that rooms such as 1414 won't get cleared since they have letters in search
                            if(searchFilter == "room_number") {
                                if(!Number.isNaN(firstWord)) {
                                    roomValue.value = firstWord;
                                } else {
                                    roomValue.value = buttonItem.innerHTML;
                                }
                            } else {
                                roomValue.value = buttonItem.innerHTML;
                            }
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

function generateDirections() {
    var roomSearch = document.getElementById("room_search");
    var searchFilter = document.getElementById("search_type").value;
    var dataToPython = {"current_period": currentPeriod, "current_latitude": currentLatitude, "current_longitude": currentLongitude, "room_value": roomSearch.value, "search_type": searchFilter};
    const s = JSON.stringify(dataToPython);

    fetch(directionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: s
    }).then(function(response) {
        return response.json();
    }).then(function(data) {
        var destination = data["destination"];
        var directions = data["directions"];
        var startDirection = data["start_direction"]
        var directionsClass = document.getElementById("directions");

        directionsClass.innerHTML = "";

        if(destination == null || directions.length <= 1) {
            // Helps to display to the user that directions cannot be accessed and reasons why the issue could be occurring
            const textItem = document.createElement("p");
            var textNode = document.createTextNode("Unable to get directions to the room or teacher!");
            var textNode2 = document.createTextNode("Issues can include typing in the wrong room number, the room being unreachable, or no directions are required to get there!")
            var textNode3 = document.createTextNode("Please try again!")
            textItem.appendChild(textNode);
            textItem.appendChild(document.createElement("br"));
            textItem.appendChild(textNode2);
            textItem.appendChild(document.createElement("br"));
            textItem.appendChild(textNode3);
            directionsClass.appendChild(textItem);
            return;
        } else {
            const textItem = document.createElement("p");
            var textNode = document.createTextNode("Here are the directions to room " + destination + " from your current location:");
            textItem.appendChild(textNode);
            directionsClass.appendChild(textItem);
        }

        console.log(directions);
        console.log(startDirection);

        // Filters the directions list so that it would only be based on where the user would turn
        var previousDirection = "";
        var previousDirectionIndex = 0;
        var displayedDirections = [];
        for(var i = 0; i < directions.length; i++) {
            var location_point = directions[i];
            var currentDirection = location_point["direction"]
            if(currentDirection != previousDirection || i <= 1) {
                if (i == 1) {
                    if(currentDirection == directions[0]["direction"] || startDirection == "none") {
                        displayedDirections.push("Continue to walk straight towards " + location_point["point_name"]);
                    } else {
                        var rightToDown = previousDirection == "right" && currentDirection == "down";
                        var downToLeft = previousDirection == "down" && currentDirection == "left";
                        var leftToUp = previousDirection == "left" && currentDirection == "up";
                        var upToRight = previousDirection == "up" && currentDirection == "right"

                        if(rightToDown || downToLeft || leftToUp || upToRight) {
                            displayedDirections.push("Turn right towards " + location_point["point_name"] + " and walk forward");
                        } else {
                            displayedDirections.push("Turn left towards " + location_point["point_name"] + " and walk forward");
                        }
                    }
                }

                if(i > 1) {
                    var rightToDown = previousDirection == "right" && currentDirection == "down";
                    var downToLeft = previousDirection == "down" && currentDirection == "left";
                    var leftToUp = previousDirection == "left" && currentDirection == "up";
                    var upToRight = previousDirection == "up" && currentDirection == "right"

                    if(rightToDown || downToLeft || leftToUp || upToRight) {
                        displayedDirections.push("Turn right towards " + location_point["point_name"] + " and walk forward");
                    } else {
                        displayedDirections.push("Turn left towards " + location_point["point_name"] + " and walk forward");
                    }
                }

                if(i - previousDirectionIndex > 1) {
                    displayedDirections[displayedDirections.length - 2] += " until you reach " + directions[i - 1]["point_name"];
                }

                previousDirectionIndex = i;
                previousDirection = currentDirection;
            }

            if(i == directions.length - 1) {
                var enter_direction = location_point["enter_perspective"];
                if(enter_direction == "left" || enter_direction == "right") {
                    displayedDirections.push("Your destination should be on the " + location_point["enter_perspective"] + ".");
                } else {
                    displayedDirections.push("Your destination should be in front of you.")
                }

                if(i - previousDirectionIndex > 1) {
                    displayedDirections[displayedDirections.length - 2] += " until you reach " + directions[i]["point_name"];
                }
            }
        }

        // Creates the directions that would be displayed on frontend
        for(var a = 1; a <= displayedDirections.length; a++) {
            var directionStep = document.createElement("p");
            directionStep.id = "direction_step_" + a;
            var directionText = document.createTextNode(a + ". " + displayedDirections[a - 1]);
            directionStep.appendChild(directionText);
            directionsClass.appendChild(directionStep);
        }

        console.log(displayedDirections);
    });
}

// Temporary functions that stores new locations into the locations.json file
async function saveLocation() {
    var save_location = document.getElementById("save_location");
    if(developerMode && !disableSaveLocation) {
        save_location.style.display = "block";
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
    } else {
        save_location.style.display = "none";
    }
}