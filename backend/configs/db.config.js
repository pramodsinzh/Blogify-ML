import mongoose from "mongoose";
import dns from "node:dns";

// Windows/local DNS often refuses SRV lookups that Atlas mongodb+srv:// needs.
// Use public resolvers before Mongoose connects.
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const buildMongoUri = () => {
    const dbName = process.env.MONGODB_DB_NAME || process.env.APP_NAME || "blogify-ml";
    const uri = (process.env.MONGODB_URI || "mongodb://127.0.0.1:27017").trim();

    // URI already includes a database path (e.g. ...mongodb.net/blogify-ml)
    if (uri.match(/\.mongodb\.net\/[^/?]+/i) || uri.match(/:\d+\/[^/?]+/)) {
        return uri;
    }

    return `${uri.replace(/\/$/, "")}/${dbName}`;
};

const connectDB = async () => {
    const mongoUri = buildMongoUri();

    mongoose.connection.on("connected", () => console.log("Connected to MongoDB"));
    mongoose.connection.on("error", (err) => console.error("MongoDB connection error:", err.message));

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        if (error.message?.includes("querySrv")) {
            console.error(
                "Tip: SRV DNS failed. Try MONGODB_URI=mongodb://127.0.0.1:27017 for local MongoDB, " +
                "or use Atlas Network Access + a standard (non-srv) connection string."
            );
        }
    }
};

export default connectDB;
