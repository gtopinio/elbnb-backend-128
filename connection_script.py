import subprocess
import time

def check_connection_limit():
    process = subprocess.Popen(["heroku", "logs", "--tail"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, _ = process.communicate()

    if "Error: ER_USER_LIMIT_REACHED: User 'bb119cab8b99eb' has exceeded the 'max_user_connections'" in stdout.decode():
        print("Exceeded max_user_connections. Scaling down web dynos...")

        # Scale down web dynos to 0
        subprocess.run(["heroku", "ps:scale", "web=0"])

        # Wait for 60 seconds
        time.sleep(60)

        print("Scaling up web dynos...")
        # Scale up web dynos to 1
        subprocess.run(["heroku", "ps:scale", "web=1"])
    else:
        print("No max_user_connections error detected.")

check_connection_limit()
