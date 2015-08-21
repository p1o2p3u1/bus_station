#! /usr/bin/env python
# -*- coding: utf-8 -*-\

from flask import Flask, \
    render_template, \
    request, session, \
    redirect, \
    url_for, \
    jsonify
from app.wraps.db_wrapper import request_db_connect
from app.dbs import report_db
import app.configs as configs
from urllib import quote
import base64
import hashlib
import hmac
import requests
import json
import app.openid as openid

app = Flask(__name__)
app.secret_key = 'hi09jh123oi3tt0w^%@#*%^(GU)*UOVI&TD'
admins = configs.admins

@app.route("/")
def index():
    if not session.get('email'):
        return redirect(url_for('login'))
    username = session.get('fullname')
    userid = session.get('email')
    admin = session.get('admin')
    return render_template('index.html', name=username, userid=userid, admin=admin)


@app.route("/login")
def login():
    location, mac_key = openid.redirect_url(request.url_root, url_for('index'))
    session['mac_key'] = mac_key
    return redirect(location)


@app.route('/login_callback')
def login_callback():
    openid_response = dict(request.args)
    signed_content = []

    for k in openid_response['openid.signed'][0].split(","):
        response_data = openid_response["openid.%s" % k]
        signed_content.append("%s:%s\n" % (k, response_data[0]))

    signed_content = "".join(signed_content).encode("UTF-8")
    signed_content_sig = base64.b64encode(
        hmac.new(base64.b64decode(session.get('mac_key', '')),
                 signed_content, hashlib.sha256).digest())

    if signed_content_sig != openid_response['openid.sig'][0]:
        return render_template('error.html', message='Authentication failed')

    session.pop('mac_key', None)
    email = request.args.get('openid.sreg.email', '')
    fullname = request.args.get('openid.sreg.fullname', '')
    next_url = request.args.get('next', '/')
    if not email or not fullname:
        return render_template('error.html', message='Fail to get email and fullname')
    session['email'] = email
    session['fullname'] = fullname
    if email in admins:
        session['admin'] = True
    else:
        session['admin'] = False
    return redirect(next_url)


@app.route("/logout")
def logout():
    session.pop('fullname', None)
    session.pop('email', None)
    session.pop('admin', None)
    return redirect(url_for('login'))


@app.route("/report.html")
@request_db_connect
def show_report():
    if not session.get('email'):
        return redirect(url_for('login'))
    username = session['fullname']
    userid = session.get('email')
    admin = session.get('admin')
    if admin is True:
        jobs = report_db.query_all_jobs()
    else:
        jobs = report_db.query_jobs_by_user_id(userid)
    return render_template('report.html', jobs=jobs)


@app.route("/report", methods=['POST'])
@request_db_connect
def save_reports():
    if not session.get('email'):
        return redirect(url_for('login'))
    username = session['fullname']
    userid = session['email']
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
    job_id = report_db.save_reports(username, userid, job_name, reports)
    session['job_id'] = job_id
    return json.dumps({
        "id": job_id,
        "success": True
    })


@app.route('/report_detail.html')
@request_db_connect
def report_detail():
    if not session.get('email'):
        return redirect(url_for('login'))
    job_id = request.args.get('id', None)
    if job_id is None:
        return "id should not be empty"
    else:
        reports = report_db.query_reports_by_job_id(job_id)
        return render_template('report_detail.html', reports=reports)


@app.route('/report_cov')
@request_db_connect
def report_cov():
    if not session.get('email'):
        return redirect(url_for('login'))
    report_id = request.args.get('id', None)
    if report_id is None:
        return ""
    report = report_db.query_coverage_by_report_id(report_id)
    return jsonify(report)


@app.route('/merge', methods=['POST'])
@request_db_connect
def merge_jobs():
    if not session.get('email'):
        return redirect(url_for('login'))
    userid = session['email']
    merge_list = request.json['list']
    new_name = request.json['name']
    if merge_list is None or len(merge_list) == 0 or new_name is None:
        return jsonify({
            "success": False
        })
    result = report_db.merge_jobs(userid, new_name, merge_list)
    return jsonify({
        "success": True,
        "job": result
    })

@app.route('/check_merge')
@request_db_connect
def check_merge():
    if not session.get('email'):
        return redirect(url_for('login'))
    merge_list = request.args.get('list', None)
    if merge_list is None:
        return "invalid parameter"

    result = report_db.query_merge_result(merge_list.split(','))
    return jsonify({
        'result': result,
        'success': True
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", threaded=True, port=8889, debug=True)
