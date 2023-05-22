import requests
import time

def check_connection_limit():
    # Get Heroku logs using the API
    response = requests.get("https://api.heroku.com/apps/mockup-backend-128/logs", 
                            headers={"Accept": "application/vnd.heroku+json; version=3"})

    if response.status_code == 200:
        logs = response.json()
        error_message = "Error: ER_USER_LIMIT_REACHED: User 'bb119cab8b99eb' has exceeded the 'max_user_connections'"

        if any(log['message'] == error_message for log in logs):
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
    else:
        print("Failed to retrieve Heroku logs.")

check_connection_limit()
