let io;

module.exports = {
    init: (host) => {
        io = require("socket.io")(host, {
            cors: {
                origin: "https://myichat.onrender.com",
                // origin: "http://localhost:3000",
                methods: ["GET", "POST"],
            },
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket not initialized");
        }
        return io;
    },
};
