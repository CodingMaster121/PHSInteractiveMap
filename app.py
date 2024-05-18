from flask import Flask, render_template, request
import pandas as pd

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
    current_room_value = output["room_value"]
    search_filter = output["search_filter"]
    if search_filter == "teacher_name":
        output["room_value"] = output["room_value"] + "A"

    return output
