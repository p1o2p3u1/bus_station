
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/index.html")
def index():
    return render_template('index.html')

@app.route("/login.html")
def login():
    return render_template('login.html')

@app.route("/login", methods=['POST'])
def check_login():
    print request.form['username']
    return "True"

@app.route("/report.html")
def report():
    return "report"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8889, debug=True)