const fs = require("fs");
const path = require("path");

const TEMPLATES_DIR = path.join(__dirname, "../../templates");
const MASTERS_DIR = path.join(__dirname, "../../data/masters");

/** テンプレート一覧を取得 */
function listTemplates() {
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const tmpl = JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, f), "utf-8"));
    return { id: tmpl.id, name: tmpl.name, shortName: tmpl.shortName, icon: tmpl.icon, color: tmpl.color };
  });
}

/** 指定IDのテンプレートを取得 */
function getTemplate(diseaseId) {
  const filePath = path.join(TEMPLATES_DIR, `${diseaseId}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/** テンプレートに対応する薬剤マスタを取得 */
function getMedicationMaster(diseaseId) {
  const tmpl = getTemplate(diseaseId);
  if (!tmpl || !tmpl.medicationMaster) return null;
  const masterPath = path.join(MASTERS_DIR, tmpl.medicationMaster);
  if (!fs.existsSync(masterPath)) return null;
  return JSON.parse(fs.readFileSync(masterPath, "utf-8"));
}

module.exports = { listTemplates, getTemplate, getMedicationMaster };
