const spawner = require('child_process').spawn;

function runPythonScript() {
    var room_value = document.getElementById("room_search").value;
    var search_filter = document.getElementById("search_type").value;
    var data_to_python = [room_value, search_filter];

    if(event.key==='Enter') {
        const python_process = spawner('python', ['./python/test.py', JSON.stringify(data_to_python)]);

        python_process.stdout.on('data', (data) => {
            alert("Data has been received");
        });
    }
}