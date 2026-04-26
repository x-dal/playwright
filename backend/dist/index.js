"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./db/database");
const suites_1 = __importDefault(require("./routes/suites"));
const runs_1 = __importDefault(require("./routes/runs"));
const recorder_1 = __importDefault(require("./routes/recorder"));
const export_1 = __importDefault(require("./routes/export"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
// ─── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Static artifacts ──────────────────────────────────────────────────────────
app.use('/artifacts', express_1.default.static(path_1.default.join(__dirname, '../data/artifacts')));
// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/suites', suites_1.default);
app.use('/api/runs', runs_1.default);
app.use('/api/recorder', recorder_1.default);
app.use('/api/export', export_1.default);
// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[Error]', err.message);
    res.status(500).json({ error: err.message });
});
// ─── Start ─────────────────────────────────────────────────────────────────────
(0, database_1.ensureDirectories)();
app.listen(PORT, () => {
    console.log(`\n🚀 API server running at http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map