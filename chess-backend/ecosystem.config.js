module.exports = {
    apps: [{
        name: "chess-backend",
        script: "./server.js",
        env: {
            NODE_ENV: "production",
            PORT: 5000
            // Add MONGODB_URI and JWT_SECRET here
        }
    }]
};
