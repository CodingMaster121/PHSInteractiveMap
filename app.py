from flask import Flask, render_template, request, json
import os
import math
import csv

app = Flask(__name__)
directions = {"destination": None, "directions": []}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/index.html')
def return_to_home():
    return render_template('index.html')


@app.route('/map.html')
def map():
    return render_template('map.html')


@app.route('/resources.html')
def resources():
    return render_template('resources.html')


@app.route('/settings.html')
def settings():
    return render_template('settings.html')


@app.route('/search', methods=['POST'])
def search():
    output = request.get_json()

    site_root = os.path.realpath(os.path.dirname(__file__))
    location_json_url = os.path.join(site_root, "static", "locations.json")
    teachers_csv_url = os.path.join(site_root, "static", "teachers.csv")
    location_data = json.load(open(location_json_url))
    teacher_data = csv.reader(open(teachers_csv_url))

    results = {"search_results": []}

    search_filter = output["search_filter"]
    search_value = str(output["room_value"])
    latitude = output["current_latitude"]
    longitude = output["current_longitude"]
    floor = output["floor"]
    period = output["current_period"]

    if search_filter == "room_number" or search_filter == "room_name":
        for location in location_data["rooms"]:
            temp_location = location
            location_room_value = str(location["room_value"])
            location_floor_num = location["floor_number"]

            # Checks if the beginning part of the search matches a location name and if it is on the same floor as
            # the user and will get the distance using longitude and latitude and sort the search results based on that
            if len(search_value) != 0 and location_room_value[:len(search_value)].lower() == search_value.lower() and floor == location_floor_num:
                latitude_diff = abs(latitude - location["latitude"])
                longitude_diff = abs(longitude - location["longitude"])
                temp_location["distance"] = math.sqrt((latitude_diff ** 2) + (longitude_diff ** 2))

                location_placed = False
                search_results = results["search_results"]
                if len(search_results) > 0:
                    for i in range(len(search_results) - 1):
                        if search_results[i]["distance"] < temp_location["distance"] < search_results[i + 1]["distance"]:
                            search_results.insert(i + 1, temp_location)
                            location_placed = True

                if not location_placed:
                    if len(search_results) == 0 or search_results[len(search_results) - 1]["distance"] < temp_location["distance"]:
                        search_results.append(temp_location)
                    else:
                        search_results.insert(0, temp_location)
    else:
        for row in teacher_data:
            teacher = row[0]
            search_results = results["search_results"]
            room_value = ""
            if teacher.lower() != "teacher" and teacher[:len(search_value)].lower() == search_value.lower():
                if row[period] != "" and period != 0:
                    room_value = row[period]
                else:
                    room_value = "Not Available"

                search_results.append({"teacher": teacher, "room": room_value})

    return json.dumps(results)


@app.route('/directions', methods=['POST'])
def generate_directions():
    output = request.get_json()

    site_root = os.path.realpath(os.path.dirname(__file__))
    location_json_url = os.path.join(site_root, "static", "locations.json")
    teachers_csv_url = os.path.join(site_root, "static", "teachers.csv")
    node_map_json_url = os.path.join(site_root, "static", "node_map.json")
    location_data = json.load(open(location_json_url))
    teacher_data = csv.reader(open(teachers_csv_url))
    node_map = json.load(open(node_map_json_url))
    map_nodes_list = node_map["map_nodes"].copy()

    directions = {"destination": None, "directions": []}
    rooms = location_data["rooms"]

    search_filter = output["search_type"]
    room_value = str(output["room_value"])
    period = output["current_period"]
    latitude = output["current_latitude"]
    longitude = output["current_longitude"]

    # Testing Variables
    """
    search_filter = "teacher_name"
    room_value = "Ackerman"
    period = 1
    latitude = 39.14274
    longitude = -77.41912
    """

    # Gets the destination room based on the search filter
    room_found = False
    if search_filter == "teacher_name":
        for row in teacher_data:
            teacher = row[0]
            if teacher.lower() != "teacher" and teacher.lower() == room_value.lower():
                if row[period] != "" and period != 0:
                    directions["destination"] = row[period]
                    room_found = True
    else:
        room_data = [str(room["room_value"]).lower() for room in rooms]
        if room_value.lower() in room_data:
            directions["destination"] = room_value
            room_found = True

    if not room_found:
        print("Hello")
        return directions
    else:
        # Gets the closest location to the current one
        minimum_distance = math.inf
        start = "0"
        path_intersections = location_data["path_intersections"]
        path_endpoints = location_data["path_endpoints"]
        room_points = location_data["rooms"]
        all_location_points = path_intersections + path_endpoints + room_points
        for location_point in all_location_points:
            location_point_latitude = location_point["latitude"]
            location_point_longitude = location_point["longitude"]
            distance = math.sqrt(((location_point_latitude - latitude) ** 2) + ((location_point_longitude - longitude) ** 2))
            if distance < minimum_distance:
                minimum_distance = distance
                start = str(location_point["room_value"]).lower()

        # Djikstra's Algorithm
        shortest_distance = {}
        track_predecessor = {}
        unseen_nodes = node_map
        infinity = math.inf
        track_path = []

        for node in unseen_nodes["map_nodes"]:
            shortest_distance[str(node["room_name"]).lower()] = infinity

        # Placeholder for actual current location
        start = "1639"
        shortest_distance[start] = 0

        while unseen_nodes["map_nodes"]:
            room_values = [str(room["room_name"]).lower() for room in unseen_nodes["map_nodes"]]
            min_distance_node = None

            for node in unseen_nodes["map_nodes"]:
                room_name = str(node["room_name"]).lower()
                if min_distance_node is None:
                    min_distance_node = room_name
                elif shortest_distance[room_name] < shortest_distance[min_distance_node]:
                    min_distance_node = room_name

            min_distance_node_index = room_values.index(min_distance_node)
            path_options = node_map["map_nodes"][min_distance_node_index]["paths"]

            for path in path_options:
                child_node = str(path["target_name"]).lower()
                weight = path["distance"]

                if weight + shortest_distance[min_distance_node] < shortest_distance[child_node]:
                    shortest_distance[child_node] = weight + shortest_distance[min_distance_node]
                    track_predecessor[child_node] = min_distance_node

            unseen_nodes["map_nodes"].pop(room_values.index(min_distance_node))

        destination_room_values = [str(room["room_name"]).lower() for room in map_nodes_list]
        destination_room_index = destination_room_values.index(room_value.lower())

        directions["directions"].append(str(destination_room_index))

        destination = str(room_value).lower()
        current_node = destination
        while current_node != start:
            try:
                track_path.insert(0, current_node)
                current_node = track_predecessor[current_node]
            except KeyError:
                print("Path is not reachable")

        track_path.insert(0, start)
        print(track_path)

        if shortest_distance[destination] != infinity:
            print("Shortest distance is: " + str(shortest_distance[destination]))
            print("Optimal path is: " + str(track_path))

        return directions


