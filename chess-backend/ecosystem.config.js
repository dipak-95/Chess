module.exports = {
    apps: [{
        name: "chess-backend",
        script: "./server.js",
        env: {
            NODE_ENV: "production",
            PORT: 8325
            // Add MONGODB_URI and JWT_SECRET here
        }
    }]
};
