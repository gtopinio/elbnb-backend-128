import subprocess

process = subprocess.Popen(['heroku', 'logs', '--tail'], stdout=subprocess.PIPE)

for line in iter(process.stdout.readline, ''):
    print(line.decode('utf-8').strip())