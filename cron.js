var cron = require('node-cron');
import fetch from "node-fetch";

const HEROKU_APP_ID = process.env.HEROKU_APP_ID;
const HEROKU_API_TOKEN = process.env.HEROKU_API_TOKEN;
// Restart dynos every 20 seconds
cron.schedule('*/20 * * * * *', async () => {
    console.log("Restarting dynos every 20 seconds...");
    const response = await fetch(`https://api.heroku.com/apps/${HEROKU_APP_ID}/dynos`, {
    method: 'DELETE',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.heroku+json; version=3',
        'Authorization': `Bearer ${HEROKU_API_TOKEN}`
        }
    });
    console.log(response);
});