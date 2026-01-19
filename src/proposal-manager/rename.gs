// === 設定エリア（ここを変更すれば他のシートにも使える） ===
const TARGET_SHEET_NAME = "企画書";
const DATE_CELL_REF = "B13";
const FILENAME_PREFIX = "_企画書"; // ファイル名の後半に追加する文字列
const EXCLUDED_KEYWORD = "雛形";   // この文字列がファイル名に入っていたらスキップ

// === ファイル名更新処理 ===
function updateFilenameFromCell() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentName = ss.getName();

  if (currentName.includes(EXCLUDED_KEYWORD)) {
    Logger.log(`「${EXCLUDED_KEYWORD}」が含まれているためファイル名は変更されません。`);
    return;
  }

  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    Logger.log(`シート「${TARGET_SHEET_NAME}」が見つかりません`);
    return;
  }

  const dateValue = sheet.getRange(DATE_CELL_REF).getValue();
  if (dateValue instanceof Date) {
    const formattedDate = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "yyyyMMdd");
    const newName = `${formattedDate}${FILENAME_PREFIX}`;
    if (currentName !== newName) {
      ss.rename(newName);
    }
  } else {
    Logger.log(`${DATE_CELL_REF} に有効な日付がありません`);
  }
}

// === トリガー ===
function onOpen() {
  updateFilenameFromCell();
}

function onEdit(e) {
  const range = e.range;
  const sheet = e.source.getActiveSheet();
  const editedCell = range.getA1Notation();

  if (sheet.getName() === TARGET_SHEET_NAME && editedCell === DATE_CELL_REF) {
    updateFilenameFromCell();
  }
}
