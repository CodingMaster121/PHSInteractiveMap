from flask import Flask, render_template, request, json
import os
import math

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


@app.route('/settings.html')
def settings():
    return render_template('settings.html')


@app.route('/search', methods=['POST'])
def search():
    output = request.get_json()

    site_root = os.path.realpath(os.path.dirname(__file__))
    json_url = os.path.join(site_root, "static", "locations.json")
    data = json.load(open(json_url))

    results = {"search_results": []}

    search_filter = output["search_filter"]
    search_value = str(output["room_value"])
    latitude = output["current_latitude"]
    longitude = output["current_longitude"]
    altitude = output["current_altitude"]

    if search_filter == "room_number":
        for location in data["locations"]:
            temp_location = location
            location_room_value = str(location["room_value"])
            if len(search_value) != 0 and location_room_value[:len(search_value)] == search_value:
                latitude_diff = abs(latitude - location["latitude"])
                longitude_diff = abs(longitude - location["longitude"])
                altitude_diff = 0
                if altitude is not None:
                    altitude_diff = abs(altitude - location["altitude"])

                temp_location["distance"] = math.sqrt((latitude_diff ** 2) + (longitude_diff ** 2) + (altitude_diff ** 2))

                location_placed = False
                search_results = results["search_results"]
                if len(search_results) > 0:
                    for i in range(len(search_results) - 1):
                        if search_results[i]["distance"] < temp_location["distance"] < search_results[i + 1]["distance"]:
                            search_results.insert(i + 1, temp_location)
                            location_placed = True

                if not location_placed:
                    if search_results[len(search_results) - 1] < temp_location:
                        search_results.append(temp_location)
                    else:
                        search_results.insert(0, temp_location)

        output["room_value"] = output["room_value"] + "A"
    elif search_filter == "room_name":
        output["room_value"] = output["room_value"] + "B"
    else:
        output["room_value"] = output["room_value"] + "C"

    return json.dumps(results)

