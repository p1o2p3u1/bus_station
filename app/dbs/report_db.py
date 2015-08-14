from flask import g
import time


def save_user_job(user_id, job_name):
    """
    save the test job for the user
    :param user_id: id of the user
    :param job_name: name of this test job
    :return: id of this test job
    """
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    sql = "insert into job (time, user_id, name) values (%s, %s, %s)"
    data = (now, user_id, job_name)
    g.cursor.execute(sql, data)  # people say that this can prevent sql injection
    return g.cursor.lastrowid


def query_jobs_by_user_id(user_id):
    """
    query all the jobs for a specific user
    :param user_id: the id of the user
    :return: list of jobs
    """
    sql = "select id, time, name from job where user_id = %s order by time desc"
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
    sql = "select id, job_id, filename, version, source, line, exec, miss, cov_result" \
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
    sql = "select id, user_id, time, name from job order by time desc"
    g.cursor.execute(sql)
    rows = g.cursor.fetchall()
    return rows

def save_reports(user_id, job_name, reports):
    """
    when user click 'save report' button
    :param user_id: id of the user
    :param job_name: name of the job
    :param reports: list of reports data
    :return: id of this job
    """
    # first get the id of this test job
    job_id = save_user_job(user_id, job_name)
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
    g.conn.commit()
    return job_id