# Temp Functions
@app.route('/saveLocation', methods=['POST'])
def save_location():
    output = request.get_json()

    site_root = os.path.realpath(os.path.dirname(__file__))
    location_json_url = os.path.join(site_root, "static", "locations.json")
    location_data = json.load(open(location_json_url))

    location_data["rooms"].append({"floor_number": 1, "room_value": output["room_value"], "latitude": output["current_latitude"], "longitude": output["current_longitude"]})
    with open(location_json_url, "w") as f:
        json.dump(location_data, f, indent=2)

    return location_data


# Helps to auto calculate the distance between the current node to the target one
def calculate_distance():
    site_root = os.path.realpath(os.path.dirname(__file__))
    node_map_json_url = os.path.join(site_root, "static", "node_map.json")
    location_json_url = os.path.join(site_root, "static", "locations.json")
    location_data = json.load(open(location_json_url))
    node_map = json.load(open(node_map_json_url))

    path_intersections = [path_intersection["room_value"] for path_intersection in location_data["path_intersections"]]
    path_endpoints = [path_endpoint["room_value"] for path_endpoint in location_data["path_endpoints"]]
    rooms = [room["room_value"] for room in location_data["rooms"]]

    for node in node_map["map_nodes"]:
        room_name = node["room_name"]
        latitude = 0
        longitude = 0

        if room_name in path_intersections:
            path_intersection_index = path_intersections.index(room_name)
            location = location_data["path_intersections"][path_intersection_index]
            latitude = location["latitude"]
            longitude = location["longitude"]
        elif room_name in path_endpoints:
            path_endpoints_index = path_endpoints.index(room_name)
            location = location_data["path_endpoints"][path_endpoints_index]
            latitude = location["latitude"]
            longitude = location["longitude"]
        else:
            room_index = rooms.index(room_name)
            location = location_data["rooms"][room_index]
            latitude = location["latitude"]
            longitude = location["longitude"]

        for path in node["paths"]:
            path_target_name = path["target_name"]
            path_latitude = 0
            path_longitude = 0

            if path_target_name in path_intersections:
                path_intersection_index = path_intersections.index(path_target_name)
                location = location_data["path_intersections"][path_intersection_index]
                path_latitude = location["latitude"]
                path_longitude = location["longitude"]
            elif path_target_name in path_endpoints:
                path_endpoints_index = path_endpoints.index(path_target_name)
                location = location_data["path_endpoints"][path_endpoints_index]
                path_latitude = location["latitude"]
                path_longitude = location["longitude"]
            else:
                room_index = rooms.index(path_target_name)
                location = location_data["rooms"][room_index]
                path_latitude = location["latitude"]
                path_longitude = location["longitude"]

            path["distance"] = math.sqrt(((path_latitude - latitude) ** 2) + ((path_longitude - longitude) ** 2))

    with open("static/node_map.json", "w") as outfile:
        json.dump(node_map, outfile, indent=2)

    print("Updated node_map.json distances")


# Commented for execution purposes
# calculate_distance()
# generate_directions()
