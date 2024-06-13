const directionUrl = "https://anonymouscoder777.pythonanywhere.com/directions"
const searchAPIUrl = "https://anonymouscoder777.pythonanywhere.com/search";
const saveLocationUrl = "https://anonymouscoder777.pythonanywhere.com/saveLocation";
const directionUpdaterUrl = "https://anonymouscoder777.pythonanywhere.com/updateDirection";
const bellScheduleUrl = "https://defygg.github.io/poolesvilleschedule/data.json";

const searchCooldown = 100;
const developerMode = true;
const disableSaveLocation = true;
const simulationMode = false;
const displayLocation = false;

const minLatitude = 39.1423;
const maxLatitude = 39.144609;
const minLongitude = -77.419817;
const maxLongitude = -77.41845;
var currentLatitude = 0;
var currentLongitude = 0;
var currentFloor = 1;
var currentPeriod = 0;
var simIndex = 0;
var currentDirectionStep = -1;

var mobilityAccommodations = false;
var fetchSchedule = false;
var searchQueue = [];
var landmarkPoints = [];
var bellScheduleData = null;

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

    if(deniedPerms != null) {
        deniedPerms.style.display = "none";
        if(developerMode || (minLatitude <= currentLatitude && currentLatitude <= maxLatitude) && (minLongitude <= currentLongitude && currentLongitude <= maxLongitude)) {
            mapWebpage.style.display = "block";
            deniedAccess.style.display = "none";
        } else {
            mapWebpage.style.display = "none";
            deniedAccess.style.display = "block";
        }

        if(developerMode && !disableSaveLocation) {
            saveLocation.style.display = "block";
        } else {
            saveLocation.style.display  = "none";
        }

        if(simulationMode) {
            var coords = [
                {
                    "current_latitude": 39.142784987,
                    "current_longitude": -77.419350719
                }
            ];

            currentLatitude = coords[simIndex]["current_latitude"];
            currentLongitude = coords[simIndex]["current_longitude"];

            simIndex++;

            if(coords.length == simIndex) {
                simIndex = 0;
            }
        }

        if(displayLocation) {
            document.getElementById("location").innerHTML = "Your Current Location: (" + currentLatitude + ", " + currentLongitude + ")";
        } else {
            document.getElementById("location").innerHTML = "";
        }

        // Newly updated location will be used to update the directions if necessary
        const dataToPython = {
            "landmark_points": landmarkPoints,
            "current_latitude": currentLatitude,
            "current_longitude": currentLongitude,
            "current_floor": currentFloor
        }
        const s = JSON.stringify(dataToPython)

        console.log(landmarkPoints);

        fetch(directionUpdaterUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: s
        }).then(function(response) {
            return response.json();
        }).then(function(data) {
            var color_directions = data["color_directions"];
            var messageSpokenIndex = -1;
            var stepFound = false;
            for(var i = 0; i < color_directions.length; i++) {
                var location_point = color_directions[i];
                var direction_id = document.getElementById("direction_step_" + (i + 1));
                if(location_point["color"] == "black") {
                    direction_id.style.opacity = "1";
                    if(!stepFound) {
                        stepFound = true;
                        messageSpokenIndex = i;
                        console.log("Message spoken index" + messageSpokenIndex);
                    }
                } else {
                    direction_id.style.opacity = "0.5";
                }
            }

            if(currentDirectionStep != messageSpokenIndex && messageSpokenIndex != -1) {
                currentDirectionStep = messageSpokenIndex;
                var speaker = new SpeechSynthesisUtterance();
                var saying = document.getElementById("direction_step_" + (messageSpokenIndex + 1)).innerHTML;
                saying = (saying.split(" ").slice(1)).join(" ");
                saying = saying.replaceAll("<b>", "").replaceAll("</b>", '');
                console.log(saying);
                speaker.text = saying;
                window.speechSynthesis.speak(speaker);
            }
        });

        console.log("Your Current Location: (" + currentLatitude + ", " + currentLongitude + ")");
    }
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
    var searchType = document.getElementById("search_type");

    if(roomSearch != null) {
        if(!fetchSchedule) {
            fetch(bellScheduleUrl)
                .then(response => {
                return response.json();
            }).then(function(data) {
                bellScheduleData = data;
            });

            fetchSchedule = true;
        }

        const currentDate = new Date();
        const currentDate2 = new Date();
        var currentDay = currentDate.getDate();
        var currentMonth = currentDate.getMonth() + 1;
        var currentTime = (currentDate - currentDate2.setHours(0, 0, 0, 0))/1000;

        /*
        currentDay = 5;
        currentMonth = 6;
        currentTime = 0;
        */

        var dateString = currentMonth + "/" + currentDay;
        var scheduleOfDay = bellScheduleData[dateString];

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
            if(i == 0 && currentTime < scheduleStartTimes[0] - 2700){
                periodInfo = null;
                currentPeriod = "Before School"
                roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)"
                break;
            }

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
                    currentPeriod = "After School"
                    roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)"
                }
            }
        }

        currentTime += 100;

        var placeholderPeriod = null;
        if(periodInfo != null) {
            placeholderPeriod = periodInfo[1];
            currentPeriod = parseInt(placeholderPeriod.split(" ")[1]);
            roomSearch.placeholder = "Search"
        }

        if(isNaN(currentPeriod) && placeholderPeriod != null) {
            currentPeriod = placeholderPeriod;
            if(searchType.value == "teacher_name") {
                roomSearch.placeholder = "Search (Use Room Search Filter Instead of Teacher Filter)"
            }
        }

        if(isNaN(parseInt(currentPeriod))) {
            destination.innerHTML = "Destination (Currently " + currentPeriod.toString() + "): ";
        } else {
            destination.innerHTML = "Destination (Currently Period " + currentPeriod.toString() + "): ";
        }
    }
}

