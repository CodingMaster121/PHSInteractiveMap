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
    altitude = output["current_altitude"]

    if search_filter == "room_number" or search_filter == "room_name":
        for location in location_data["locations"]:
            temp_location = location
            location_room_value = str(location["room_value"])
            if len(search_value) != 0 and location_room_value[:len(search_value)].lower() == search_value.lower():
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
                    if len(search_results) == 0 or search_results[len(search_results) - 1]["distance"] < temp_location["distance"]:
                        search_results.append(temp_location)
                    else:
                        search_results.insert(0, temp_location)
    else:
        for row in teacher_data:
            teacher = row[0]
            search_results = results["search_results"]
            if teacher.lower() != "teacher" and teacher[:len(search_value)] == search_value:
                search_results.append(teacher)

    return json.dumps(results)

