const { Op, fn, col } = require("sequelize");
const Job = require("../models/jobs");
const Application = require("../models/applications");
const JobAbuseReport = require("../models/jobAbuseReports");
const UserAbuseReport = require("../models/UserAbuseReport");
const User = require("../models/user");
const Service_url = process.env.SERVICE_URL || '';

const getJobs = async (req, res) => {
  try {
    let { page, search } = req.query;
    let whereClause = {};

    if (search) {
      const matchedUsers = await User.findAll({
        attributes: ["id"],
        where: { name: { [Op.like]: `%${search}%` } },
        raw: true,
      });
      const matchedUserIds = matchedUsers.map(u => u.id);

      whereClause = {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { user_id: matchedUserIds.length > 0 ? { [Op.in]: matchedUserIds } : null },
        ].filter(Boolean),
      };
    }

    if (page === "all") {
      const jobs = await Job.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
      });

      if (!jobs || jobs.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: "all", pages: 1 },
        });
      }

      const jobIds = jobs.map(job => job.id);
      const userIds = jobs.map(job => job.user_id);

      const applicationCounts = await Application.findAll({
        attributes: ["job_id", [fn("COUNT", col("id")), "application_count"]],
        where: { job_id: jobIds },
        group: ["job_id"],
        raw: true,
      });
      const appCountMap = applicationCounts.reduce((acc, curr) => {
        acc[curr.job_id] = parseInt(curr.application_count);
        return acc;
      }, {});

      const abuseReports = await JobAbuseReport.findAll({
        where: { job_id: jobIds },
        order: [["created_at", "DESC"]],
        raw: true,
      });
      const abuseCountMap = abuseReports.reduce((acc, curr) => {
        acc[curr.job_id] = (acc[curr.job_id] || 0) + 1;
        return acc;
      }, {});
      const abuseUserIds = [...new Set(abuseReports.map(r => r.report_by))];
      const abuseUsers = await User.findAll({
        attributes: ["id", "name", "profile_pictures"],
        where: { id: abuseUserIds },
        raw: true,
      });
      const abuseUserMap = abuseUsers.reduce((acc, user) => {
        acc[user.id] = {
          name: user.name,
          profile_pictures: Service_url + user.profile_pictures,
        };
        return acc;
      }, {});
      const abuseListMap = abuseReports.reduce((acc, curr) => {
        if (!acc[curr.job_id]) acc[curr.job_id] = [];
        acc[curr.job_id].push({
          id: curr.id,
          job_id: curr.job_id,
          report_reason: curr.report_reason,
          created_at: curr.created_at,
          updated_at: curr.updated_at,
          name: abuseUserMap[curr.report_by]?.name || null,
          profile_pictures: abuseUserMap[curr.report_by]?.profile_pictures || null,
        });
        return acc;
      }, {});

      const users = await User.findAll({
        attributes: ["id", "name"],
        where: { id: userIds },
        raw: true,
      });
      const userMap = users.reduce((acc, curr) => {
        acc[curr.id] = curr.name;
        return acc;
      }, {});

      const formattedJobs = jobs.map(job => {
        const jobJson = job.toJSON();
        if (jobJson.created_at) {
          jobJson.created_at = new Date(jobJson.created_at).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        }
        jobJson.application_count = appCountMap[job.id] || 0;
        jobJson.abuse_count = abuseCountMap[job.id] || 0;
        jobJson.abuse_reports = abuseListMap[job.id] || [];
        jobJson.user_name = userMap[job.user_id] || null;
        return jobJson;
      });

      return res.json({
        success: true,
        data: formattedJobs,
        pagination: {
          total: jobs.length,
          page: "all",
          pages: 1,
        },
      });
    }

    let jobs, total;
    const limit = 12;
    page = parseInt(page) || 1;

    if (search) {
      jobs = await Job.findAll({
        where: whereClause,
        order: [["id", "DESC"]],
      });
      total = jobs.length;
    } else {
      const offset = (page - 1) * limit;
      const result = await Job.findAndCountAll({
        where: whereClause,
        order: [["id", "DESC"]],
        limit,
        offset,
      });
      jobs = result.rows;
      total = result.count;
    }

    if (!jobs || jobs.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page, pages: 0 },
      });
    }

    const jobIds = jobs.map(job => job.id);
    const userIds = jobs.map(job => job.user_id);

    const applicationCounts = await Application.findAll({
      attributes: ["job_id", [fn("COUNT", col("id")), "application_count"]],
      where: { job_id: jobIds },
      group: ["job_id"],
      raw: true,
    });
    const appCountMap = applicationCounts.reduce((acc, curr) => {
      acc[curr.job_id] = parseInt(curr.application_count);
      return acc;
    }, {});

    const abuseReports = await JobAbuseReport.findAll({
      where: { job_id: jobIds },
      order: [["created_at", "DESC"]],
      raw: true,
    });
    const abuseCountMap = abuseReports.reduce((acc, curr) => {
      acc[curr.job_id] = (acc[curr.job_id] || 0) + 1;
      return acc;
    }, {});
    const abuseUserIds = [...new Set(abuseReports.map(r => r.report_by))];
    const abuseUsers = await User.findAll({
      attributes: ["id", "name", "profile_pictures"],
      where: { id: abuseUserIds },
      raw: true,
    });
    const abuseUserMap = abuseUsers.reduce((acc, user) => {
      acc[user.id] = {
        name: user.name,
        profile_pictures: Service_url + user.profile_pictures,
      };
      return acc;
    }, {});
    const abuseListMap = abuseReports.reduce((acc, curr) => {
      if (!acc[curr.job_id]) acc[curr.job_id] = [];
      acc[curr.job_id].push({
        id: curr.id,
        job_id: curr.job_id,
        report_reason: curr.report_reason,
        created_at: curr.created_at,
        updated_at: curr.updated_at,
        name: abuseUserMap[curr.report_by]?.name || null,
        profile_pictures: abuseUserMap[curr.report_by]?.profile_pictures || null,
      });
      return acc;
    }, {});

    const users = await User.findAll({
      attributes: ["id", "name"],
      where: { id: userIds },
      raw: true,
    });
    const userMap = users.reduce((acc, curr) => {
      acc[curr.id] = curr.name;
      return acc;
    }, {});

    const formattedJobs = jobs.map(job => {
      const jobJson = job.toJSON();
      if (jobJson.created_at) {
        jobJson.created_at = new Date(jobJson.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      jobJson.application_count = appCountMap[job.id] || 0;
      jobJson.abuse_count = abuseCountMap[job.id] || 0;
      jobJson.abuse_reports = abuseListMap[job.id] || [];
      jobJson.user_name = userMap[job.user_id] || null;
      return jobJson;
    });

    res.json({
      success: true,
      data: formattedJobs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching jobs:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getTradesperson = async (req, res) => {
  try {
    let { page, search } = req.query;
    const limit = 11;
    let offset;
    let fetchAll = false;

    if (page === "all") {
      fetchAll = true;
    } else {
      page = parseInt(page) || 1;
      offset = (page - 1) * limit;
    }

    const whereCondition = { user_type: "tradesperson" };

    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const queryOptions = {
      attributes: [
        "id", "name", "email", "phone", "profile_pictures",
        "cscs_file", "is_cscsfile_verified", "location", "lat", "long",
        "is_active", "created_at", "updated_at"
      ],
      where: whereCondition,
      order: [["id", "DESC"]],
      raw: true,
    };

    if (!fetchAll) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const { rows: tradespersons, count: total } = await User.findAndCountAll(queryOptions);

    if (!tradespersons || tradespersons.length === 0) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: page || 1, pages: 0 } });
    }

    const tradespersonIds = tradespersons.map(tp => tp.id);

    const abuseReports = await UserAbuseReport.findAll({
      where: { user_id: tradespersonIds },
      order: [["created_at", "DESC"]],
      raw: true,
    });

    const reporterIds = [...new Set(abuseReports.map(r => r.report_by))];

    const reporters = await User.findAll({
      attributes: ["id", "name", "profile_pictures"],
      where: { id: reporterIds },
      raw: true,
    });

    const reporterMap = reporters.reduce((acc, r) => {
      acc[r.id] = {
        name: r.name,
        profile_pictures: r.profile_pictures ? Service_url + r.profile_pictures : null
      };
      return acc;
    }, {});

    const abuseMap = abuseReports.reduce((acc, curr) => {
      if (!acc[curr.user_id]) acc[curr.user_id] = [];
      acc[curr.user_id].push({
        id: curr.id,
        report_reason: curr.report_reason,
        created_at: curr.created_at,
        updated_at: curr.updated_at,
        reporter_name: reporterMap[curr.report_by]?.name || null,
        reporter_profile_pictures: reporterMap[curr.report_by]?.profile_pictures || null,
      });
      return acc;
    }, {});

    const formattedTradespersons = tradespersons.map(tp => {
      let cscsStatus = "Pending";
      if (tp.is_cscsfile_verified === 1) cscsStatus = "Verified";
      else if (tp.is_cscsfile_verified === 0) cscsStatus = "Rejected";

      return {
        ...tp,
        profile_pictures: tp.profile_pictures ? Service_url + tp.profile_pictures : null,
        cscs_file: tp.cscs_file ? Service_url + tp.cscs_file : null,
        is_cscsfile_verified: cscsStatus,
        role: "Tradesperson",
        abuse_count: abuseMap[tp.id]?.length || 0,
        abuse_reports: abuseMap[tp.id] || []
      };
    });

    res.json({
      success: true,
      data: formattedTradespersons,
      pagination: fetchAll
        ? { total, page: "all", pages: 1 }
        : { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error("Error fetching tradespersons:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getSubcontractors = async (req, res) => {
  try {
    let { page, search } = req.query;
    const limit = 12;
    let offset;
    let fetchAll = false;

    if (page === "all") {
      fetchAll = true;
    } else {
      page = parseInt(page) || 1;
      offset = (page - 1) * limit;
    }

    const whereCondition = { user_type: "subcontractor" };
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
      ];
    }

    const queryOptions = {
      attributes: [
        "id", "name", "email", "phone", "profile_pictures",
        "location", "lat", "long", "is_active", "created_at", "updated_at"
      ],
      where: whereCondition,
      order: [["id", "DESC"]],
      raw: true,
    };

    if (!fetchAll) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const { rows: subcontractors, count: total } = await User.findAndCountAll(queryOptions);

    if (!subcontractors || subcontractors.length === 0) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: page || 1, pages: 0 } });
    }

    const subcontractorIds = subcontractors.map(sc => sc.id);

    const abuseReports = await UserAbuseReport.findAll({
      where: { user_id: subcontractorIds },
      order: [["created_at", "DESC"]],
      raw: true,
    });

    const reporterIds = [...new Set(abuseReports.map(r => r.report_by))];

    const reporters = await User.findAll({
      attributes: ["id", "name", "profile_pictures"],
      where: { id: reporterIds },
      raw: true,
    });

    const reporterMap = reporters.reduce((acc, r) => {
      acc[r.id] = {
        name: r.name,
        profile_pictures: r.profile_pictures ? Service_url + r.profile_pictures : null
      };
      return acc;
    }, {});

    const abuseMap = abuseReports.reduce((acc, curr) => {
      if (!acc[curr.user_id]) acc[curr.user_id] = [];
      acc[curr.user_id].push({
        id: curr.id,
        report_reason: curr.report_reason,
        created_at: curr.created_at,
        updated_at: curr.updated_at,
        reporter_name: reporterMap[curr.report_by]?.name || null,
        reporter_profile_pictures: reporterMap[curr.report_by]?.profile_pictures || null,
      });
      return acc;
    }, {});

    const formattedSubcontractors = subcontractors.map(sc => ({
      ...sc,
      profile_pictures: sc.profile_pictures ? Service_url + sc.profile_pictures : null,
      role: "Subcontractor",
      abuse_count: abuseMap[sc.id]?.length || 0,
      abuse_reports: abuseMap[sc.id] || []
    }));

    res.json({
      success: true,
      data: formattedSubcontractors,
      pagination: fetchAll
        ? { total, page: "all", pages: 1 }
        : { total, page, pages: Math.ceil(total / limit) }
    });

  } catch (err) {
    console.error("Error fetching subcontractors:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getJobs, getTradesperson, getSubcontractors };

