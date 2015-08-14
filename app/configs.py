import ConfigParser

config = ConfigParser.RawConfigParser(allow_no_value=True)
config.read('app.config')
db_user = config.get('mysql', 'username')
db_pass = config.get('mysql', 'passwd')
db_name = config.get('mysql', 'dbname')
db_host = config.get('mysql', 'host')
db_port = config.get('mysql', 'port')
db_charset = config.get('mysql', 'charset')