function runLiveSearch() {
    var roomValue = document.getElementById("room_search");
    var searchFilter = document.getElementById("search_type").value;
    var searchResultList = document.getElementById("search_result_list");
    var dataToPython = {
        "room_value": roomValue.value,
        "search_filter": searchFilter,
        "current_latitude": currentLatitude,
        "current_longitude": currentLongitude,
        "current_period": currentPeriod,
        "current_floor": currentFloor
    };

    // Search update queue used to prevent duplicate results from occurring
    searchQueue.push("Search Queue Pending");
    var currentLength = searchQueue.length;

    setTimeout(function() {
        if(currentLength != searchQueue.length) {
            return;
        }

        const s = JSON.stringify(dataToPython);

        // Sends a fetch request that will later receive information such as room or teacher to create the different search result items needed to make buttons
        fetch(searchAPIUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: s
        }).then(function (response) {
            return response.json();
        }).then(function(data) {
            console.log(data)

            searchResultList.innerHTML = "";
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
    }, searchCooldown);
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
    var dataToPython = {
        "current_period": currentPeriod,
        "current_latitude": currentLatitude,
        "current_longitude": currentLongitude,
        "current_floor": currentFloor,
        "room_value": roomSearch.value,
        "search_type": searchFilter,
        "mobility_accommodations": mobilityAccommodations
    };

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
        var startDirection = data["start_direction"];
        var directionsClass = document.getElementById("directions");
        directionsClass.innerHTML = "";

        console.log(directions);

        if(destination == null || directions.length <= 1) {
            // Helps to display to the user that directions cannot be accessed and reasons why the issue could be occurring
            landmarkPoints = [];
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

        // Filters the directions list so that it would only be based on where the user would turn
        var previousDirection = "";
        var previousDirectionIndex = 0;
        var displayedDirections = [];
        landmarkPoints = [directions[0]["point_name"]];
        for(var i = 0; i < directions.length; i++) {
            var location_point = directions[i];
            var currentDirection = location_point["direction"];
            if(currentDirection != previousDirection || i <= 1) {
                if (i == 1) {
                    if(currentDirection == startDirection || startDirection == "none") {
                        displayedDirections.push("Continue to walk straight towards <b>" + location_point["point_name"] + "</b>");
                        landmarkPoints.push(location_point["point_name"]);
                    } else {
                        console.log(startDirection);
                        console.log(currentDirection);
                        var rightToDown = startDirection == "right" && currentDirection == "down";
                        var downToLeft = startDirection == "down" && currentDirection == "left";
                        var leftToUp = startDirection == "left" && currentDirection == "up";
                        var upToRight = startDirection == "up" && currentDirection == "right";
                        const upToDown = startDirection == "up" && currentDirection == "down";
                        const rightToLeft = startDirection == "right" && currentDirection == "left";

                        if(rightToDown || downToLeft || leftToUp || upToRight || upToDown || rightToLeft) {
                            displayedDirections.push("Turn right towards <b>" + location_point["point_name"] + "</b> and walk forward");
                            landmarkPoints.push(location_point["point_name"]);
                        } else {
                            displayedDirections.push("Turn left towards <b>" + location_point["point_name"] + "</b> and walk forward");
                            landmarkPoints.push(location_point["point_name"]);
                        }
                    }
                }

                if(i > 1) {
                    var elevator = location_point["point_name"].indexOf("Elevator") != -1 && directions[i - 1]["point_name"].indexOf("Elevator") != -1;
                    var stairs = location_point["point_name"].indexOf("Stairs") != -1 && directions[i - 1]["point_name"].indexOf("Stairs") != -1 && location_point["point_name"].indexOf("Intersection") == -1 && directions[i - 1]["point_name"].indexOf("Intersection") == -1;

                    if(elevator || stairs) {
                        var newFloor = 0;
                        if(currentFloor == 1) {
                            if(elevator) {
                                displayedDirections.push("Take the elevator and go up to the 2nd floor. Switch to the floor 2 button so the website can continue guiding you. Continue to walk forward")
                                landmarkPoints.push(location_point["point_name"]);
                            } else {
                                displayedDirections.push("Take the stairs and go to the 2nd floor. Switch to the floor 2 button so the website can continue guiding you. Continue to walk forward")
                                landmarkPoints.push(location_point["point_name"]);
                            }
                        } else {
                            if(elevator) {
                                displayedDirections.push("Take the elevator and go down to the 1st floor. Switch to the floor 1 button so the website can continue guiding you. Continue to walk forward")
                                landmarkPoints.push(location_point["point_name"]);
                            } else {
                                displayedDirections.push("Take the stairs and go to the 1st floor. Switch to the floor 1 button so the website can continue guiding you. Continue to walk forward")
                                landmarkPoints.push(location_point["point_name"]);
                            }
                        }
                    } else {
                        var rightToDown = previousDirection == "right" && currentDirection == "down";
                        var downToLeft = previousDirection == "down" && currentDirection == "left";
                        var leftToUp = previousDirection == "left" && currentDirection == "up";
                        var upToRight = previousDirection == "up" && currentDirection == "right";
                        var upToDown = previousDirection == "up" && currentDirection == "down";
                        var rightToLeft = previousDirection == "right" && currentDirection == "left";

                        if(rightToDown || downToLeft || leftToUp || upToRight || upToDown || rightToLeft) {
                            displayedDirections.push("Turn right towards <b>" + location_point["point_name"] + "</b> and walk forward");
                            landmarkPoints.push(location_point["point_name"]);
                        } else {
                            displayedDirections.push("Turn left towards <b>" + location_point["point_name"] + "</b> and walk forward");
                            landmarkPoints.push(location_point["point_name"]);
                        }
                    }
                }

                if(i - previousDirectionIndex > 1) {
                    displayedDirections[displayedDirections.length - 2] += " until you reach <b>" + directions[i - 1]["point_name"] + "</b>";
                    landmarkPoints[landmarkPoints.length - 2] = directions[i - 1]["point_name"];
                }

                previousDirectionIndex = i;
                previousDirection = currentDirection;
            }

            if(i == directions.length - 1) {
                var enter_direction = location_point["enter_perspective"];
                if(enter_direction == "left" || enter_direction == "right") {
                    displayedDirections.push("Your destination should be on the " + location_point["enter_perspective"]);
                } else {
                    displayedDirections.push("Your destination should be in front of you")
                }

                if(i - previousDirectionIndex > 0) {
                    displayedDirections[displayedDirections.length - 2] += " until you reach <b>" + directions[i]["point_name"] + "</b>";
                    landmarkPoints[landmarkPoints.length - 1] = directions[i]["point_name"];
                }
            }
        }

        // Creates the directions that would be displayed on frontend
        for(var a = 1; a <= displayedDirections.length; a++) {
            var directionStep = document.createElement("p");
            directionStep.id = "direction_step_" + a;
            directionStep.innerHTML = a + ". " + displayedDirections[a - 1]
            directionsClass.appendChild(directionStep);
        }

        if(!landmarkPoints[landmarkPoints.length - 1].includes(String(roomSearch.value)) && searchFilter != "teacher_name") {
            landmarkPoints.push(roomSearch.value);
        }

        currentDirectionStep = -1;
        console.log(displayedDirections);
        console.log(landmarkPoints);
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

// Setting functions
// Pages are also changed after saving settings
function saveSettings() {
    var mobilityAccommodationElement = document.getElementById("mobility_accommodations");
    var saveSettingsButton = document.getElementById("save_settings");
    var settingsPage = document.getElementById("settings_page");
    var mapPage = document.getElementById("map_page");

    if(mobilityAccommodationElement.checked) {
        mobilityAccommodations = true;
        console.log("Mobility Accommodation is now set to true");
    } else {
        mobilityAccommodations = false;
        console.log("Mobility Accommodation is now set to false");
    }

    saveSettingsButton.style.opacity = "0.5";
    saveSettingsButton.disabled = true;
    saveSettingsButton.innerHTML = "Settings Saved";

    setTimeout(function() {
        mapPage.style.display = "block";
        settingsPage.style.display = "none";
    }, 1000);
}

function reconfigureSettings() {
    var settingsPage = document.getElementById("settings_page");
    var mapPage = document.getElementById("map_page");
    var saveSettingsButton = document.getElementById("save_settings");
    mapPage.style.display = "none";
    settingsPage.style.display = "block";
    saveSettingsButton.disabled = false;
    saveSettingsButton.style.opacity = "1";
    saveSettingsButton.innerHTML = "Save Settings";
}