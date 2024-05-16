from flask import Flask, render_template, request

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/hello')
def hello():
    return "Hello World"

@app.route('/map', methods=['POST'])
def search():
    output = request.get_json()
    output['room_value'] = output['room_value'] * 3
    return output


app.run()
