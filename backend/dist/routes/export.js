"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const export_service_1 = require("../services/export.service");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_2 = require("../db/database");
const router = (0, express_1.Router)();
// GET /api/export/:suiteId – download as zip
router.get('/:suiteId', (req, res) => {
    const suite = (0, database_1.getSuiteById)(req.params.suiteId);
    if (!suite)
        return res.status(404).json({ error: 'Suite not found' });
    const safeName = suite.name.replace(/[^a-zA-Z0-9_-]/g, '-');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-playwright-tests.zip"`);
    const archive = (0, export_service_1.createExportArchive)(suite);
    archive.pipe(res);
    archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent)
            res.status(500).json({ error: 'Archive failed' });
    });
    return;
});
// GET /api/export/:suiteId/report/:runId – serve HTML report
router.get('/:suiteId/report/:runId', (req, res) => {
    const reportPath = path_1.default.join(database_2.ARTIFACTS_DIR, 'reports', req.params.runId, 'index.html');
    if (!fs_1.default.existsSync(reportPath)) {
        return res.status(404).json({ error: 'Report not found' });
    }
    return res.sendFile(reportPath);
});
// GET /api/export/screenshot/:filename
router.get('/screenshot/:filename', (req, res) => {
    const imgPath = path_1.default.join(database_2.ARTIFACTS_DIR, 'screenshots', req.params.filename);
    if (!fs_1.default.existsSync(imgPath))
        return res.status(404).send();
    return res.sendFile(imgPath);
});
exports.default = router;
//# sourceMappingURL=export.js.map