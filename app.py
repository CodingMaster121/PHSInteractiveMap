from flask import Flask, render_template, request

app = Flask(__name__)


@app.route('/')
def index():
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
    output['room_value'] = output['room_value'] * 3
    return output
