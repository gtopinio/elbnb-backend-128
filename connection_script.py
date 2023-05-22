import subprocess
import re

def tail_heroku_logs():
    process = subprocess.Popen(['heroku', 'logs', '--tail'], stdout=subprocess.PIPE, universal_newlines=True)
    for line in process.stdout:
        if re.search(r'ER_USER_LIMIT_REACHED', line):
            print("Eyy max connections bro")

if __name__ == "__main__":
    tail_heroku_logs()