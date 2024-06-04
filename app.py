from flask import Flask, render_template, request, json
import os
import math
import csv

app = Flask(__name__)


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
    period = output["current_period"]
    floor = output["current_floor"]

    if search_filter == "room_number" or search_filter == "room_name":
        for location in location_data["rooms"]:
            temp_location = location
            location_room_value = str(location["room_value"])

            # Checks if the beginning part of the search matches a location name and if it is on the same floor as
            # the user and will get the distance using longitude and latitude and sort the search results based on that
            if len(search_value) != 0 and location_room_value[:len(search_value)].lower() == search_value.lower():
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

            # Organizes the search list so that the current floor results are first
            i = 0
            place_at_end = []
            curr_search_results = results["search_results"]
            while i < len(curr_search_results):
                floor_number = curr_search_results[i]["floor_number"]
                if floor_number != floor:
                    place_at_end.append(curr_search_results[i])
                    curr_search_results.pop(i)
                else:
                    i += 1

            curr_search_results += place_at_end
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
    floor = output["current_floor"]
    mobility_accommodations = output["mobility_accommodations"]

    """
    # Testing Variables
    search_filter = "room_number"
    room_value = "2523"
    period = 1
    latitude = 39.142784987
    longitude = -77.419350719
    floor = 1
    mobility_accommodations = False
    """

    # Gets the destination room based on the search filter
    room_found = False
    if search_filter == "teacher_name":
        for row in teacher_data:
            teacher = row[0]
            if teacher.lower() != "teacher" and teacher.lower() == room_value.lower():
                if row[period] != "" and period != 0:
                    directions["destination"] = row[period]
                    room_value = row[period]
                    room_found = True
    else:
        if search_filter == "room_number":
            first_word_room_data = [str(room["room_value"]).split(" ")[0] for room in rooms]
            actual_room_data = [str(room["room_value"]).lower()for room in rooms]
            if room_value.lower() in first_word_room_data:
                first_word_room_data_index = first_word_room_data.index(room_value)
                directions["destination"] = actual_room_data[first_word_room_data_index]
                room_value = actual_room_data[first_word_room_data_index]
                room_found = True
        else:
            room_data = [str(room["room_value"]).lower() for room in rooms]
            if room_value.lower() in room_data:
                directions["destination"] = room_value
                room_found = True

        print(directions["destination"])

    if not room_found:
        return directions
    else:
        try:
            # Changes the node map options available depending on whether the user has a mobility accommodation
            map_nodes = node_map["map_nodes"]
            path_endpoints = location_data["path_endpoints"]
            i = 0
            while i < len(map_nodes):
                node = map_nodes[i]
                name = str(node["room_name"]).lower()
                if not mobility_accommodations:
                    if "ramp" in name or "elevator" in name:
                        map_nodes.pop(i)
                    else:
                        paths = node["paths"]
                        j = 0
                        while j < len(paths):
                            path_name = str(paths[j]["target_name"]).lower()
                            if "ramp" in path_name or "elevator" in path_name:
                                paths.pop(j)
                            else:
                                j += 1
                        i += 1
                else:
                    if "stairs" in name and "intersection" not in name:
                        map_nodes.pop(i)
                    else:
                        paths = node["paths"]
                        j = 0
                        while j < len(paths):
                            path_name = str(paths[j]["target_name"]).lower()
                            if "stairs" in path_name and "intersection" not in path_name:
                                paths.pop(j)
                            else:
                                j += 1
                        i += 1

            # Will also change the path endpoints which will be used for later
            k = 0
            while k < len(path_endpoints):
                endpoint_room = str(path_endpoints[k]["room_value"]).lower()
                if not mobility_accommodations:
                    if "ramp" in endpoint_room or "elevator" in endpoint_room:
                        path_endpoints.pop(k)
                    else:
                        k += 1
                else:
                    if "stairs" in endpoint_room:
                        path_endpoints.pop(k)
                    else:
                        k += 1

            # Omits this certain pathway since it contains stairs
            extra_removal = [["ISP Hub Hallway Intersection L", 1518], ["ISP Hub", "Cafeteria"]]
            if mobility_accommodations:
                node_names = [map_node["room_name"] for map_node in map_nodes]
                for removal in extra_removal:
                    first_removal_index = node_names.index(removal[1])
                    second_removal_index = node_names.index(removal[0])
                    first_removal_paths = map_nodes[first_removal_index]["paths"]
                    second_removal_paths = map_nodes[second_removal_index]["paths"]
                    first_removal_path_name = [first_removal_path["target_name"] for first_removal_path in first_removal_paths]
                    second_removal_path_name = [second_removal_path["target_name"] for second_removal_path in second_removal_paths]
                    first_removal_path_index = first_removal_path_name.index(removal[0])
                    second_removal_path_index = second_removal_path_name.index(removal[1])
                    first_removal_paths.pop(first_removal_path_index)
                    second_removal_paths.pop(second_removal_path_index)

            # Gets the closest location to the current one
            minimum_distance = math.inf
            start = "0"
            path_intersections = location_data["path_intersections"]
            room_points = location_data["rooms"]
            all_location_points = path_intersections + path_endpoints + room_points
            for location_point in all_location_points:
                location_point_latitude = location_point["latitude"]
                location_point_longitude = location_point["longitude"]
                distance = math.sqrt(((location_point_latitude - latitude) ** 2) + ((location_point_longitude - longitude) ** 2))
                if distance < minimum_distance:
                    minimum_distance = distance
                    start = str(location_point["room_value"]).lower()

            destination = str(room_value).lower()
            room_names = [str(room_point["room_value"]).lower() for room_point in room_points]
            destination_index = room_names.index(destination)
            destination_item = room_points[destination_index]
            destination_floor = destination_item["floor_number"]
            destination_latitude = destination_item["latitude"]
            destination_longitude = destination_item["longitude"]
            route = [[start], [destination]]

            # If the floor is not equivalent to the destination floor, it is split up so that it gets directions for each floor separately
            if floor != destination_floor:
                min_distance_to_destination = math.inf
                first_endpoint = None
                for path_endpoint in path_endpoints:
                    if path_endpoint["floor_number"] == destination_floor and "ramp" not in str(path_endpoint["room_value"]).lower():
                        path_endpoint_latitude = path_endpoint["latitude"]
                        path_endpoint_longitude = path_endpoint["longitude"]
                        distance_to_destination = math.sqrt(((destination_latitude - path_endpoint_latitude) ** 2) + ((destination_longitude - path_endpoint_longitude) ** 2))
                        if distance_to_destination < min_distance_to_destination:
                            min_distance_to_destination = distance_to_destination
                            first_endpoint = path_endpoint["room_value"]

                floor_transitions = node_map["floor_transitions"]
                for floor_transition in floor_transitions:
                    if first_endpoint in floor_transition:
                        floor_transition_index = floor_transitions.index(floor_transition)
                        if floor == 1:
                            route[0].append(str(floor_transitions[floor_transition_index][1]).lower())
                            route[1].insert(0, str(floor_transitions[floor_transition_index][0]).lower())
                        else:
                            route[0].append(str(floor_transitions[floor_transition_index][0]).lower())
                            route[1].insert(0, str(floor_transitions[floor_transition_index][1]).lower())

            unseen_nodes_2 = node_map["map_nodes"].copy()

            final_track_path = []
            # Modified Djikstra's Algorithm
            for i in range(len(route[0])):
                shortest_distance = {}
                track_predecessor = {}
                directions["directions"] = []
                unseen_nodes = node_map["map_nodes"]
                track_path = []
                infinity = math.inf
                starting_point = route[0][i]
                ending_point = route[1][i]

                if i == 1:
                    unseen_nodes = unseen_nodes_2

                for node in unseen_nodes:
                    shortest_distance[str(node["room_name"]).lower()] = infinity

                shortest_distance[starting_point] = 0
                current_room_values = [str(room["room_name"]).lower() for room in unseen_nodes]
                start_index = current_room_values.index(starting_point.lower())

                if i == 0:
                    directions["start_direction"] = unseen_nodes[start_index]["start_direction"]

                while unseen_nodes:
                    room_values = [str(room["room_name"]).lower() for room in unseen_nodes]
                    min_distance_node = None

                    for node in unseen_nodes:
                        room_name = str(node["room_name"]).lower()
                        if min_distance_node is None:
                            min_distance_node = room_name
                        elif shortest_distance[room_name] < shortest_distance[min_distance_node]:
                            min_distance_node = room_name

                    min_distance_node_index = room_values.index(min_distance_node)
                    path_options = unseen_nodes[min_distance_node_index]["paths"]

                    for path in path_options:
                        child_node = str(path["target_name"]).lower()
                        weight = path["distance"]

                        if weight + shortest_distance[min_distance_node] < shortest_distance[child_node]:
                            shortest_distance[child_node] = weight + shortest_distance[min_distance_node]
                            track_predecessor[child_node] = min_distance_node

                    unseen_nodes.pop(room_values.index(min_distance_node))

                current_node = ending_point
                while current_node != starting_point:
                    track_path.insert(0, current_node)
                    current_node = track_predecessor[current_node]

                track_path.insert(0, starting_point)
                final_track_path += track_path

                if shortest_distance[ending_point] != infinity:
                    print("Shortest distance is: " + str(shortest_distance[ending_point]))
                    print("Optimal path is: " + str(final_track_path))

            print(final_track_path)
            for i in range(len(final_track_path)):
                point_info = None
                print(i)
                if i == 0:
                    point_info = {
                        "direction": "none",
                        "point_name": str(final_track_path[0])
                    }
                elif ("stairs" in final_track_path[i - 1] and "stairs" in final_track_path[i]) or ("elevator" in final_track_path[i - 1] and "elevator" in final_track_path[i]):
                    node_map_names = [str(path["room_name"]).lower() for path in map_nodes_list]
                    print(node_map_names)
                    print(str(final_track_path[i]).lower())
                    location_point_index = node_map_names.index(str(final_track_path[i]).lower())
                    print(map_nodes_list[location_point_index])
                    point_info = {
                        "direction": map_nodes_list[location_point_index]["start_direction"],
                        "point_name": str(map_nodes_list[location_point_index]["room_name"])
                    }
                else:
                    node_map_names = [str(path["room_name"]).lower() for path in map_nodes_list]
                    location_point_index = node_map_names.index(final_track_path[i - 1])
                    location_point = map_nodes_list[location_point_index]
                    path_targets = [str(point["target_name"]).lower() for point in location_point["paths"]]
                    path_target_index = path_targets.index(final_track_path[i])
                    target_info = location_point["paths"][path_target_index]
                    point_info = {
                        "direction": target_info["direction"],
                        "point_name": str(target_info["target_name"]),
                        "enter_perspective": target_info["enter_perspective"]
                    }

                directions["directions"].append(point_info)

            print(directions["directions"])
            return directions
        except ValueError:
            return directions
        except KeyError:
            return directions


