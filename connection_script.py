import subprocess

def run_heroku_command(command):
    subprocess.run(command, shell=True, check=True)

# Example: Run a Heroku command to restart the app
run_heroku_command('heroku logs --tail')