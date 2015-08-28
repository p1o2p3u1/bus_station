from flask import g
import time


def save_user_job(username, user_id, job_name):
    """
    save the test job for the user
    :param user_id: id of the user
    :param job_name: name of this test job
    :return: id of this test job
    """
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    sql = "insert into job (time, username, userid, jobname) values (%s, %s, %s, %s)"
    data = (now, username, user_id, job_name)
    g.cursor.execute(sql, data)  # people say that this can prevent sql injection
    return g.cursor.lastrowid


def query_jobs_by_user_id(user_id):
    """
    query all the jobs for a specific user
    :param user_id: the id of the user
    :return: list of jobs
    """
    sql = "select id, userid, username, time, jobname from job where userid = %s order by time desc"
    data = (user_id, )
    g.cursor.execute(sql, data)
    rows = g.cursor.fetchall()
    return rows


def query_reports_by_job_id(job_id):
    """
    just like the function name..
    :param job_id: id of the job
    :return: list of reports for a specific job
    """
    sql = "select id, job_id, filename, version, line, exec, miss, cov_result" \
          " from report where job_id = %s"
    data = (job_id,)
    g.cursor.execute(sql, data)
    rows = g.cursor.fetchall()
    for row in rows:
        row['line'] = row['line'].split(',')
        row['exec'] = row['exec'].split(',')
        row['miss'] = row['miss'].split(',')
    return rows


def query_reports_by_job_ids(job_ids):
    """
    just like the function name
    :param job_ids: list of job id
    :return: list of reports
    """
    sql = "select id, job_id, filename, version, source, line, exec, miss, cov_result" \
          " from report where job_id in (%s)"
    in_args = ', '.join(map(lambda x: '%s', job_ids))
    sql %= in_args
    g.cursor.execute(sql, job_ids)
    rows = g.cursor.fetchall()
    for row in rows:
        row['line'] = row['line'].split(',')
        row['exec'] = row['exec'].split(',')
        row['miss'] = row['miss'].split(',')
    return rows


def query_reports_by_user_id(user_id):
    """
    just like the function name
    :param user_id: id of the user
    :return: all of reports for a specific user
    """
    jobs = query_jobs_by_user_id(user_id)
    job_ids = map(lambda x: x['id'], jobs)
    result = query_reports_by_job_ids(job_ids)
    return result


def query_all_jobs():
    """
    I'm the boss, show me all your jobs
    :return:
    """
    sql = "select id, username, userid, time, jobname from job order by time desc"
    g.cursor.execute(sql)
    rows = g.cursor.fetchall()
    return rows


def save_reports(username, user_id, job_name, reports, auto_commit=True):
    """
    when user click 'save report' button
    :param user_id: id of the user
    :param job_name: name of the job
    :param reports: list of reports data
    :return: id of this job
    """
    # first get the id of this test job
    job_id = save_user_job(username, user_id, job_name)
    sql = "insert into report " \
          "(job_id, filename, version, source, line, exec, miss, cov_result) " \
          "values (%s, %s, %s, %s, %s, %s, %s, %s)"
    batch = []
    for report in reports:
        data = (job_id,
                report['filename'],
                report['version'],
                report['source'],
                ','.join(str(x) for x in report['line']),
                ','.join(str(x) for x in report['exec']),
                ','.join(str(x) for x in report['miss']),
                report['cov_result'])
        batch.append(data)
    g.cursor.executemany(sql, batch)
    if auto_commit:
        g.conn.commit()
    return job_id


def query_coverage_by_report_id(report_id):
    sql = "select source, exec, miss from report where id = %s"
    data = (report_id, )
    g.cursor.execute(sql, data)
    rows = g.cursor.fetchall()
    result = {}
    for row in rows:
        result['source'] = row['source']
        result['exec'] = row['exec'].split(',')
        result['miss'] = row['miss'].split(',')
    return result


def merge_jobs(user_id, job_name, job_list):
    """
    Merge those jobs into one new job.
    The username should be the combination of all the job's username
    :param name:
    :param merge_list:
    :return:
    """
    # merge the coverage result when (filename, version) are the same.
    reports = query_merge_result(job_list)
    sql = "select username from job where id in (%s)"
    in_args = ','.join(map(lambda x: '%s', job_list))
    sql %= in_args
    g.cursor.execute(sql, job_list)
    rows = g.cursor.fetchall()
    username = set()
    for row in rows:
        names = row['username'].split(',')
        username |= set(names)
    username = ','.join(x for x in username)
    job_id = save_reports(username, user_id, job_name, reports, auto_commit=True)
    job = query_job_by_job_id(job_id)
    return job


def query_merge_result(merge_list):
    """
    pre-check the merge result
    :param merge_list:
    :return:
    """
    reports = query_reports_by_job_ids(merge_list)
    # merge the coverage result when (filename, version) are the same.
    tmp = {}
    for report in reports:
        key = (report['filename'], report['version'])
        if key in tmp:
            # merge
            tmp[key]['exec'] = set(report['exec']) | tmp[key]['exec']
            tmp[key]['miss'] = set(report['line']) - tmp[key]['exec']
        else:
            tmp[key] = {
                "line": set(report['line']),
                "filename": report['filename'],
                "version": report['version'],
                "exec": set(report['exec']),
                "source": report['source'],
                "miss": report['miss']
            }
    result = []
    for _, val in tmp.iteritems():
        t = {
            'filename': val['filename'],
            'version': val['version'],
            'source': val['source'],
            'line': list(val['line']),
            'exec': list(val['exec']),
            'miss': list(val['miss'])
        }
        if len(t['line']) == 0:
            t['cov_result'] = 1
        else:
            t['cov_result'] = float(len(t['exec'])) / len(t['line'])
        result.append(t)
    return result


def query_job_by_job_id(job_id):
    sql = "select id, userid, username, time, jobname from job where id=%s"
    data = (job_id, )
    g.cursor.execute(sql, data)
    rows = g.cursor.fetchall()
    if len(rows) == 0:
        return None
    return rows[0]
