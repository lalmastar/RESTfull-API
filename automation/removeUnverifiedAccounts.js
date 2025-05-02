const cron = require('node-cron');
const User = require('../models/userModel.js');
const removeUnverifiedAccounts = () => {
    cron.schedule("*/30 * * * *", async () => { // Every 30 minutes
        console.log("Running cron job to remove unverified accounts...");
        // const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const unverifiedAccounts = await User.deleteMany({
            accountVerified: false, 
            // createdAt: { $lt: thirtyMinutesAgo },
        });
        console.log("Unverified accounts found:", unverifiedAccounts);
        if (unverifiedAccounts.deletedCount > 0) {
            console.log("Unverified accounts removed successfully.");
        } else {
            console.log("No unverified accounts found.");
        }
    }   );
}

module.exports = removeUnverifiedAccounts;