
from flask import Flask, \
    render_template, \
    request, session, \
    redirect, \
    url_for

app = Flask(__name__)
app.secret_key = 'hi09jh123oi3tt0w^%@#*%^(GU)*UOVI&TD'

@app.route("/")
def index():
    if 'username' not in session:
        return redirect(url_for('login'))
    username = session['username']
    return render_template('index.html', name=username)

@app.route("/login.html")
def login():
    return render_template('login.html')

@app.route("/login", methods=['POST'])
def check_login():
    username = request.form['username']
    if not username or len(username) == 0:
        return "username should not empty"
    print "login with username", username
    session['username'] = username
    return redirect(url_for('index'))

@app.route("/logout")
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route("/report.html")
def report():
    return "report"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8889, debug=True)