@app.route('/updateDirection', methods=['POST'])
def update_guide():
    output = request.get_json()
    landmark_points = output["landmark_points"]
    current_latitude = output["current_latitude"]
    current_longitude = output["current_longitude"]
    current_floor = output["current_floor"]

    site_root = os.path.realpath(os.path.dirname(__file__))
    location_json_url = os.path.join(site_root, "static", "locations.json")
    location_data = json.load(open(location_json_url))
    all_location_data = location_data["path_intersections"] + location_data["path_endpoints"] + location_data["rooms"]
    location_room_names = []

    for location1 in all_location_data:
        location_room_names.append(str(location1["room_value"]).lower())

    """
    current_latitude = 39.142784987
    current_longitude = -77.419350719
    landmark_points = ['Main to Science Building Hallway Intersection', '1523', 'Stairs (2nd Floor Science Building Near Entrance)', '2523']
    """

    minimum_distance = math.inf
    max_distance_from_destination = 0.00005
    closest_room = None
    destination_reached = False
    for landmark_point in landmark_points:
        landmark_point_index = landmark_points.index(landmark_point)
        location_index = location_room_names.index(str(landmark_point).lower())
        location = all_location_data[location_index]
        location_latitude = location["latitude"]
        location_longitude = location["longitude"]
        location_floor = location["floor_number"]

        current_to_location_distance = math.sqrt(((location_latitude - current_latitude) ** 2) + ((location_longitude - current_longitude) ** 2))
        if current_to_location_distance < minimum_distance and current_floor == location_floor:
            closest_room = landmark_point
            minimum_distance = current_to_location_distance

        if landmark_point_index == len(landmark_points) - 1 and current_to_location_distance < max_distance_from_destination:
            destination_reached = True

    current_step = landmark_points.index(closest_room)
    if destination_reached:
        current_step += 1

    color_directions = {"color_directions": []}
    for i in range(len(landmark_points)):
        if i >= current_step:
            color_directions["color_directions"].append({"landmark_point": landmark_points[i], "color": "black"})
        else:
            color_directions["color_directions"].append({"landmark_point": landmark_points[i], "color": "gray"})

    return color_directions


# Temp Functions
# Helps to auto collect the location and put it in the locations.json file
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


def check_node_map(floor):
    site_root = os.path.realpath(os.path.dirname(__file__))
    node_map_json_url = os.path.join(site_root, "static", "node_map.json")
    location_json_url = os.path.join(site_root, "static", "locations.json")
    location_data = json.load(open(location_json_url))
    node_map = json.load(open(node_map_json_url))
    points_forgotten = []

    path_intersections = location_data["path_intersections"]
    path_endpoints = location_data["path_endpoints"]
    rooms = location_data["rooms"]
    all_location_data = path_intersections + path_endpoints + rooms

    map_nodes = node_map["map_nodes"]
    for location in all_location_data:
        if location["floor_number"] == floor:
            room_value = location["room_value"]
            room_found = False
            for node in map_nodes:
                if room_value == node["room_name"]:
                    room_found = True

            if not room_found:
                points_forgotten.append(room_value)

    print("Here are the forgotten nodes: " + str(points_forgotten))

# Commented for execution purposes
# calculate_distance()
# generate_directions()
# check_node_map(1)
# check_node_map(2)
# update_guide()
