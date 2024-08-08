const { client } = require("../connections/db");
const { cloudinary } = require("../connections/cloud");
const checkCookie = require("../middlewares/checkCookies");
const multer = require("multer");
const router = require("express").Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/dashboard", checkCookie("token"), async (req, res) => {
  if (!req.user) return res.status(403).redirect("/login");
  let jobs;

  try {
    const applications = await client.query(
      "SELECT * FROM applications WHERE employerid = $1 or applicantid = $2",
      [req.user.userid, req.user.userid]
    );
    if (req.user.role == "employeer") {
      jobs = await client.query("SELECT * FROM jobs WHERE employerid = $1 ", [
        req.user.userid,
      ]);
      if (jobs.rows.length == 0) {
        return res.render("dashboard", {
          message: "No jobs found emp",
          user: req.user,
          applications: applications.rows,
        });
      }
    } else if (req.user.role == "jobseeker") {
      jobs = await client.query("SELECT * FROM jobs");

      if (jobs.rowCount == 0) {
        return res.render("dashboard", {
          message: "No jobs found jobseeker",
          user: req.user,
          applications: applications.rows,
        });
      }
    }

    return res.render("dashboard", {
      user: req.user,
      jobs: jobs,
      applications: applications.rows,
    });
  } catch (error) {
    console.log("error: ", error.message);
    return res.status(403).render("dashboard", {
      user: req.user,
      message: "Internal Server Error",
      applications: applications.rows,
    });
  }
});

router.get("/jobs", checkCookie("token"), async (req, res) => {
  if (!req.user) return res.status(403).render("login");
  if (req.user.role !== "employeer")
    return res.status(403).redirect("/v1/dashboard");
  return res.render("postjobs", { user: req.user });
});

router.post("/jobs", checkCookie("token"), async (req, res) => {
  if (!req.user) return res.status(403).redirect("/login");
  if (req.user.role !== "employeer")
    return res.status(403).redirect("/v1/dashboard", { user: req.user });

  const { company, title, description, location, salary } = req.body;
  console.log(company, title, description, location, salary);

  if (!company || !title || !description || !location || !salary) {
    return res
      .status(400)
      .render("postjobs", { error: "All fields are required", user: req.user });
  }
  const alreadyExists = await client.query(
    `SELECT * from jobs WHERE company = $1 AND title = $2 and description = $3 and location = $4 and salary = $5`,
    [company, title, description, location, salary]
  );

  if (alreadyExists.rowCount !== 0)
    return res
      .status(400)
      .render("postjobs", { user: req.user, error: "Job already exists" });
  const posted = await client.query(
    `INSERT INTO jobs (company, title, description, location, salary,employerid) VALUES ($1, $2, $3, $4, $5,$6) RETURNING *`,
    [company, title, description, location, salary, req.user.userid]
  );
  if (posted.rowCount == 0)
    return res
      .status(500)
      .render("postjobs", { error: "Something went wrong", user: req.user });
  return res.status(200).render("postjobs", {
    message: "Job posted successfully",
    user: req.user,
  });
});

router.get("/deletejob/:jobid", checkCookie("token"), async (req, res) => {
  if (!req.user) return res.status(403).redirect("/login");
  if (req.user.role !== "employeer")
    return res.status(403).redirect("/v1/dashboard");
  const { jobid } = req.params;
  try {
    await client.query(`DELETE from jobs WHERE jobid = $1`, [jobid]);
    return res.status(200).redirect("/v1/dashboard");
  } catch (error) {
    return res.status(500).redirect("/v1/dashboard");
  }
});

router.post(
  "/application/statusupdate",
  checkCookie("token"),
  async (req, res) => {
    if (!req.user) return res.status(403).redirect("/login");
    if (req.user.role !== "employeer")
      return res.status(403).render("applications", { user: req.user });
    const { applicationid, status } = req.body;

    try {
      const updated = await client.query(
        `UPDATE applications SET status = $1 WHERE applicationid = $2`,
        [status, applicationid]
      );
      if (updated.rowCount == 0)
        return res.status(404).redirect("/v1/jobs/application");

      return res.status(200).redirect("/v1/jobs/application");
    } catch (error) {
      return res.status(500).redirect("/v1/jobs/application");
    }
  }
);

router.post(
  "/jobs/:jobid/apply",
  checkCookie("token"),
  upload.single("file"),
  async (req, res) => {
    if (!req.user) return res.status(403).redirect("/login");
    if (req.user.role !== "jobseeker")
      return res.status(403).redirect("/v1/dashboard");
    try {
      const file = req.file;

      if (!file) {
        return res
          .status(400)
          .render("dashboard", { user: req.user, message: "No file uploaded" });
      }
      const applied = await client.query(
        `SELECT * FROM applications WHERE jobid = $1 AND applicantid = $2`,
        [req.params.jobid, req.user.userid]
      );
      if (applied.rowCount !== 0)
        return res.status(400).redirect("/v1/dashboard");
      const { jobid } = req.params;
      const { employerid } = req.body;

      // Upload to Cloudinary
      cloudinary.uploader
        .upload_stream({ resource_type: "raw" }, async (message, result) => {
          if (message) {
            return res.status(500).json({ message: error.message });
          }
          const url = result.secure_url;
          await client.query(
            `INSERT INTO applications (jobid, applicantid,resumeurl,employerid) VALUES ($1, $2,$3,$4) RETURNING *`,
            [jobid, req.user.userid, url, employerid]
          );
        })
        .end(file.buffer);
      const jobs = await client.query(`SELECT * FROM jobs`);
      return res.status(200).render("dashboard", {
        message: "Applied successfully",
        jobs: jobs,
        user: req.user,
      });
    } catch (error) {
      return res.status(500).render("dashboard", {
        user: req.user,
        error: "Internal server Error Please try again",
      });
    }
  }
);

router.get("/jobs/application", checkCookie("token"), async (req, res) => {
  if (!req.user) return res.status(403).redirect("/login");

  try {
    const applications = await client.query(
      `SELECT app.status as status, app.applicationid as applicationid, app.jobid as jobid, app.applicantid as applicantid, app.resumeurl as resumeurl, users.username as username, users.email as email , job.title as title, job.description as description FROM applications as app left join users on app.applicantid = users.userid left join jobs as job on app.jobid = job.jobid WHERE app.employerid = $1 OR app.applicantid = $2`,
      [req.user.userid, req.user.userid]
    );
    if (applications.rowCount == 0)
      return res.status(404).render("applications", {
        user: req.user,
        message: "There are no applications ",
      });
    return res
      .status(200)
      .render("applications", { user: req.user, applications: applications });
  } catch (error) {
    return res.status(500).render("applications", {
      message: `Internal server Error Please try again ${error.message}`,
    });
  }
});

router.get(
  "/application/deleteapplication/:applicationid",
  checkCookie("token"),
  async (req, res) => {
    if (!req.user) return res.status(403).redirect("/login");
    if (req.user.role !== "employeer")
      return res.status(403).redirect("/v1/jobs/application");
    const { applicationid } = req.params;
    try {
      const applications = await client.query(
        `DELETE FROM applications WHERE applicationid = $1`,
        [applicationid]
      );
      return res.status(200).redirect("/v1/jobs/application");
    } catch (error) {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

module.exports = router;
