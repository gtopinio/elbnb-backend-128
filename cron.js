var cron = require('node-cron');

// Print something every 20 seconds
cron.schedule('*/20 * * * * *', () => {
    console.log('running a task every 20 seconds');
});