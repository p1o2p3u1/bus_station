from flask import Flask, \
    render_template, \
    request, session, \
    redirect, \
    url_for, \
    jsonify
from app.wraps.db_wrapper import request_db_connect
from app.dbs import report_db
from urllib import quote
import requests
import json

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
@request_db_connect
def show_report():
    if 'username' not in session:
        return redirect(url_for('login'))
    user_id = session['username']
    jobs = report_db.query_jobs_by_user_id(user_id)
    return render_template('report.html', jobs=jobs)


@app.route("/report", methods=['POST'])
@request_db_connect
def save_reports():
    if 'username' not in session:
        return redirect(url_for('login'))
    user_id = session['username']
    job_name = request.json['job_name']
    coverage = request.json['coverage']
    host = request.json['host']
    port = request.json['port']
    path = request.json['path']
    reports = []
    for filepath, cov in coverage.iteritems():
        filename = filepath.replace(path, '')
        report = {
            'filename': filename,
            'line': cov['code'],
            'exec': cov['executed'],
            'miss': cov['missed'],
            'cov_result': cov['coverage']
        }
        # get source text and revision
        url = "http://" + host + ":" + port + "/file?path=" + quote(filename, safe='')
        res = requests.get(url)
        text = json.loads(res.text)
        report['source'] = text['text']
        report['version'] = text['Revision']
        reports.append(report)
    job_id = report_db.save_reports(user_id, job_name, reports)
    session['job_id'] = job_id
    return json.dumps({
        "id": job_id,
        "success": True
    })


@app.route('/report_detail.html')
@request_db_connect
def report_detail():
    if 'username' not in session:
        return redirect(url_for('login'))
    job_id = request.args.get('id', None)
    if job_id is None:
        return "id should not be empty"
    else:
        reports = report_db.query_reports_by_job_id(job_id)
        print reports
        return render_template('report_detail.html', reports=reports)


@app.route('/report_cov')
@request_db_connect
def report_cov():
    if 'username' not in session:
        return redirect(url_for('login'))
    report_id = request.args.get('id', None)
    if report_id is None:
        return ""
    report = report_db.query_coverage_by_report_id(report_id)
    print report
    return jsonify(report)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8889, debug=True)
